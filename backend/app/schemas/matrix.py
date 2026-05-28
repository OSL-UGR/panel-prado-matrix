# <- ¿De qué se encarga este archivo? -> 
#
# En este archivo utilizaremos la libreria Pydantic, aquí se define la estructura de los datos (JSON que entran y salen)
# Aquí nos aseguraremos que de cuando el front pida crear  un aviso, el JSON enviado tendrá obligatoriamente un mensaje
# y otro de fecha_programada. Si falta algo, el FastAPI devuelve un error 422 automáticamente.