# <- ¿De qué se encarga este archivo? -> 
#
# Se encarga de ejecutar y gestionar las funcionalidades que dependen de una tempporalidad (cron)

from apscheduler.schedulers.asyncio import AsyncIOScheduler # Equivalente a un cron pero dentro de nuestra app
from apscheduler.triggers.cron import CronTrigger # Para indicar cuando ejecutar una tarea
from datetime import datetime, timedelta # Para obtener la fecha actual 
from zoneinfo import ZoneInfo # Para obtener la hora de la franja de españa
from sqlalchemy.orm import Session # Para importar el tipo de estado Session 

# Import de nuestra app:
from app.core.database import sesion
from app.models.sala_asignaturas import SalaAsignatura
from app.models.cronogramas import Cronograma
from app.models.mensajes_programados import MensajeProgramado, EstadoMensaje

from app.services.matrix_api import accionar_celda_horario, enviar_mensaje_bot

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

async def procesador_mensajes_programados():
    """
    Tarea programada que revisa si hay mensajes pendientes cuya fecha de 
    envío sea igual o anterior al momento actual, y los dispara hacia Matrix.
    """

    ahora = datetime.now(ZONA_HORARIA)
    db: Session = sesion()

    try:

        # 1º Buscamos todos los mensajes programados en estado de pendientes y cuya fecha sea igual o anterior a ahora
        mensajes_pendientes = db.query(MensajeProgramado).filter(
            MensajeProgramado.estado == EstadoMensaje.pendiente,
            MensajeProgramado.fecha_envio <= ahora
        ).all()

        cambios = False # Para controlar si hubo que cambiar el estado del mensaje en la bd

        for mensaje in mensajes_pendientes:
            if mensaje.sala and mensaje.sala.id_matrix_sala:

                # 2 El bot envía el mensaje a la sala correspondiente
                res = await enviar_mensaje_bot(mensaje.sala.id_matrix_sala, mensaje.contenido)

                # 3 Cambiamos el estado según la respuesta de la petición
                if "ERROR" not in res:
                    mensaje.estado = EstadoMensaje.enviado
                else:
                    mensaje.estado = EstadoMensaje.fallido
                
                cambios = True
        
        if cambios:
            db.commit()


    except Exception as e:
        db.rollback() # Revertimos por si hubo un fallo a mitad de escritura
        print(f"ERROR: Ha habido un error al verificar los mensajes programados. {str(e)}")
    finally:
        db.close()


async def limpiador_historial_avisos():
    """
    Elimina de la bd aquellos mensajes programados con el estado de enviados o fallidos que tengan más de 3 meses de antiguedad para liberar espacio
    """
    ahora = datetime.now(ZONA_HORARIA)
    limite = ahora - timedelta(days=90) 
    
    db: Session = sesion()
    try:
        
        filas_borradas = db.query(MensajeProgramado).filter(
            MensajeProgramado.estado.in_([EstadoMensaje.enviado, EstadoMensaje.fallido]),
            MensajeProgramado.fecha_envio < limite
        ).delete(synchronize_session=False)
        
        if filas_borradas > 0:
            db.commit()
            
    except Exception as e:
        db.rollback()
        print(f"ERROR: Ha habido un error a la hora de eliminar algún mensaje enviado o fallido de la bd. {str(e)}")
    finally:
        db.close()

def iniciar_cron():
    """
    Configura y arranca el planificador.
    """
    # Tarea1: Para las franjas horarias de abrir/cerrar uso de salas (en el minuto 0 de cada hora)
    scheduler.add_job(
        verificador_horarios, 
        trigger=CronTrigger(minute=0, timezone=ZONA_HORARIA)
    )

    #Tarea2: Para los mensajes programados (cada minuto)
    scheduler.add_job(
        procesador_mensajes_programados,
        trigger=CronTrigger(minute="*", timezone=ZONA_HORARIA) 
    )

    # Tarea3: Para ir limpiando la bd de mensajes enviados y fallidos a los 3 meses (todos los dias a las 3AM)
    scheduler.add_job(
        limpiador_historial_avisos,
        trigger=CronTrigger(hour=3, minute=0, timezone=ZONA_HORARIA)
    )

    scheduler.start()
    print("[*] SISTEMA CRON INICIADO: Franjas horarias, envío de avisos y mantenimiento de BD activados (Europe/Madrid).")
    