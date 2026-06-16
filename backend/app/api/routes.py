# <- ¿De qué se encarga este archivo? -> 
#
# Aquí definiremos las URLs de nuestra API (Ej: @app.post("/rooms/{room_id}/kick"))
# Estas funciones reciben la petición HTTP, llaman a los services para ejecutar la accion y devuelven el resultado al Front.

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db # Obteenemos la base de datos

# Importamos los dos servicios
from app.services.matrix_api import obtener_info_sala
from app.services.prado_api import obtener_alumnos_prado_service

router = APIRouter() # Lo que hace es crear un grupo de rutas. En el main tendremos que incluirlo "app.include_router(router)"


# ==========================================
# RUTAS DE MATRIX
# ==========================================

@router.get("/salas/{room_id}/info")
async def endpoint_info_sala(room_id: str, db: Session = Depends(get_db)):
    resultado = await obtener_info_sala(db, room_id)
    return resultado


# ==========================================
# RUTAS DE PRADO (SIMULADOR)
# TODO: Conectar con Moodle real en el futuro
# ==========================================

@router.get("/prado/asignaturas/{asignatura_id}/alumnos")
async def endpoint_alumnos_prado(asignatura_id: str):
    resultado = await obtener_alumnos_prado_service(asignatura_id)
    return resultado