# <- ¿De qué se encarga este archivo? -> 
#
# Aquí definiremos las URLs de nuestra API (Ej: @app.post("/rooms/{room_id}/kick"))
# Estas funciones reciben la petición HTTP, llaman a los services para ejecutar la accion y devuelven el resultado al Front.

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db # Obteenemos la base de datos
from pydantic import BaseModel # Para definir models de cara a los cuestionarios

from app.models.sala_asignaturas import SalaAsignatura
from app.models.usuarios import Usuario

# Importamos los dos servicios
from app.services.matrix_api import(

    obtener_info_sala, 
    obtener_perfil_usuario,
    registrar_usuarios_matrix,
    crear_espacio_asignatura,
    insertar_alumnos_sala,
    arreglar_jerarquia,
    crear_nodo
)

from app.services.prado_api import(

    obtener_alumnos_prado_service, 
    obtener_total_alumnos_usuario, 
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
    res_crear_espacio = await crear_espacio_asignatura(nombre_asignatura, profesor_id)

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

    # 2. Si el profesor marcó "Sí" en añadir automáticamente a los alumnos
    if datos.auto_añadir:
        info_asignatura = await obtener_alumnos_prado_service(asignatura_id)
        
        if not info_asignatura.get("error"):
            usuarios_asignatura = info_asignatura["usuarios_matriculados"]
            ids_alumnos = [u["matrix_id"] for u in usuarios_asignatura if u["matrix_id"] != profesor_id]
            
            # Reutilizamos tu función de inyección de Synapse
            res_insertar = await insertar_alumnos_sala(nuevo_room_id, ids_alumnos)
            alumnos_añadidos = len(res_insertar.get("id_alumnos_matriculados", []))
            
            if len(res_insertar.get("errores", [])) > 0:
                print(f"Advertencias al auto-matricular en nueva sala: {res_insertar['errores']}")

    # 3. Sincronizar nuestra base de datos local (PostgreSQL)
    # Como Matrix es la fuente de verdad, simplemente buscamos la raíz y forzamos un arreglar_jerarquia
    espacio_raiz = db.query(SalaAsignatura).filter(
        SalaAsignatura.id_asignatura_prado == asignatura_id,
        SalaAsignatura.id_padre == None
    ).first()

    if espacio_raiz:
        await arreglar_jerarquia(espacio_raiz.id_matrix_sala, asignatura_id, db)
    else:
        # Fallback de seguridad por si falla la búsqueda de la raíz
        raise HTTPException(status_code=404, detail="No se encontró el espacio raíz de la asignatura para sincronizar.")

    # 4. Respuesta al Frontend
    return {
        "status": "success",
        "mensaje": "Nodo creado y jerarquía actualizada correctamente.",
        "room_id": nuevo_room_id,
        "tipo": datos.tipo,
        "alumnos_auto_añadidos": alumnos_añadidos
    }

# ==========================================
# RUTAS DE LA PESTAÑA DE INICIO PERSONALIZADAS
# ==========================================

@router.get("/inicio/estadisticas")
async def get_inicio_estadisticas(db: Session = Depends(get_db)):
    user_id = PROFESOR["matrix_id"]

    # 1. PRADO
    total_asignaturas_prado = await obtener_total_asignaturas_usuario(user_id)
    total_alumnos_prado = await obtener_total_alumnos_usuario(user_id)

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

