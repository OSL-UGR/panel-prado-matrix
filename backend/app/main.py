# <- ¿De qué se encarga este archivo? -> 
#
# Archivo que arranca FastAPI, inicializa el servidor y donde se agrupan todas las rutas de la API

from contextlib import asynccontextmanager # Para el ciclo de vida
from fastapi import FastAPI # Crea la aplicación web
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base # Para la conexión con la bd
from app.api.routes import router # Para los endpoints que hemos definido en router
from app.core.config import settings

# Para los cron
from app.services.cron_manager import iniciar_cron

# Importamos los modelos para la hora de crear las tablas (parece que no hace nada pero es totalmente necesario)
from app.models.sala_asignaturas import SalaAsignatura
from app.models.usuarios import Usuario
from app.models.cronogramas import Cronograma
from app.models.mensajes_programados import MensajeProgramado

@asynccontextmanager
async def lifespan(app: FastAPI):

    # Todo lo que se escriba antes del "yield" se ejecuta al ENCENDER el servidor
    # ==================================
    iniciar_cron() 
    # ==================================

    yield

    # Todo lo que se escriba después del "yield" se ejecuta al APAGAR el servidor
    # ==================================

    # ==================================

# Lee todos los modelos registrados en "Base" y crea todas las tablas
Base.metadata.create_all(bind=engine) 

# Inicializamos la aplicación
app = FastAPI(title="Panel PRADO-Matrix", lifespan=lifespan) 

# Configuración del middleware de nuestra app
# TODO: esto en la fase de despliquege habrá que cambiarlo
app.add_middleware(
    CORSMiddleware, # Para que React (Front) se pueda comunicar con FastAPI (Backend)
    allow_origins=[settings.FRONTEND_URL],  # Ponemos la url de nuestro Front
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Permitimos las operaciones necesarias
    allow_headers=["Content-Type", "Authorization"],
)

# Incluimos el router a nuestra app
app.include_router(router, prefix="/api")


