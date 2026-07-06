# <- ¿De qué se encarga este archivo? -> 
#
# Se encarga de ejecutar y gestionar las funcionalidades que dependen de una tempporalidad (cron)

from apscheduler.schedulers.asyncio import AsyncIOScheduler # Equivalente a un cron pero dentro de nuestra app
from apscheduler.triggers.cron import CronTrigger # Para indicar cuando ejecutar una tarea
from datetime import datetime # Para obtener la fecha actual 
from zoneinfo import ZoneInfo # Para obtener la hora de la franja de españa
from sqlalchemy.orm import Session # Para importar el tipo de estado Session 

# Import de nuestra app:
from app.core.database import sesion
from app.models.sala_asignaturas import SalaAsignatura
from app.models.cronogramas import Cronograma
from app.services.matrix_api import accionar_celda_horario

ZONA_HORARIA = ZoneInfo("Europe/Madrid")
scheduler = AsyncIOScheduler() # Creamos el planificador (equivalente al cron)

async def verificador_horarios():
    """
    Tarea programada que revisa la matriz 7x24 de cada sala y ajusta los permisos.
    """

    dia_actual = datetime.now(ZONA_HORARIA).weekday()
    hora_actual = datetime.now(ZONA_HORARIA).hour

    db: Session = sesion()

    try:

        cronogramas = db.query(Cronograma).all()

        for crono in cronogramas:
            estado_celda = crono.configuracion[dia_actual][hora_actual]
        
            cerrar_celda = False
            if estado_celda == 1:
                cerrar_celda= True

            if crono.sala and crono.sala.id_matrix_sala:

                res = await accionar_celda_horario(crono.sala.id_matrix_sala, cerrar_celda)

                if "ERROR" in res:
                    print(f"El error ha ocurrido sobre la sala: {crono.sala.alias_principal}")


    except Exception as e:
        print(f"ERROR: Ha habido un error al verificar los horarios de una sala. {str(e)}")
    finally:
        db.close() 

def iniciar_cron():
    """
    Configura y arranca el planificador.
    """

    scheduler.add_job(
        verificador_horarios, 
        trigger=CronTrigger(minute=0, timezone=ZONA_HORARIA)
    )

    scheduler.start()

    