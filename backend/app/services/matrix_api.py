# <- ¿De qué se encarga este archivo? -> 
#
# Aquí encapsularemos todas las peticiones asíncronas (httpx) hacia matrix.ugr.es
# Ej: lanzar petición POST para expulsar o banear a un alumno

import httpx # Para peticiones GET, POST, PUT etc
import secrets
import asyncio
from sqlalchemy.orm import Session
from app.models.sala_asignaturas import SalaAsignatura # Así podremos hacer db.query(SalaAsignatura)
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
            
            # 1º Comrpobamos si el usuario ya existe en matrix o no
            # Documentacion oficial https://matrix-org.github.io/synapse/latest/admin_api/user_admin_api.html
            comprobador = await client.get(

                f"{settings.SYNAPSE_ADMIN_URL}/v2/users/{matrix_id}",
                headers = headers
            )

            if comprobador.status_code == 200:
                id_usuarios_registrados.append(matrix_id)
            
            elif comprobador.status_code == 404:
                # 2. Si el usuario no existe lo creamos manualmente 
                password_aleatoria = secrets.token_urlsafe(16)

                payload = {
                    "password": password_aleatoria,
                    "displayname": usuario["nombre"]
                } 

                res_crear = await client.put(

                    f"{settings.SYNAPSE_ADMIN_URL}/v2/users/{matrix_id}",
                    headers = headers,
                    json = payload
                )            

                if res_crear.status_code in [200, 201]: # 200 OK o 201 Created

                    id_usuarios_registrados.append(matrix_id)
                else:

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
            
            res = await client.post(

                f"{settings.SYNAPSE_ADMIN_URL}/v1/join/{room_id}",
                headers=headers,
                json=payload
            )

            if res.status_code == 200:

                id_alumnos_matriculados.append(alumno_id)
            else:
                errores.append(f"Fallo al matricular a {alumno_id}: {res.status_code} - {res.text}")

    return {
        "id_alumnos_matriculados": id_alumnos_matriculados,
        "errores": errores
    }