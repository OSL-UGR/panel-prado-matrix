# <- ¿De qué se encarga este archivo? -> 
# Actúa como nuestra Base de Datos simulada para PRADO.

# =============================
# DEFINIMOS LOS USUARIOS
# =============================
PROFESOR = {
    "prado_id": "0001",
    "nombre": "Samuel Cantero",
    "rol": "profesor",
    "matrix_id": "@e.samuelcantero:chat.ugr.es", # Debería ser sin el e. pero es mi usuario para las pruebas
    "correo": "samuelcantero@correo.ugr.es" # Deberia ser @ugr.es pero es mi usuari para las pruebas
}

USUARIO1 = {
    "prado_id": "1001",
    "nombre": "Alumno ejemplo1",
    "rol": "alumno",
    "matrix_id": "@e.ejemplo1:chat.ugr.es",
    "correo": "ejemplo1@correo.ugr.es"
}

USUARIO2 = {
    "prado_id": "1002",
    "nombre": "Alumno ejemplo2",
    "rol": "alumno",
    "matrix_id": "@e.ejemplo2:chat.ugr.es",
    "correo": "ejemplo2@correo.ugr.es"
}

USUARIO3 = {
    "prado_id": "1003",
    "nombre": "Alumno ejemplo3",
    "rol": "alumno",
    "matrix_id": "@e.ejemplo3:chat.ugr.es",
    "correo": "ejemplo3@correo.ugr.es"
}

USUARIO4 = {
    "prado_id": "1004",
    "nombre": "Alumno ejemplo4",
    "rol": "alumno",
    "matrix_id": "@e.ejemplo4:chat.ugr.es",
    "correo": "ejemplo4@correo.ugr.es"
}

# =============================
# DEFINIMOS LAS ASIGNATURAS
# =============================

ASIGNATURA1 = {
    "asig_id": "001",
    "nombre": "Ingeniería de Servidores",
    "usuarios_matriculados":[
        PROFESOR,
        USUARIO1,
        USUARIO2,
        USUARIO3,
        USUARIO4,
    ]
}

ASIGNATURA2 = {
    "asig_id": "002",
    "nombre": "Arquitectura de Computadores",
    "usuarios_matriculados":[
        PROFESOR,
        USUARIO1,
        USUARIO3,
        USUARIO4
    ]
}

ASIGNATURA3 = {
    "asig_id": "003",
    "nombre": "Desarrollo de Software",
    "usuarios_matriculados":[
        PROFESOR,
        USUARIO2,
        USUARIO3,
    ]
}

# =============================
# CATALOGO DE ASIGNATURAS
# =============================

CATALOGO = {
    "asignaturas": [
        ASIGNATURA1,
        ASIGNATURA2,
        ASIGNATURA3,
    ] 
}