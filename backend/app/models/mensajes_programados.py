# <- ¿De qué se encarga este archivo? -> 
#
# Este archivo es la representación en código de la tabla de de mensajes_programados.

import enum
from sqlalchemy import Column, Integer,ForeignKey, Text, DateTime, Enum
from app.core.database import Base
from sqlalchemy.orm import relationship

class EstadoMensaje(enum.Enum):
    pendiente = "pendiente"
    enviado = "enviado"
    fallido = "fallido"

class MensajeProgramado(Base):

    __tablename__ = "mensajes_programados"

    id = Column(Integer, primary_key=True, autoincrement=True)

    sala_id = Column(
        Integer, 
        ForeignKey("sala_asignaturas.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    contenido = Column(Text, nullable=False)

    fecha_envio = Column(DateTime(timezone=True), nullable=False)

    estado = Column(Enum(EstadoMensaje), default=EstadoMensaje.pendiente, nullable=False)

    sala = relationship(
            "SalaAsignatura",
            back_populates="mensajes_programados" 
        )