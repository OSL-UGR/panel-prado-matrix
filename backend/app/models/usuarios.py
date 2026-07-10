# <- ¿De qué se encarga este archivo? -> 
#
# Este archivo es la representación en código de la tabla de usuarios

from sqlalchemy import Column, Integer,String
from app.core.database import Base


class Usuario(Base):

    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, autoincrement=True)

    correo = Column(String, unique=True)

    nombre = Column(String)

    # El index es para que las busquedas sean mas rapidas, renta ponerlo en aquellas tuplas que consultaremos más
    matrix_id = Column(String, unique=True, index=True) # Ej: usuario:matrix.ugr.es
