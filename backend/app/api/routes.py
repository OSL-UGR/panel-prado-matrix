# <- ¿De qué se encarga este archivo? -> 
#
# Aquí definiremos las URLs de nuestra API (Ej: @app.post("/rooms/{room_id}/kick"))
# Estas funciones reciben la petición HTTP, llaman a los services para ejecutar la accion y devuelven el resultado al Front.

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db # Obteenemos la base de datos

from app.models.sala_asignaturas import SalaAsignatura
from app.models.usuarios import Usuario

# Importamos los dos servicios
from app.services.matrix_api import obtener_info_sala, obtener_perfil_usuario
from app.services.prado_api import obtener_alumnos_prado_service, obtener_total_alumnos_usuario, obtener_total_asignaturas_usuario

# Importamos el usuario activo de nuestro Mock de Prado
# TODO: esto habrá que actualizarlo con las variables de sesión de prado
from app.mocks.prado_db import PROFESOR

router = APIRouter() # Lo que hace es crear un grupo de rutas. En el main tendremos que incluirlo "app.include_router(router)"




# ==========================================
# RUTAS DE MATRIX
# ==========================================

@router.get("/salas/{room_id}/info")
async def endpoint_info_sala(room_id: str, db: Session = Depends(get_db)):
    resultado = await obtener_info_sala(db, room_id)
    return resultado

@router.get("/usuario/perfil")
async def endpoint_perfil_usuario():
    # Le pasamos a la función tu ID de Matrix directamente
    resultado = await obtener_perfil_usuario(PROFESOR["matrix_id"])
    return resultado

# ==========================================
# RUTAS DE PRADO (SIMULADOR)
# TODO: Conectar con Moodle real en el futuro
# ==========================================

@router.get("/prado/asignaturas/{asignatura_id}/alumnos")
async def endpoint_alumnos_prado(asignatura_id: str):
    resultado = await obtener_alumnos_prado_service(asignatura_id)
    return resultado

@router.get("/inicio/stats")
async def endpoint_inicio_stats(db: Session = Depends(get_db)):
    """
    Devuelve la comparativa de estadísticas entre PRADO y Matrix para el usuario activo.
    """
    user_id = PROFESOR["matrix_id"]

    # 1. PRADO: Llamadas a partir del usuario de la sesión
    total_asignaturas_prado = await obtener_total_asignaturas_usuario(user_id)
    total_alumnos_prado = await obtener_total_alumnos_usuario(user_id)

    # 2. MATRIX: Contamos en nuestra BD local
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