# <- ¿De qué se encarga este archivo? -> 
#
# Este archivo es la representación en código de la tabla de cronogramas


from sqlalchemy import Column, Integer, ForeignKey
from app.core.database import Base
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship


DIAS_SEMANA = 7
HORAS_DIA = 24


# Genera la configuración inicial del cronograma, representada por una matriz con la sigueinte estructura:
#   - 7 filas (de lunes a domingo)
#   - 24 columnas (horas del día)
#
# Valor de cada posición:
#   0 -> Sala abierta
#   1 -> Sala cerrada
# 
# Estando inicialmente totalmente abierta, es decir todas sus posiciones con valores en 0

def config_inicial():

    matriz = []

    for dia in range(DIAS_SEMANA):
        fila = []

        for hora in range(HORAS_DIA):
            fila.append(0) # Cada hora almacenará un 0

        matriz.append(fila)

    return matriz


class Cronograma(Base):

    __tablename__="cronogramas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    sala_id = Column(
        
        Integer, 
        ForeignKey("sala_asignaturas.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )

    configuracion = Column(
        JSONB,
        nullable=False,
        default=config_inicial
    )

    # Esto se hace para que el acceso en consultas sea directo, en vez de hacer dos consultas disitntas, una para el cronograma y a partir del
    # id de la sala otra a la tabla SalaAsignatura, ahora podemos acceder a sus valores haciendo por ejemplo "cronograma.sala.alias_principal"
    sala = relationship(
        "SalaAsignatura",
        back_populates="cronograma"
    )