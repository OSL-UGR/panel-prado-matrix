# <- ¿De qué se encarga este archivo? -> 
#
# Se encargará de leer las variables de entorno (tokens de Matrix, contraseñas) de forma centralizada y segura.

import os
from dotenv import load_dotenv

load_dotenv() # Para cargar las variables del archivo .env

class Settings:

    DATABASE_URL: str = os.getenv("DATABASE_URL")
    MATRIX_URL: str = os.getenv("MATRIX_URL")
    SYNAPSE_ADMIN_URL: str = os.getenv("SYNAPSE_ADMIN_URL")
    MATRIX_TOKEN: str = os.getenv("MATRIX_TOKEN")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL")


settings = Settings() # Creamos la instancia para usarla en el resto del proyecto y así acceder a las variables