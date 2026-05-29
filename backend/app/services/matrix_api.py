# <- ¿De qué se encarga este archivo? -> 
#
# Aquí encapsularemos todas las peticiones asíncronas (httpx) hacia matrix.ugr.es
# Ej: lanzar petición POST para expulsar o banear a un alumno

import httpx # Para peticiones GET, POST, PUT etc
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
        #  Devuelve una lista de los IDs de todas las salas a las que el usuario autenticado pertenece actualmente.
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


    