# <- ¿De qué se encarga este archivo? -> 

# # Encapsula las peticiones hacia Moodle/PRADO. Lee de nuestro mock DB, la cual falsea una base de datos 
# TODO: Ahora mismo es un simulador el cual tendremos que modificar a la hora de integral la API real de PRADO


from app.mocks.prado_db import CATALOGO
from app.models.sala_asignaturas import SalaAsignatura
from sqlalchemy.orm import Session

async def obtener_alumnos_prado_service(asignatura_id : str):

    """
    Devuelve la información de una asignatura junto a sus usuarios (profesores y alumnos) dada la id de esta.
    """

    for asignatura in CATALOGO["asignaturas"]:
        if asignatura["asig_id"] == asignatura_id:
            return asignatura
        
    return {
        "error": True,
        "mensaje": f"No se ha encontrado la asignatura con ID {asignatura_id} en PRADO",
    }

async def obtener_total_asignaturas_usuario(user_id : str):
    """
   Devuelve el número total de asignaturas a las que pertenece un usuario dado su id de matrix.
    """

    total = 0
    for asignatura in CATALOGO["asignaturas"]:

        usuarios = asignatura["usuarios_matriculados"]

        for usuario in usuarios: 
            if usuario["matrix_id"] == user_id:
                total = total+1
                break
    return total

async def obtener_total_alumnos_usuario(user_id : str):
    """
    Devuelve el número total de alumnos únicos que tiene un profesor en todas sus asignaturas.
    """
    alumnos_unicos = set()
    
    for asignatura in CATALOGO["asignaturas"]:
        usuarios = asignatura.get("usuarios_matriculados", [])
        
        # Comprobamos si el profesor pertenece a esta asignatura
        es_su_asignatura = any(u.get("matrix_id") == user_id for u in usuarios)
        
        if es_su_asignatura:
            for usuario in usuarios:
                # Contamos a todos menos al propio profesor
                if usuario.get("matrix_id") != user_id:
                    alumnos_unicos.add(usuario.get("matrix_id"))
                    
    return len(alumnos_unicos)

async def obtener_asignaturas_usuario(user_id: str, db: Session):
    """
    Obtiene el listado de asignaturas a las que pertenece un usuario y revisa si estan sincronizadas o no con Matrix
    """

    asignaturas = []

    for asignatura in CATALOGO["asignaturas"]:

        usuarios = asignatura["usuarios_matriculados"]

        for usuario in usuarios:
            if usuario["matrix_id"] == user_id:

                # Comprobamos si la asignatura tiene ya configurado un espacio en matrix 
                existe_sala = db.query(SalaAsignatura).filter(
                    SalaAsignatura.id_asignatura_prado == asignatura["asig_id"]
                ).first()

                info_asignatura = {
                    "id": asignatura["asig_id"],
                    "nombre": asignatura["nombre"],
                    "usuarios": len(usuarios),
                    "sincronizada": existe_sala is not None,
                }
                
                asignaturas.append(info_asignatura)
                break

    return asignaturas

