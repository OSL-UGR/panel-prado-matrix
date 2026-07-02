# <- ¿De qué se encarga este archivo? -> 
#
# Este archivo es la representación en código de la tabla de sala_asingaturas

import enum
from sqlalchemy import Column, Integer, String, Enum
from app.core.database import Base # Importamos la Base


class TipoSala(enum.Enum):
    espacio = "espacio"
    sala = "sala"
    sala_avisos = "sala_avisos"

class SalaAsignatura(Base):

    __tablename__ = "sala_asignaturas"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # El index es para que las busquedas sean mas rapidas, renta ponerlo en aquellas tuplas que consultaremos más
    id_asignatura_prado = Column(String, index=True) 

    id_matrix_sala = Column(String, index=True) # Ej: !xyz123:matrix.ugr.es

    alias_principal = Column(String)

    descripcion = Column(String)

    tipo = Column(Enum(TipoSala)) # Espacio, sala o sala_avisos

    # Guardael id de Matrix del espacio del padre que tenga 
    id_padre = Column(String, index=True, nullable=True) # El nullable es por que el nivel 0 no tendrá padre
