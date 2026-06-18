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
from app.services.prado_api import obtener_alumnos_prado_service, obtener_total_alumnos_usuario, obtener_total_asignaturas_usuario, obtener_asignaturas_usuario

# Importamos el usuario activo de nuestro Mock de Prado
# TODO: esto habrá que actualizarlo con las variables de sesión de prado
from app.mocks.prado_db import PROFESOR

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
async def get_asignaturas(user_id: str):

    # TODO: cambiar el id hardcodeado por el id del usuario de la sesión de Prado
    if user_id == "me":
        user_id = PROFESOR["matrix_id"]

    return await obtener_asignaturas_usuario(user_id)

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