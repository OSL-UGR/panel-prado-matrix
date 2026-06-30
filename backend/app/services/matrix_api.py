# <- ¿De qué se encarga este archivo? -> 
#
# Aquí encapsularemos todas las peticiones asíncronas (httpx) hacia matrix.ugr.es
# Ej: lanzar petición POST para expulsar o banear a un alumno

import httpx # Para peticiones GET, POST, PUT etc
import secrets
import asyncio
from sqlalchemy.orm import Session
from app.models.sala_asignaturas import SalaAsignatura, TipoSala # Así podremos hacer db.query(SalaAsignatura)
from app.core.config import settings

async def obtener_info_sala(db: Session, room_id: str): # Aync para que no se bloquee y así pueda antender otras peticiones mientras

    # Equivalente a "SELECT * FROM SalaAsignatura WHERE id_matrix_sala = room_id"
    sala = db.query(SalaAsignatura).filter(

        SalaAsignatura.id_matrix_sala == room_id
    ).first() # Devuelve el primer resultado o None si no existe

    headers = {"Authorization": f"Bearer {settings.MATRIX_TOKEN}"}

    async with httpx.AsyncClient() as client:
        # Devuelve una lista de los IDs de todas las salas a las que el usuario autenticado pertenece actualmente.
        # Documentación oficial en https://playground.matrix.org/#get-/_matrix/client/v3/rooms/-roomId-/joined_members
        respuesta = await client.get(
            f"{settings.MATRIX_URL}/rooms/{room_id}/joined_members", 
            headers=headers
        )

        if respuesta.status_code != 200: # Para gestionar si hubiese habido algún fallo

            return {"ERROR":f"Fallo al conectar con Matrix: {respuesta.status_code}"}

        datos_matrix = respuesta.json()

    return {

        "datos_sala": {
            "alias": sala.alias_principal if sala else "Desconocido", # Devolvemos Descononico si no lo hubiese encontrado
            "tipo": sala.tipo.value if sala else "Desconocido"
        },
        "miembros_matrix": datos_matrix.get("joined", {}) # Devolvemos el listado de los miembros obtenidos a través de la API
    }


async def obtener_perfil_usuario(user_id:str):

    headers = {"Authorization": f"Bearer {settings.MATRIX_TOKEN}"}

    async with httpx.AsyncClient() as client:

        # 1 Primer endpoint para el nombre 
        res_nombre = await client.get(

            f"{settings.MATRIX_URL}/profile/{user_id}/displayname", 
            headers=headers
        )

        datos_nombre = res_nombre.json()

        # Hay que comprobar que el resultado sea correcto y el campo se haya escrito correctamente
        if res_nombre.status_code == 200 and "displayname" in datos_nombre:

            nombre = datos_nombre["displayname"]
        else:

            nombre = "Desconocido"

    return {
        "nombre": nombre,
        "matrix_id": user_id,
    }

async def registrar_usuarios_matrix(usuarios_prado: list):
    """
    Comprueba si los usuarios existen nuestro bd de Matrix. Si no, los crea.
    Recibe la lista de usuarios de PRADO.
    """ 
    
    id_usuarios_registrados = []
    errores = []

    headers = {"Authorization": f"Bearer {settings.MATRIX_TOKEN}"}

    async with httpx.AsyncClient() as client:
        # Para cada usuario
        for usuario in usuarios_prado:
            
            matrix_id = usuario["matrix_id"]
            # print(f"[LOG REGISTRAR]: 1. Comprobando usuario con su url: {settings.SYNAPSE_ADMIN_URL}/v2/users/{matrix_id}") # DEUPRACION
            
            # 1º Comrpobamos si el usuario ya existe en matrix o no
            # Documentacion oficial https://matrix-org.github.io/synapse/latest/admin_api/user_admin_api.html
            comprobador = await client.get(

                f"{settings.SYNAPSE_ADMIN_URL}/v2/users/{matrix_id}",
                headers = headers
            )

            # print(f"[LOG REGISTRAR]: 2. Comprobando codigo de estado: {comprobador.status_code}") # Depuración
                  
            if comprobador.status_code == 200:

                # print(f"[LOG REGISTRAR]: 3. El usuario ya estaba registrado.") # Depuración
                id_usuarios_registrados.append(matrix_id)
            
            elif comprobador.status_code == 404:

                # print(f"[LOG REGISTRAR]: 4. Creamos al usuario manualmente") # Depuración
                # 2. Si el usuario no existe lo creamos manualmente 
                password_aleatoria = secrets.token_urlsafe(16)

                payload = {
                    "password": password_aleatoria,
                    "displayname": usuario["nombre"]
                } 

                # print(f"[LOG REGISTRAR]: 5. Comrpobando url al crear usuario.") # Depuración
                res_crear = await client.put(

                    f"{settings.SYNAPSE_ADMIN_URL}/v2/users/{matrix_id}",
                    headers = headers,
                    json = payload
                )            

                if res_crear.status_code in [200, 201]: # 200 OK o 201 Created

                    # print(f"[LOG REGISTRAR]: 6. Se ha creado el usuario correctamente") # Depuración
                    id_usuarios_registrados.append(matrix_id)
                else:
                    # print(f"[LOG REGISTRAR]: 7. Ha ocurrido el siguiente error al crear a {matrix_id}: {res_crear.status_code} ") # Depuración
                    errores.append(f"Fallo al crear a {matrix_id}: {res_crear.status_code}")
            
            else:
                errores.append(f"Estado desconocido para {matrix_id}: {comprobador.status_code}")
                
    return {
        "id_usuarios_registrados": id_usuarios_registrados,
        "errores": errores
    }   

async def crear_espacio_asignatura(nombre_asignatura: str, id_profesor: str):
    """
    Crea un espacio privado y le da permisos de administrador al profesor.
    """ 

    headers = {"Authorization": f"Bearer {settings.MATRIX_TOKEN}"}

    payload = {

        "name": nombre_asignatura,
        "preset": "private_chat",
        "creation_content": {
            "type": "m.space", # Convierte la sala en un espacio
            "m.federate": False 
        },
        "initial_state": [
            {
                "type": "m.room.power_levels",
                "state_key": "",
                "content": {
                    "users": { 
                        id_profesor: 100 # El profesor tiene permisos de administrador
                    }
                }
            }
        ]
    }

    async with httpx.AsyncClient() as client:

        # Doc oficial: https://playground.matrix.org/#post-/_matrix/client/v3/createRoom
        res = await client.post(

            f"{settings.MATRIX_URL}/createRoom",
            headers=headers,
            json=payload
        )

        if res.status_code != 200:
            return {"ERROR": f"Fallo al crear el espacio en Matrix: {res.status_code}"}
        

        return {
            "room_id": res.json().get("room_id")
        }
    
async def insertar_alumnos_sala(room_id:str, ids_alumnos: list):
    """
    Inserta a los alumnos directamente en un espacio/sala sin requisito de aprobar una invitación
    """

    id_alumnos_matriculados = []
    errores = []

    headers = {"Authorization": f"Bearer {settings.MATRIX_TOKEN}"}

    async with httpx.AsyncClient() as client: 

        for alumno_id in ids_alumnos:

            payload = {"user_id": alumno_id}

            # print(f"[LOG INSERTAR]: 1. Matriculando a {alumno_id} en {room_id} con la url: {settings.SYNAPSE_ADMIN_URL}/v1/join/{room_id}") # Depuración

            res = await client.post(

                f"{settings.SYNAPSE_ADMIN_URL}/v1/join/{room_id}",
                headers=headers,
                json=payload
            )

            if res.status_code == 200:

                # print(f"[LOG INSERTAR]: 2. Se ha matriculado correctamente el usuario: {alumno_id}") # Depuración
                id_alumnos_matriculados.append(alumno_id)
            else:

                # print(f"[LOG INSERTAR]: 3. Ha aparecido el siguiente error al matriculr a: : {alumno_id}: {res.status_code} - {res.text}") # Depuración
                errores.append(f"Fallo al matricular a {alumno_id}: {res.status_code} - {res.text}")

    return {
        "id_alumnos_matriculados": id_alumnos_matriculados,
        "errores": errores
    }

async def arreglar_jerarquia(espacio_raiz_id : str, asignatura_id: str, db: Session):
    """
    Consultamos la jerarquía de un espacio en Matrix para añadir o borrar las salas de nuestra bd según sea necesario.
    """
    headers = {"Authorization": f"Bearer {settings.MATRIX_TOKEN}"}

    async with httpx.AsyncClient() as client:

        base_url = settings.MATRIX_URL.split("/_matrix")[0]
        res = await client.get(
            f"{base_url}/_matrix/client/v1/rooms/{espacio_raiz_id}/hierarchy",            
            headers=headers,
        )

        if res.status_code != 200:
            return {"ERROR":f"Fallo al conectar con Matrix para consultar la estructura de {espacio_raiz_id} : {res.status_code}"}
        
        data = res.json()

        # Obtenemos las salas y sus ids de las salas obtenidas a traves de la API de matrix
        salas_matrix = data.get("rooms", [])
        ids_matrix = set()

        for sala in salas_matrix:
            ids_matrix.add(sala["room_id"])

        # Obtenemos las salas y sus ids de las salas almacenadas en nuestra base de datos
        salas_bd = db.query(SalaAsignatura).filter(SalaAsignatura.id_asignatura_prado == asignatura_id).all()
        ids_bd = set()

        for sala in salas_bd:
            ids_bd.add(sala.id_matrix_sala)

        # Construimos el mapa de padres

        mapa_padres = {}
        
        for sala in salas_matrix:
            posible_padre_id = sala["room_id"]
            eventos_hijos = sala.get("children_state", [])
            
            for evento in eventos_hijos:

                if evento.get("type") == "m.space.child" and evento.get("content"):
                    hijo_id = evento.get("state_key")
                    mapa_padres[hijo_id] = posible_padre_id #Registramos quién es el padre de este hijo


        # Resolvemos las incroncruencias
        try:

            ids_para_borrar = ids_bd - ids_matrix # Las salas que se hayan borrado a través de Matrix
            ids_para_insertar = ids_matrix - ids_bd # Las salas que se hayan insertado a través de Matrix

            # BORRAMOS
            if ids_para_borrar:
                db.query(SalaAsignatura).filter(SalaAsignatura.id_matrix_sala.in_(ids_para_borrar)).delete(synchronize_session=False)

            # INSERTAMOS
            if ids_para_insertar:

                nuevas_salas = []

                for sala in salas_matrix:
                    room_id = sala["room_id"]

                    if room_id in ids_para_insertar:
                        nuevas_salas.append(sala)

                for nueva_sala in nuevas_salas:

                    # Detectamos si lo que se ha creado es un espacio o una sala
                    if nueva_sala.get("room_type") == "m.space":
                        tipo = TipoSala.espacio
                    else:
                        tipo = TipoSala.sala

                    padre_id = mapa_padres.get(nueva_sala["room_id"], espacio_raiz_id)

                    # Construimos la sala para insertarla en la base de datos
                    sala_insertar = SalaAsignatura(
                        id_asignatura_prado=asignatura_id,
                        id_matrix_sala=nueva_sala["room_id"],
                        alias_principal=nueva_sala.get("name", "Sala sin nombre"),
                        tipo=tipo,
                        id_padre=padre_id 
                    )

                    db.add(sala_insertar)

            # Guardamos los cambios si los hubo
            if ids_para_borrar or ids_para_insertar:
                db.commit()

        except Exception as e:
            db.rollback()
            print("ERROR: Fallo resolviendo las incongruencias entre la Base de datos y el estado de Matrix")

async def crear_nodo(nombre: str, descripcion:str, tipo: str, id_padre: str, id_profesor: str):
    """
    Crea una nueva sala/espacio según lo especificado, añadiendo nodos a la jerarquía de una asignatura.
    """

    headers = {"Authorization": f"Bearer {settings.MATRIX_TOKEN}"}

    # Necesitamos el dominio del servidor (Ej: matrix.ugr.es) no nos vale la url entera.
    dominio_matrix = settings.MATRIX_URL.split("//")[1].split("/")[0]

    # Creamos el payload_base para crer los tipos de salas, especificando los permisos y el id del espacio padre
    payload_base = {
        "name": nombre,
        "topic": descripcion,
        "initial_state": [
            {
                "type": "m.room.join_rules",
                "state_key": "",
                "content": {
                    "join_rule": "restricted",
                    "allow": [
                        {
                            "type": "m.room_membership",
                            "room_id": id_padre 
                        }
                    ]
                }
            }
        ]
    }

    # Añadimos los parámetros al payload según el tipo de el tipo de sala que queramos crear

    if tipo == TipoSala.espacio.value:
        payload_base["creation_content"] = {

            "type": "m.space",
            "m.federate": False
        }
    # Para escribir necesitarán de permisos mínimos con nivel 50
    elif tipo == TipoSala.sala_avisos.value:
        payload_base["power_level_content_override"] = {
            "events_default": 50,
            "users": {id_profesor: 100}
        }

    async with httpx.AsyncClient() as client:

        # 1 Creamos la sala/espacio
        res_crear = await client.post(

            f"{settings.MATRIX_URL}/createRoom",
            headers=headers,
            json=payload_base
        )

        if res_crear.status_code != 200:
            return {"ERROR": f"Fallo al crear el nodo en Matrix: {res_crear.status_code} - {res_crear.text}"}
        
        nuevo_room_id = res_crear.json().get("room_id")
        
        # 2 Lo vinculamos con el espacio del padre

        res_vinculo = await client.put(

            f"{settings.MATRIX_URL}/rooms/{id_padre}/state/m.space.child/{nuevo_room_id}",
            headers=headers,
            json={"via": [dominio_matrix]}
        )

        if res_vinculo.status_code != 200:
            return  {"ERROR": f"Sala creada con id {nuevo_room_id} pero fallo al vincularse con el espacio padre: {id_padre}: {res_vinculo.status_code}"}
        
        return {

            "status": "success",
            "room_id": nuevo_room_id,
            "tipo": tipo
            }
    
async def editar_nodo(room_id: str, nombre: str, descripcion: str, tipo: str, id_profesor: str):
    """
    Modifica el nombre, descripción y/o tipo de una sala existente.
    """

    headers = {"Authorization": f"Bearer {settings.MATRIX_TOKEN}"}

    async with httpx.AsyncClient() as client:

        # 1. Actualizamos el nombre
        res_nombre = await client.put(
            f"{settings.MATRIX_URL}/rooms/{room_id}/state/m.room.name/",
            headers=headers,
            json={"name": nombre}
        )

        if res_nombre.status_code != 200:
            return {"ERROR": f"Fallo al editar el nombre: {res_nombre.text}"}
        
        # 2. Actualizamos la descripción
        res_desc = await client.put(
            f"{settings.MATRIX_URL}/rooms/{room_id}/state/m.room.topic/",
            headers=headers,
            json={"topic": descripcion}
        )

        if res_desc.status_code != 200:
            return {"ERROR": f"Fallo al editar la descripción: {res_desc.text}"}
        
        # 3. Actualizamos el tipo y sus permisos (solo para salas no para espacios)
        if tipo == TipoSala.sala.value or tipo == TipoSala.sala_avisos.value:

            res_tipo = await client.get(
                f"{settings.MATRIX_URL}/rooms/{room_id}/state/m.room.power_levels/",
                headers=headers
            )

            if res_tipo.status_code == 200:

                power_levels = res_tipo.json() 

                if tipo == TipoSala.sala_avisos.value:
                    power_levels["events_default"] = 50
                else:
                    power_levels["events_default"] = 0

                await client.put(
                    f"{settings.MATRIX_URL}/rooms/{room_id}/state/m.room.power_levels/",
                    headers=headers,
                    json=power_levels
                )

        return {"status": "success"}
    
async def eliminar_nodo(room_id: str):
    """
    Expulsa a todos los alumnos de una sala y la elimina completamente
    """

    headers = {"Authorization": f"Bearer {settings.MATRIX_TOKEN}"}

    payload = {
        "block": True,
        "purge": True
    }
    
    async with httpx.AsyncClient() as client:
        res_borrar = await client.delete(
            f"{settings.SYNAPSE_ADMIN_URL}/v2/rooms/{room_id}",
            headers=headers,
            json=payload
        )

        if res_borrar.status_code != 200 and res_borrar.status_code != 202:
            return {"ERROR": f"Fallo al borrar la sala: {res_borrar.status_code} - {res_borrar.text}"}
        
        return {"status": "success"}
