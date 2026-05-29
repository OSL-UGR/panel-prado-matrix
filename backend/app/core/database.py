# <- ¿De qué se encarga este archivo? -> 
#
# Establece la conexión directa y la sesión entre el código Python y el 
# contenedor de PostgreSQL usando SQLAlchemy

from sqlalchemy import create_engine # Crea la conexión con la base de datos
from sqlalchemy.orm import sessionmaker, declarative_base # Para crear la sesión con la BD y para crear la clase Base que recogerá todos los modelos
from app.core.config import settings # Para importar las variables de .env


engine = create_engine(settings.DATABASE_URL) # Creamos la conexión 

# 1. autocommit=False: Los cambios no se guardarán automaticamente, para guardarlos ejecutaremos "db.commit()"
# 2. autoflush=False: Evita comportamientos inesperados, no sincroniza automáticamente algunos cambios.
# 3. bind=engine: Le pasamos la conexión a la sesión
sesion = sessionmaker(autocommit=False, autoflush=False, bind=engine) # Creamos la sesión.

Base = declarative_base() # Todos los modelos importaŕan esta base

def get_db():

    db = sesion()
    
    try:
        yield db
    finally:
        db.close()



