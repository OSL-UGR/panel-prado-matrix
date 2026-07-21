from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from zoneinfo import ZoneInfo
from app.core.database import Base

ZONA_HORARIA = ZoneInfo("Europe/Madrid")


class LogSistema(Base):
    __tablename__ = "logs_sistema"

    id = Column(Integer, primary_key=True, index=True)
    contenido = Column(String, nullable=False)

    # Almacena la fecha y hora actuales automaticamente
    fecha = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(ZONA_HORARIA).replace(tzinfo=None)
    )