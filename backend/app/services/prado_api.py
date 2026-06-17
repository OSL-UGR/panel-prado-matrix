# <- ¿De qué se encarga este archivo? -> 

# # Encapsula las peticiones hacia Moodle/PRADO. Lee de nuestro mock DB, la cual falsea una base de datos 
# TODO: Ahora mismo es un simulador el cual tendremos que modificar a la hora de integral la API real de PRADO


from app.mocks.prado_db import CATALOGO

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

