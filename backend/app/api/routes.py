# <- ¿De qué se encarga este archivo? -> 
#
# Aquí definiremos las URLs de nuestra API (Ej: @app.post("/rooms/{room_id}/kick"))
# Estas funciones reciben la petición HTTP, llaman a los services para ejecutar la accion y devuelven el resultado al Front.

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db # Obteenemos la base de datos
from pydantic import BaseModel # Para definir models de cara a los cuestionarios
from typing import List

from app.models.sala_asignaturas import SalaAsignatura, TipoSala
from app.models.mensajes_programados import MensajeProgramado, EstadoMensaje
from app.models.cronogramas import Cronograma
from app.models.logs import LogSistema

# Para que los cambios temporales se ejecuten al momento
from datetime import datetime
from zoneinfo import ZoneInfo

# Importamos los dos servicios
from app.services.matrix_api import(

    obtener_info_sala, 
    obtener_perfil_usuario,
    registrar_usuarios_matrix,
    crear_espacio_asignatura,
    insertar_alumnos_sala,
    arreglar_jerarquia,
    crear_nodo,
    editar_nodo,
    eliminar_nodo,
    accionar_celda_horario
)

from app.services.prado_api import(

    obtener_alumnos_prado_service, 
    obtener_total_usuarios_usuario, 
    obtener_total_asignaturas_usuario, 
    obtener_asignaturas_usuario
)

# Importamos el usuario activo de nuestro Mock de Prado
# TODO: esto habrá que actualizarlo con las variables de sesión de prado
from app.mocks.prado_db import PROFESOR

# ==========================================
# MODELOS DE DATOS 
# ==========================================
class CrearNodoRequest(BaseModel):
    nombre: str
    descripcion: str
    tipo: str
    id_padre: str
    auto_añadir: bool = False

class EditarNodoRequest(BaseModel):
    nombre: str
    descripcion: str
    tipo: str

class ActualizarCronogramaRequest(BaseModel):
    matriz: List[List[int]] # Esperamos una matriz de 7*24

class CrearMensajeProgRequest(BaseModel):
    sala_id: int
    contenido: str
    fecha_envio: datetime

class EditarMensajeProgRequest(BaseModel):
    contenido: str
    fecha_envio: datetime


def registrar_log(db: Session, mensaje: str):
    """
    Función auxiliar para insertar un lod automáticamente en la bd, la fecha y hora se genetan automáticamente.
    """
    nuevo_log = LogSistema(contenido=mensaje)

    db.add(nuevo_log)
    db.commit()

router = APIRouter() # Lo que hace es crear un grupo de rutas. En el main tendremos que incluirlo "app.include_router(router)"

# ==========================================
# RUTAS DE MATRIX
# ==========================================

@router.get("/matrix/salas/{room_id}")
async def endpoint_info_sala(room_id: str, db: Session = Depends(get_db)):
    return await obtener_info_sala(db, room_id)

@router.get("/matrix/usuarios/{user_id}/perfil")
async def get_perfil(user_id: str):
    # TODO: cambiar el id hardcodeado por el id del usuario de la sesión de Prado
    if user_id == "me":
        user_id = PROFESOR["matrix_id"]

    return await obtener_perfil_usuario(user_id)

# ==========================================
# RUTAS DE PRADO (SIMULADOR)
# TODO: Conectar con Moodle real en el futuro
# ==========================================

@router.get("/prado/asignaturas/{asignatura_id}/alumnos")
async def get_alumnos(asignatura_id: str):
    return await obtener_alumnos_prado_service(asignatura_id)

@router.get("/prado/usuarios/{user_id}/asignaturas")
async def get_asignaturas(user_id: str, db: Session = Depends(get_db)):

    # TODO: cambiar el id hardcodeado por el id del usuario de la sesión de Prado
    if user_id == "me":
        user_id = PROFESOR["matrix_id"]

    return await obtener_asignaturas_usuario(user_id,db)

@router.post("/prado/asignaturas/{asignatura_id}/sincronizar")
async def sincronizar_asignatura_matrix(asignatura_id:str, db: Session = Depends(get_db)):

    # 1º Obtenemos toda la información de la asignatura, id, nombre y sus usuarios matriculados
    info_asignatura = await obtener_alumnos_prado_service(asignatura_id)

    if info_asignatura.get("error") is True:
        raise HTTPException(status_code=404, detail=info_asignatura["mensaje"])
    
    nombre_asignatura = info_asignatura["nombre"]
    usuarios_asignatura = info_asignatura["usuarios_matriculados"]

    # Obtenemos el id del profesor (de la sesión activa) y su la lista de alumnos de la asignatura selecionada
    profesor_id = PROFESOR["matrix_id"]

    ids_alumnos = []

    for usuario in usuarios_asignatura:
        if usuario["matrix_id"] != profesor_id:
            ids_alumnos.append(usuario["matrix_id"])

    # 1. Tenemos que insertar a los usuarios en Matrix que todavía no lo hayan echo ellos manualmente
    res_registrar_usuarios = await registrar_usuarios_matrix(usuarios_asignatura)

    if len(res_registrar_usuarios["errores"]) > 0:
        print(f"Advertencias al registrar usuarios: {res_registrar_usuarios['errores']}")

    # 2. Creamos el espacio
    descripcion = f"Espacio principal de la asignatura {nombre_asignatura}"
    res_crear_espacio = await crear_espacio_asignatura(nombre_asignatura,descripcion, profesor_id)

    if "ERROR" in res_crear_espacio:
        raise HTTPException(status_code=500, detail=res_crear_espacio["ERROR"])
    
    room_id = res_crear_espacio["room_id"] # Obtenemos el id del espacio que se acaba de crear.

    # 3. Matriculamos e insertamos a todos los alumnos de la asignatura de Prado en la sala que acabamos de crar
    res_insertar_alumnos = await insertar_alumnos_sala(room_id, ids_alumnos)

    if len(res_insertar_alumnos["errores"]) > 0:
        print(f"Advertencias al matricular alumnos: {res_insertar_alumnos['errores']}")

    # 4 Registramos en nuestra bd local la información para almacenar la sincronización 
    try:
        # Por un lado la nueva sala
        nueva_sala_db = SalaAsignatura(
            id_asignatura_prado=asignatura_id,
            id_matrix_sala=room_id,
            alias_principal=nombre_asignatura,
            descripcion=descripcion,
            tipo="espacio"
        )

        db.add(nueva_sala_db)


        # Por otro los usuarios en nuestra tabla (si es que no existiesen ya)
        for usuario in usuarios_asignatura:

            matrix_usuario_id = usuario["matrix_id"]

            # Verificamos si el usuario ya estaba registrado
            existe_usuario = db.query(Usuario).filter(Usuario.matrix_id == matrix_usuario_id).first()

            # Si no existiese lo registramos
            if not existe_usuario:

                nuevo_usuario = Usuario(

                    correo=usuario["correo"],
                    nombre=usuario["nombre"],
                    matrix_id=matrix_usuario_id
                )

                db.add(nuevo_usuario)

        db.commit()
        db.refresh(nueva_sala_db) 

        registrar_log(db, f"Sincronización exitosa: Asignatura '{nombre_asignatura}' vinculada con Matrix.")
        
    except Exception as e:
        db.rollback() 
        raise HTTPException(status_code=500, detail=f"Error guardando en base de datos: {str(e)}")
    
    # Respondemos al frontend
    return {
        "status": "success",
        "mensaje": f"Sincronización completada. Espacio creado: {room_id}",
        "resumen": {
            "usuarios_registrados": len(res_registrar_usuarios["id_usuarios_registrados"]),
            "alumnos_matriculados": len(res_insertar_alumnos["id_alumnos_matriculados"]),
            "errores_pendientes": len(res_registrar_usuarios["errores"]) + len(res_insertar_alumnos["errores"])
        }
    }


@router.get("/prado/asignaturas/{asignatura_id}/salas")
async def get_salas_asignatura(asignatura_id : str, db: Session = Depends(get_db)):
    """
    Devuelve todas las salas y espacios de una asignatura a partir de su id
    """

    espacio_raiz = db.query(SalaAsignatura).filter(SalaAsignatura.id_asignatura_prado == asignatura_id,SalaAsignatura.id_padre == None).first()

    # Revisamos que no haya inconcruencias para sincronizar nuestra base de datos con la información del matrix
    if espacio_raiz: 
        await arreglar_jerarquia(espacio_raiz.id_matrix_sala, asignatura_id, db)

    salas_db = db.query(SalaAsignatura).filter(SalaAsignatura.id_asignatura_prado == asignatura_id).all()

    if not salas_db:
       return {
            "status": "La asignatura no tiene ninguna sala asociada.",
            "asignatura_id": asignatura_id,
            "salas": []
        }
    
    salas = []
    for sala in salas_db:
        salas.append({

            "id": sala.id,
            "room_id": sala.id_matrix_sala,
            "nombre": sala.alias_principal,
            "descripcion": sala.descripcion,
            "tipo": sala.tipo.value,
            "id_padre": sala.id_padre
        })

    return{

        "status": "success",
        "asignatura_id": asignatura_id,
        "salas": salas
    }

@router.post("/prado/asignaturas/{asignatura_id}/salas")
async def crear_sala(asignatura_id: str, datos: CrearNodoRequest, db: Session = Depends(get_db)):
    """
    Recibe los datos del cuestionario del front, crea el nodo especificado en Matrix, 
    lo vincula a su nodo padre y lo matricula a los alumnos si se solicita.
    """

    profesor_id = PROFESOR["matrix_id"]

    # 1. Llamamos a Matrix para crear y vincular la sala
    res_crear = await crear_nodo(
        nombre=datos.nombre,
        descripcion=datos.descripcion,
        tipo=datos.tipo,
        id_padre=datos.id_padre,
        id_profesor=profesor_id
    )

    if "ERROR" in res_crear:
        raise HTTPException(status_code=500, detail=res_crear["ERROR"])
    
    nuevo_room_id = res_crear["room_id"]
    alumnos_añadidos = 0

    # 2. Guardamos la sala en la bd 

    id_padre = datos.id_padre

    if not id_padre: # Identificamos el nodo raíz viendo que no tiene padre
        espacio_raiz = db.query(SalaAsignatura).filter(
            SalaAsignatura.id_asignatura_prado == asignatura_id,
            SalaAsignatura.id_padre == None
        ).first

        if espacio_raiz:
            id_padre = espacio_raiz.id_matrix_sala

    nueva_sala_bd = SalaAsignatura(
        id_asignatura_prado=asignatura_id,
        id_matrix_sala=nuevo_room_id,
        alias_principal=datos.nombre,
        descripcion=datos.descripcion,
        tipo=datos.tipo, 
        id_padre=id_padre
    )

    db.add(nueva_sala_bd)
    db.flush() # Para generar el id interno antes del commit

    # Si es una sala normal o de avisos, le preparamos su cronograma
    if datos.tipo in ["sala", "sala_avisos"]:
        db.add(Cronograma(sala_id=nueva_sala_bd.id))

    db.commit()
    
    # SI decidió matricularlos tenemos que insertarlos a mano
    if datos.auto_añadir:

        info_asignatura = await obtener_alumnos_prado_service(asignatura_id)

        if not info_asignatura.get("error"):

            # Obtenemos los nombres de usuarios e ids a insertar

            usuarios_asignatura = info_asignatura["usuarios_matriculados"]
            ids_alumnos = []

            for usuario in usuarios_asignatura:
                if usuario["matrix_id"] != profesor_id:
                    ids_alumnos.append(usuario["matrix_id"])

        # Matriculamos e insertamos a todos los alumnos de la asignatura de Prado en la sala que acabamos de crar
        res_insertar_alumnos = await insertar_alumnos_sala(nuevo_room_id, ids_alumnos)
        alumnos_añadidos = len(res_insertar_alumnos.get("id_alumnos_matriculados", []))
        
        if len(res_insertar_alumnos["errores"]) > 0:
            print(f"Advertencias al matricular alumnos: {res_insertar_alumnos['errores']}")

    # Sincronizamos los cambios con la bd

    espacio_raiz = db.query(SalaAsignatura).filter( # Buscamos el espacio raiz de la asignatura
        SalaAsignatura.id_asignatura_prado == asignatura_id,
        SalaAsignatura.id_padre == None
    ).first()

    # Una vez encontramos la raiz añadimos la sala creada
    if espacio_raiz:
        await arreglar_jerarquia(espacio_raiz.id_matrix_sala, asignatura_id, db)
    else:
        raise HTTPException(status_code=404, detail="ERROR: No se encontró el espacio raíz de la asignatura para añadir los cambios a la bd.")
        
    registrar_log(db, f"Estructura modificada: Creado nuevo nodo tipo '{datos.tipo}' con nombre '{datos.nombre}'.")

    return {
        "status": "success",
        "room_id": nuevo_room_id,
        "tipo": datos.tipo,
        "alumnos_auto_añadidos": alumnos_añadidos
    }

@router.put("/prado/asignaturas/{asignatura_id}/salas/{room_id}")
async def modificar_sala(asignatura_id: str, room_id: str, datos: EditarNodoRequest, db: Session = Depends(get_db)):

    # Obtenemos la sala de la bd
    sala_bd = db.query(SalaAsignatura).filter(SalaAsignatura.id_matrix_sala == room_id, SalaAsignatura.id_asignatura_prado == asignatura_id).first()

    if not sala_bd:
        raise HTTPException(status_code=404, detail="La sala a modificar no existe en la base de datos.")
    
    # Bloqueamos la petición si intentamos transformar un espacio en una sala o viceversa
    if sala_bd.tipo == TipoSala.espacio and datos.tipo != TipoSala.espacio.value:
        raise HTTPException(status_code=400, detail="No se puede transformar un espacio en una sala.")
    
    if sala_bd.tipo != TipoSala.espacio and datos.tipo == TipoSala.espacio.value:
        raise HTTPException(status_code=400, detail="No se puede transformar una sala en un espacio.")
    
    # Detectamos que ha cambiado antes de actualizar la bd
    nombre_anterior = sala_bd.alias_principal
    cambios = []

    if sala_bd.alias_principal != datos.nombre:
        cambios.append(f"Nombre ('{sala_bd.alias_principal}' -> '{datos.nombre}')")
    
    if sala_bd.descripcion != datos.descripcion:
        cambios.append("Descripción modificada")
        
    if sala_bd.tipo.value != datos.tipo:
        cambios.append(f"Tipo ('{sala_bd.tipo.value}' -> '{datos.tipo}')")

    # Si no hay cambios, no hacemos peticiones innecesarias
    if not cambios:
        return {"status": "success", "mensaje": "Sin cambios detectados."}
    
    # Ejecutamos los cambios en matrix
    profesor_id = PROFESOR["matrix_id"]
    res_matrix = await editar_nodo(room_id, datos.nombre, datos.descripcion, datos.tipo, profesor_id)

    if "ERROR" in res_matrix:
        raise HTTPException(status_code=500, detail=res_matrix["ERROR"])
    
    # Actualizamos la bd
    sala_bd.alias_principal = datos.nombre
    sala_bd.descripcion = datos.descripcion

    if datos.tipo == TipoSala.sala.value:
        sala_bd.tipo = TipoSala.sala
    elif datos.tipo == TipoSala.sala_avisos.value:
        sala_bd.tipo = TipoSala.sala_avisos

    db.commit()

    texto_cambios = ", ".join(cambios)
    registrar_log(db, f"Estructura modificada: Nodo '{nombre_anterior}' actualizado. Cambios: [{texto_cambios}].")


    return {"status": "success"}

@router.delete("/prado/asignaturas/{asignatura_id}/salas/{room_id}")
async def borrar_sala(asignatura_id: str, room_id: str, db: Session = Depends(get_db)):

    #Obtenemos la sala de la bd 
    sala_bd = db.query(SalaAsignatura).filter(SalaAsignatura.id_matrix_sala == room_id, SalaAsignatura.id_asignatura_prado == asignatura_id).first()

    if not sala_bd:
        raise HTTPException(status_code=404, detail="La sala a eliminar no existe en la base de datos.")
    
    # No podemos borrar un espacio con hijos
    hijos = db.query(SalaAsignatura).filter(SalaAsignatura.id_padre == room_id).count()
    if hijos > 0:
        raise HTTPException(status_code=403, detail="Para borrar este espacio primero debes borrar sus hijos")
    
    # Ejecutamos el borrado en matrix
    res_matrix = await eliminar_nodo(room_id)
    if "ERROR" in res_matrix:
        raise HTTPException(status_code=500, detail=res_matrix["ERROR"])
    
    # Lo borramos tambien de la bd
    db.delete(sala_bd)
    db.commit()

    registrar_log(db, f"Estructura modificada: Nodo '{sala_bd.alias_principal}' eliminado permanentemente.")

    return {"status": "success"}


    
# ==========================================
# RUTAS DE LA PESTAÑA DE INICIO PERSONALIZADAS
# ==========================================

@router.get("/inicio/estadisticas")
async def get_inicio_estadisticas(db: Session = Depends(get_db)):
    user_id = PROFESOR["matrix_id"]

    # 1. PRADO
    total_asignaturas_prado = await obtener_total_asignaturas_usuario(user_id)
    total_alumnos_prado = await obtener_total_usuarios_usuario(user_id)

    # 2. MATRIX 
    total_salas_matrix = db.query(SalaAsignatura).count()
    total_alumnos_matrix = db.query(Usuario).count()

    return {
        "prado": {
            "asignaturas": total_asignaturas_prado,
            "alumnos": total_alumnos_prado
        },
        "matrix": {
            "salas": total_salas_matrix,
            "alumnos": total_alumnos_matrix
        }
    }


# ==========================================
# RUTAS DE LA BASE DE DATOS DE CRONOGRAMA
# ==========================================

@router.get("/prado/asignaturas/{asignatura_id}/salas/{room_id}/cronograma")
async def get_cronograma(asignatura_id: str, room_id: str, db: Session = Depends(get_db)):
    """
    Devuelve la matriz 7x24 del cronograma de una sala específica.
    """

    # Verifiamos que la sala existe y pertenece a esa asignatura en la bd
    sala_db = db.query(SalaAsignatura).filter(
        SalaAsignatura.id_matrix_sala == room_id,
        SalaAsignatura.id_asignatura_prado == asignatura_id
    ).first()

    if not sala_db:
        raise HTTPException(status_code=404, detail="La sala no pertenece para esa asignatura.")
    
    #Obtenemos su cronograma
    crono_db = db.query(Cronograma).filter(Cronograma.sala_id == sala_db.id).first()

    if not crono_db:
        raise HTTPException(status_code=404, detail="Esta sala no tiene ningún cronograma asignado")
    
    return {
        "status": "success",
        "matriz": crono_db.configuracion
    }

@router.put("/prado/asignaturas/{asignatura_id}/salas/{room_id}/cronograma")
async def actualizar_cronograma(asignatura_id: str, room_id: str, datos: ActualizarCronogramaRequest, db: Session = Depends(get_db)):
    """
    Recibe una matriz 7x24 y con esta ser sobreescribe la actual del cronograma.
    """

    # Verifiamos que la sala existe y pertenece a esa asignatura en la bd
    sala_db = db.query(SalaAsignatura).filter(
        SalaAsignatura.id_matrix_sala == room_id,
        SalaAsignatura.id_asignatura_prado == asignatura_id
    ).first()

    if not sala_db:
        raise HTTPException(status_code=404, detail="La sala no pertenece para esa asignatura.")

    # Obtenemos el cronograma actual
    crono_db = db.query(Cronograma).filter(Cronograma.sala_id == sala_db.id).first()

    if not crono_db:
        raise HTTPException(status_code=404, detail="Esta sala no admite cronogramas.")
    
    # SObrescribimos la mattriz dada en la bd
    crono_db.configuracion = datos.matriz
    db.commit()

    # Aquí ejecutamos los cambios de forma instantánea

    try:
        ZONA_HORARIA = ZoneInfo("Europe/Madrid")
        ahora = datetime.now(ZONA_HORARIA)
        dia_actual = ahora.weekday()
        hora_actual = ahora.hour

        # Leemos el estado de el instante actual en la matriz
        estado_actual = datos.matriz[dia_actual][hora_actual]

        # Ejecutamos la petición sobre la sala
        await accionar_celda_horario(room_id, estado_actual == 1)

    
    except Exception as e:
        print(f"ERROR: Error al aplicar el cambio de forma instantánea: {str(e)}")    

    registrar_log(db, f"Cronograma modificado: Actualizado horarios de accesos para la sala '{sala_db.alias_principal}'.")

    return {"status": "success"}

# ==========================================
# RUTAS DE LA BASE DE DATOS DE MENSAJES PROGRAMADOS (AVISOSs)
# ==========================================

@router.get("/prado/mensajes")
async def get_mensajes_pendientes(db: Session = Depends(get_db)):    
    """
    Devuelve todos los mensajes programados en estado de pendientes ordenador del más inminente al más lejano.
    """

    # Consultamos todos los mensajes
    mensajes_db = db.query(MensajeProgramado).join(SalaAsignatura)\
        .filter(MensajeProgramado.estado == EstadoMensaje.pendiente)\
        .order_by(MensajeProgramado.fecha_envio.asc())\
        .all()
    
    mensajes = []
    for mensaje in mensajes_db:
        mensajes.append({
            "id": mensaje.id,
            "sala_id": mensaje.sala_id,
            "room_id": mensaje.sala.id_matrix_sala,
            "nombre_sala": mensaje.sala.alias_principal,
            "asignatura_id": mensaje.sala.id_asignatura_prado,
            "contenido": mensaje.contenido,
            "fecha_envio": mensaje.fecha_envio.isoformat(),
            "fecha_creacion": mensaje.fecha_creacion.isoformat(),
            "tipo_sala": mensaje.sala.tipo.value

        })

    return {
        "status": "success",
        "mensajes": mensajes
    }

@router.post("/prado/mensajes")
async def crear_mensaje_programado(datos: CrearMensajeProgRequest, db: Session = Depends(get_db)):
    """
    Registra un nuevo mensaje programado en la bd a partir de la informacióon recogida del formulario
    """

    # Verificamos que la sala destino exista en la  base de datos
    sala_existe = db.query(SalaAsignatura).filter(SalaAsignatura.id == datos.sala_id).first()

    if not sala_existe:
        raise HTTPException(status_code=404, detail="La sala seleccionada para el mensaje programado no existe.")
    
    # Realizamos el registro
    nuevo_mensaje = MensajeProgramado(
        sala_id=datos.sala_id,
        contenido=datos.contenido,
        fecha_envio=datos.fecha_envio,
        estado=EstadoMensaje.pendiente
    )

    db.add(nuevo_mensaje)
    db.commit()

    fecha_formateada = datos.fecha_envio.strftime('%d/%m/%Y %H:%M')
    registrar_log(db, f"Mensajes modificados: Creado nuevo mensaje programado en '{sala_existe.alias_principal}' para el {fecha_formateada}.")

    return {"status": "success"}

@router.put("/prado/mensajes/{mensaje_id}")
async def modificar_mensaje_programado(mensaje_id: int, datos: EditarMensajeProgRequest, db: Session = Depends(get_db)):
    """
    Permite modificar el mensaje o reprogramar la hora de un mensaje en estado pendiente
    """

    mensaje_db = db.query(MensajeProgramado).filter(
        MensajeProgramado.id == mensaje_id,
        MensajeProgramado.estado == EstadoMensaje.pendiente 
    ).first()

    if not mensaje_db:
        raise HTTPException(status_code=404, detail="El mensaje seleccionado para modificar no existe o no está marcado como pendiente.")
    
    # Detectamos que ha cambiado
    cambios = []
    if mensaje_db.contenido != datos.contenido:
        cambios.append("Mensaje modificado")

    if mensaje_db.fecha_envio.timestamp() != datos.fecha_envio.timestamp():
        cambios.append(
            f"Nueva fecha de envío: {datos.fecha_envio.strftime('%d/%m/%Y %H:%M')}"
        )

    # Si no ha habido cambios no ejecutamos las operaciones
    if not cambios:
        return {"status": "success", "mensaje": "Sin cambios detectados."}


    # Aplicamos las modificaciones
    mensaje_db.contenido = datos.contenido
    mensaje_db.fecha_envio = datos.fecha_envio
    db.commit()

    texto_cambios = ", ".join(cambios)
    registrar_log(db, f"Mensajes modificados: Mensaje programado con ID #{mensaje_id} actualizado. Cambios: [{texto_cambios}].")

    return {"status": "success"}

@router.delete("/prado/mensajes/{mensaje_id}")
async def eliminar_mensaje_programado(mensaje_id: int, db: Session = Depends(get_db)):
    """
    Elimina un mensaje programado de la base de datos.
    """

    mensaje_db = db.query(MensajeProgramado).filter(MensajeProgramado.id == mensaje_id).first()

    if not mensaje_db:
        raise HTTPException(status_code=404, detail="El mensaje seleccionado para borrar no existe.")
    
    db.delete(mensaje_db)
    db.commit()

    registrar_log(db, f"Mensajes modificados: Mensaje programado con ID #{mensaje_id} eliminado.")

    return {"status": "success"}



