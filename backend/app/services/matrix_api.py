# <- ¿De qué se encarga este archivo? -> 
#
# Aquí encapsularemos todas las peticiones asíncronas (httpx) hacia matrix.ugr.es
# Ej: lanzar petición POST para expulsar o banear a un alumno

import httpx # Para peticiones GET, POST, PUT etc
import secrets
from sqlalchemy.orm import Session
from app.models.sala_asignaturas import SalaAsignatura, TipoSala # Así podremos hacer db.query(SalaAsignatura)
from app.models.cronogramas import Cronograma
from app.core.config import settings

async def obtener_info_sala(db: Session, room_id: str): # Aync para que no se bloquee y así pueda antender otras peticiones mientras

    # Equivalente a "SELECT * FROM SalaAsignatura WHERE id_matrix_sala = room_id"
    sala = db.query(SalaAsignatura).filter(

        SalaAsignatura.id_matrix_sala == room_id
    ).first() # Devuelve el primer resultado o None si no existe

    headers = {"Authorization": f"Bearer {settings.MATRIX_TOKEN}"}

    async with httpx.AsyncClient() as client:
        # Devuelve una lista de los IDs de todas las salas a las que el usuario autenticado pertenece actualmente.
        # Documentación oficial en https://playground.matrix.org/#get-/_matrix/client/v3/rooms/-roomId-/joined_members
        respuesta = await client.get(
            f"{settings.MATRIX_URL}/rooms/{room_id}/joined_members", 
            headers=headers
        )

        if respuesta.status_code != 200: # Para gestionar si hubiese habido algún fallo

            return {"ERROR":f"Fallo al conectar con Matrix: {respuesta.status_code}"}

        datos_matrix = respuesta.json()

    return {

        "datos_sala": {
            "alias": sala.alias_principal if sala else "Desconocido", # Devolvemos Descononico si no lo hubiese encontrado
            "descripcion": sala.descripcion if sala else "Desconocido",
            "tipo": sala.tipo.value if sala else "Desconocido"
        },
        "miembros_matrix": datos_matrix.get("joined", {}) # Devolvemos el listado de los miembros obtenidos a través de la API
    }


async def obtener_perfil_usuario(user_id:str):

    headers = {"Authorization": f"Bearer {settings.MATRIX_TOKEN}"}

    async with httpx.AsyncClient() as client:

        # 1 Primer endpoint para el nombre 
        res_nombre = await client.get(

            f"{settings.MATRIX_URL}/profile/{user_id}/displayname", 
            headers=headers
        )

        datos_nombre = res_nombre.json()

        # Hay que comprobar que el resultado sea correcto y el campo se haya escrito correctamente
        if res_nombre.status_code == 200 and "displayname" in datos_nombre:

            nombre = datos_nombre["displayname"]
        else:

            nombre = "Desconocido"

    return {
        "nombre": nombre,
        "matrix_id": user_id,
    }

async def registrar_usuarios_matrix(usuarios_prado: list):
    """
    Comprueba si los usuarios existen nuestro bd de Matrix. Si no, los crea.
    Recibe la lista de usuarios de PRADO.
    """ 
    
    id_usuarios_registrados = []
    errores = []

    headers = {"Authorization": f"Bearer {settings.MATRIX_TOKEN}"}

    async with httpx.AsyncClient() as client:
        # Para cada usuario
        for usuario in usuarios_prado:
            
            matrix_id = usuario["matrix_id"]
            # print(f"[LOG REGISTRAR]: 1. Comprobando usuario con su url: {settings.SYNAPSE_ADMIN_URL}/v2/users/{matrix_id}") # DEUPRACION
            
            # 1º Comrpobamos si el usuario ya existe en matrix o no
            # Documentacion oficial https://matrix-org.github.io/synapse/latest/admin_api/user_admin_api.html
            comprobador = await client.get(

                f"{settings.SYNAPSE_ADMIN_URL}/v2/users/{matrix_id}",
                headers = headers
            )

            # print(f"[LOG REGISTRAR]: 2. Comprobando codigo de estado: {comprobador.status_code}") # Depuración
                  
            if comprobador.status_code == 200:

                # print(f"[LOG REGISTRAR]: 3. El usuario ya estaba registrado.") # Depuración
                id_usuarios_registrados.append(matrix_id)
            
            elif comprobador.status_code == 404:

                # print(f"[LOG REGISTRAR]: 4. Creamos al usuario manualmente") # Depuración
                # 2. Si el usuario no existe lo creamos manualmente 
                password_aleatoria = secrets.token_urlsafe(16)

                payload = {
                    "password": password_aleatoria,
                    "displayname": usuario["nombre"]
                } 

                # print(f"[LOG REGISTRAR]: 5. Comrpobando url al crear usuario.") # Depuración
                res_crear = await client.put(

                    f"{settings.SYNAPSE_ADMIN_URL}/v2/users/{matrix_id}",
                    headers = headers,
                    json = payload
                )            

                if res_crear.status_code in [200, 201]: # 200 OK o 201 Created

                    # print(f"[LOG REGISTRAR]: 6. Se ha creado el usuario correctamente") # Depuración
                    id_usuarios_registrados.append(matrix_id)
                else:
                    # print(f"[LOG REGISTRAR]: 7. Ha ocurrido el siguiente error al crear a {matrix_id}: {res_crear.status_code} ") # Depuración
                    errores.append(f"Fallo al crear a {matrix_id}: {res_crear.status_code}")
            
            else:
                errores.append(f"Estado desconocido para {matrix_id}: {comprobador.status_code}")
                
    return {
        "id_usuarios_registrados": id_usuarios_registrados,
        "errores": errores
    }   

async def crear_espacio_asignatura(nombre_asignatura: str,descripcion: str,  id_profesor: str):
    """
    Crea un espacio privado y le da permisos de administrador al profesor.
    """ 

    headers = {"Authorization": f"Bearer {settings.MATRIX_TOKEN}"}

    payload = {

        "name": nombre_asignatura,
        "topic": descripcion,
        "preset": "private_chat",
        "creation_content": {
            "type": "m.space", # Convierte la sala en un espacio
            "m.federate": False 
        },
        "initial_state": [
            {
                "type": "m.room.power_levels",
                "state_key": "",
                "content": {
                    "users": { 
                        id_profesor: 100, # El profesor tiene permisos de administrador
                        settings.MATRIX_BOT_ID: 100 # Introducimos el bot con permisos de admin para enviar mensajes programados
                    }
                }
            }
        ]
    }

    async with httpx.AsyncClient() as client:

        # Doc oficial: https://playground.matrix.org/#post-/_matrix/client/v3/createRoom
        res = await client.post(

            f"{settings.MATRIX_URL}/createRoom",
            headers=headers,
            json=payload
        )

        if res.status_code != 200:
            return {"ERROR": f"Fallo al crear el espacio en Matrix: {res.status_code}"}
        
        room_id = res.json().get("room_id")

        # Insertamos en el espacio al profesor que realiza la petición y al bot de mensajes programados
        await client.post(
            f"{settings.SYNAPSE_ADMIN_URL}/v1/join/{room_id}",
            headers=headers,
            json={"user_id": settings.MATRIX_BOT_ID}
        )
                
        await client.post(
            f"{settings.SYNAPSE_ADMIN_URL}/v1/join/{room_id}",
            headers=headers,
            json={"user_id": id_profesor}
        )
        
        return {"room_id": room_id}
    
async def insertar_alumnos_sala(room_id:str, ids_alumnos: list):
    """
    Inserta a los alumnos directamente en un espacio/sala sin requisito de aprobar una invitación
    """

    id_alumnos_matriculados = []
    errores = []

    headers = {"Authorization": f"Bearer {settings.MATRIX_TOKEN}"}

    async with httpx.AsyncClient() as client: 

        for alumno_id in ids_alumnos:

            payload = {"user_id": alumno_id}

            # print(f"[LOG INSERTAR]: 1. Matriculando a {alumno_id} en {room_id} con la url: {settings.SYNAPSE_ADMIN_URL}/v1/join/{room_id}") # Depuración

            res = await client.post(

                f"{settings.SYNAPSE_ADMIN_URL}/v1/join/{room_id}",
                headers=headers,
                json=payload
            )

            if res.status_code == 200:

                # print(f"[LOG INSERTAR]: 2. Se ha matriculado correctamente el usuario: {alumno_id}") # Depuración
                id_alumnos_matriculados.append(alumno_id)
            else:

                # print(f"[LOG INSERTAR]: 3. Ha aparecido el siguiente error al matriculr a: : {alumno_id}: {res.status_code} - {res.text}") # Depuración
                errores.append(f"Fallo al matricular a {alumno_id}: {res.status_code} - {res.text}")

    return {
        "id_alumnos_matriculados": id_alumnos_matriculados,
        "errores": errores
    }

async def arreglar_jerarquia(espacio_raiz_id : str, asignatura_id: str, db: Session):
    """
    Consultamos la jerarquía de un espacio en Matrix para añadir o borrar las salas de nuestra bd según sea necesario.
    """
    headers = {"Authorization": f"Bearer {settings.MATRIX_TOKEN}"}

    async with httpx.AsyncClient() as client:

        base_url = settings.MATRIX_URL.split("/_matrix")[0]
        res = await client.get(
            f"{base_url}/_matrix/client/v1/rooms/{espacio_raiz_id}/hierarchy",            
            headers=headers,
        )

        if res.status_code != 200:
            return {"ERROR":f"Fallo al conectar con Matrix para consultar la estructura de {espacio_raiz_id} : {res.status_code}"}
        
        data = res.json()

        # Obtenemos las salas y sus ids de las salas obtenidas a traves de la API de matrix
        salas_matrix = data.get("rooms", [])
        ids_matrix = set()

        for sala in salas_matrix:
            ids_matrix.add(sala["room_id"])

        # Obtenemos las salas y sus ids de las salas almacenadas en nuestra base de datos
        salas_bd = db.query(SalaAsignatura).filter(SalaAsignatura.id_asignatura_prado == asignatura_id).all()
        ids_bd = set()

        for sala in salas_bd:
            ids_bd.add(sala.id_matrix_sala)

        # Construimos el mapa de padres

        mapa_padres = {}
        
        for sala in salas_matrix:
            posible_padre_id = sala["room_id"]
            eventos_hijos = sala.get("children_state", [])
            
            for evento in eventos_hijos:

                if evento.get("type") == "m.space.child" and evento.get("content"):
                    hijo_id = evento.get("state_key")
                    mapa_padres[hijo_id] = posible_padre_id #Registramos quién es el padre de este hijo


        # Resolvemos las incroncruencias
        try:

            ids_para_borrar = ids_bd - ids_matrix # Las salas que se hayan borrado a través de Matrix
            ids_para_insertar = ids_matrix - ids_bd # Las salas que se hayan insertado a través de Matrix
            ids_comunes = ids_bd.intersection(ids_matrix) # Las que estań en ambos sitios

            # BORRAMOS
            if ids_para_borrar:
                db.query(SalaAsignatura).filter(SalaAsignatura.id_matrix_sala.in_(ids_para_borrar)).delete(synchronize_session=False)

            # INSERTAMOS
            if ids_para_insertar:

                nuevas_salas = []

                for sala in salas_matrix:
                    room_id = sala["room_id"]

                    if room_id in ids_para_insertar:
                        nuevas_salas.append(sala)

                for nueva_sala in nuevas_salas:

                    # Detectamos si lo que se ha creado es un espacio o una sala
                    if nueva_sala.get("room_type") == "m.space":
                        tipo = TipoSala.espacio
                    else:
                        tipo = TipoSala.sala

                    padre_id = mapa_padres.get(nueva_sala["room_id"], espacio_raiz_id)
                    
                    # Insertamos el bot en las salas
                    await client.post(
                        f"{settings.SYNAPSE_ADMIN_URL}/v1/join/{nueva_sala['room_id']}",
                        headers=headers,
                        json={"user_id": settings.MATRIX_BOT_ID}
                    )

                    # Construimos la sala para insertarla en la base de datos
                    sala_insertar = SalaAsignatura(
                        id_asignatura_prado=asignatura_id,
                        id_matrix_sala=nueva_sala["room_id"],
                        alias_principal=nueva_sala.get("name", "Sala sin nombre"),
                        descripcion=nueva_sala.get("topic",""),
                        tipo=tipo,
                        id_padre=padre_id 
                    )

                    db.add(sala_insertar)
                    db.flush() # Obligia a Postgres a generar el id (sala_insertar.id) antes del commit

                    # Si hemos creado una sala de char normal, le creamos su cronocgrama asociado
                    if tipo == TipoSala.sala:
                        db.add(Cronograma(sala_id=sala_insertar.id))

            # ACTUALIZAMOS
            if ids_comunes:

                mapa_salas_bd = {} # Map para buscar salas de la bd por su id de matrix

                for sala in salas_bd:
                    mapa_salas_bd[sala.id_matrix_sala] = sala

                for sala in salas_matrix:
                    room_id = sala["room_id"]

                    if room_id in ids_comunes:
                        sala_bd = mapa_salas_bd[room_id]
                        nombre = sala.get("name", "Sala sin nombre")
                        descripcion = sala.get("topic", "")

                        # Si se hubiese cambiado el nombre o descipcion desde matrix actualizamos nuestra bd
                        if sala_bd.alias_principal != nombre or sala_bd.descripcion != descripcion:
                            sala_bd.alias_principal = nombre
                            sala_bd.descripcion = descripcion


            # Guardamos los cambios si los hubo
            if ids_para_borrar or ids_para_insertar or ids_comunes:
                db.commit()

        except Exception as e:
            db.rollback()
            print("ERROR: Fallo resolviendo las incongruencias entre la Base de datos y el estado de Matrix")

async def crear_nodo(nombre: str, descripcion:str, tipo: str, id_padre: str, id_profesor: str):
    """
    Crea una nueva sala/espacio según lo especificado, añadiendo nodos a la jerarquía de una asignatura y forzando la entrada del profesor y el bot.
    """

    headers = {"Authorization": f"Bearer {settings.MATRIX_TOKEN}"}

    # Necesitamos el dominio del servidor (Ej: matrix.ugr.es) no nos vale la url entera.
    dominio_matrix = settings.MATRIX_URL.split("//")[1].split("/")[0]

    # Creamos el payload_base para crer los tipos de salas, especificando los permisos y el id del espacio padre
    payload_base = {
        "name": nombre,
        "topic": descripcion,
        "initial_state": [
            {
                "type": "m.room.join_rules",
                "state_key": "",
                "content": {
                    "join_rule": "restricted",
                    "allow": [
                        {
                            "type": "m.room_membership",
                            "room_id": id_padre 
                        }
                    ]
                }
            },
            {
                "type": "m.room.power_levels",
                "state_key": "",
                "content": {
                    "users": {
                        id_profesor: 100,
                        settings.MATRIX_BOT_ID: 100  
                    },
                    "events_default": 50 if tipo == TipoSala.sala_avisos.value else 0
                }
            }
        ]
    }

    # Añadimos los parámetros al payload según el tipo de el tipo de sala que queramos crear

    if tipo == TipoSala.espacio.value:
        payload_base["creation_content"] = {

            "type": "m.space",
            "m.federate": False
        }

    async with httpx.AsyncClient() as client:

        # 1 Creamos la sala/espacio
        res_crear = await client.post(

            f"{settings.MATRIX_URL}/createRoom",
            headers=headers,
            json=payload_base
        )

        if res_crear.status_code != 200:
            return {"ERROR": f"Fallo al crear el nodo en Matrix: {res_crear.status_code} - {res_crear.text}"}
        
        nuevo_room_id = res_crear.json().get("room_id")

        # Insertamos en el espacio al profesor que realiza la petición y al bot de mensajes programados
        await client.post(
            f"{settings.SYNAPSE_ADMIN_URL}/v1/join/{nuevo_room_id}",
            headers=headers,
            json={"user_id": settings.MATRIX_BOT_ID}
        )
                
        await client.post(
            f"{settings.SYNAPSE_ADMIN_URL}/v1/join/{nuevo_room_id}",
            headers=headers,
            json={"user_id": id_profesor}
        )
        
        # 2 Lo vinculamos con el espacio del padre
        res_vinculo = await client.put(

            f"{settings.MATRIX_URL}/rooms/{id_padre}/state/m.space.child/{nuevo_room_id}",
            headers=headers,
            json={"via": [dominio_matrix]}
        )

        if res_vinculo.status_code != 200:
            return  {"ERROR": f"Sala creada con id {nuevo_room_id} pero fallo al vincularse con el espacio padre: {id_padre}: {res_vinculo.status_code}"}
        
        return {

            "status": "success",
            "room_id": nuevo_room_id,
            "tipo": tipo
            }
    
async def editar_nodo(room_id: str, nombre: str, descripcion: str, tipo: str, id_profesor: str):
    """
    Modifica el nombre, descripción y/o tipo de una sala existente.
    """

    headers = {"Authorization": f"Bearer {settings.MATRIX_TOKEN}"}

    async with httpx.AsyncClient() as client:

        # 1. Actualizamos el nombre
        res_nombre = await client.put(
            f"{settings.MATRIX_URL}/rooms/{room_id}/state/m.room.name/",
            headers=headers,
            json={"name": nombre}
        )

        if res_nombre.status_code != 200:
            return {"ERROR": f"Fallo al editar el nombre: {res_nombre.text}"}
        
        # 2. Actualizamos la descripción
        res_desc = await client.put(
            f"{settings.MATRIX_URL}/rooms/{room_id}/state/m.room.topic/",
            headers=headers,
            json={"topic": descripcion}
        )

        if res_desc.status_code != 200:
            return {"ERROR": f"Fallo al editar la descripción: {res_desc.text}"}
        
        # 3. Actualizamos el tipo y sus permisos (solo para salas no para espacios)
        if tipo == TipoSala.sala.value or tipo == TipoSala.sala_avisos.value:

            res_tipo = await client.get(
                f"{settings.MATRIX_URL}/rooms/{room_id}/state/m.room.power_levels/",
                headers=headers
            )

            if res_tipo.status_code == 200:

                power_levels = res_tipo.json() 

                if tipo == TipoSala.sala_avisos.value:
                    power_levels["events_default"] = 50
                else:
                    power_levels["events_default"] = 0


                # Reestructuramos los permisos del progrsor y el bot
                if "users" not in power_levels:
                    power_levels["users"] = {}
                power_levels["users"][id_profesor] = 100
                power_levels["users"][settings.MATRIX_BOT_ID] = 100

                await client.put(
                    f"{settings.MATRIX_URL}/rooms/{room_id}/state/m.room.power_levels/",
                    headers=headers,
                    json=power_levels
                )

        return {"status": "success"}
    
async def eliminar_nodo(room_id: str):
    """
    Expulsa a todos los alumnos de una sala y la elimina completamente
    """

    headers = {"Authorization": f"Bearer {settings.MATRIX_TOKEN}"}
    base_url = settings.MATRIX_URL.split("/_matrix")[0] 
    
    async with httpx.AsyncClient() as client:

        # 1. Petición para recoger nuestro id como usuario
        res_whoami = await client.get(
            f"{settings.MATRIX_URL}/account/whoami",
            headers=headers
        )

        mi_id = None

        if res_whoami.status_code == 200:
            mi_id = res_whoami.json().get("user_id")

        # 2. Petición para vacíar la sala de usuarios (todos menos nosotros)
        res_usuarios = await client.get(

            f"{settings.MATRIX_URL}/rooms/{room_id}/joined_members",
            headers=headers
        )

        # Arregla fallos de incosistencia:
        # =================================================================
        if res_usuarios.status_code == 403 and mi_id is not None:
            # Usamos la API de Admin para meter a nuestro usuario en la sala
            await client.post(
                f"{settings.SYNAPSE_ADMIN_URL}/v1/join/{room_id}",
                headers=headers,
                json={"user_id": mi_id}
            )
            # Volvemos a pedir la lista de usuarios ahora que hemos entrado
            res_usuarios = await client.get(
                f"{settings.MATRIX_URL}/rooms/{room_id}/joined_members",
                headers=headers
            )
        # =================================================================

        if res_usuarios.status_code == 200 and mi_id != None:
            usuarios = res_usuarios.json().get("joined",{})

            # Echamos a todos los usuarios (menos a nosotros mismos el administrador y el bot)
            for user_id in usuarios.keys():
                if user_id != mi_id and user_id != settings.MATRIX_BOT_ID:

                    parametros ={
                        "user_id": user_id, 
                        "reason": "La sala ha sido eliminada permanentemente del sistema."
                    }

                    await client.post(

                        f"{settings.MATRIX_URL}/rooms/{room_id}/kick",
                        headers=headers,
                        json=parametros
                    )

            # Echamos al bot con su propio token        
            await client.post(
                f"{settings.MATRIX_URL}/rooms/{room_id}/leave",
                headers={"Authorization": f"Bearer {settings.MATRIX_BOT_TOKEN}"}
            )
            
            # Una vez expulsado a todos, nos salimos nosotros mismos 
            await client.post(
                f"{settings.MATRIX_URL}/rooms/{room_id}/leave",
                headers=headers
            )


        # Realizamos el borrado de la sala una vez está completamente vacía
        payload = {
            "block": True,
            "purge": True
        }

        res_borrar = await client.request(
            "DELETE",
            f"{settings.SYNAPSE_ADMIN_URL}/v2/rooms/{room_id}",
            headers=headers,
            json=payload
        )

        if res_borrar.status_code != 200 and res_borrar.status_code != 202:
            return {"ERROR": f"Fallo al borrar la sala: {res_borrar.status_code} - {res_borrar.text}"}
        
        return {"status": "success"}

async def accionar_celda_horario(room_id: str, cerrar: bool):
    """
    Lee los permisos actuales de la sala y los modifica para silenciar o permitir hablar a los alumnos.
    cerrar=True  -> Bajar la berja (silenciar alumnos)
    cerrar=False -> Subir la berja (permitir hablar, events_default = 0)
    """

    headers = {"Authorization": f"Bearer {settings.MATRIX_TOKEN}"}

    async with httpx.AsyncClient() as client:

        # Obtenemos los permisos de la sala actuales
        res_permisos = await client.get(
            f"{settings.MATRIX_URL}/rooms/{room_id}/state/m.room.power_levels",
            headers=headers
        )

        if res_permisos.status_code != 200:
            return {"ERROR": f"Fallo al obtener los permisos de la sala: {res_permisos.status_code} - {res_permisos.text}"}
        
        permisos = res_permisos.json()

        if cerrar:
            nuevo_permiso = 50
        else:
            nuevo_permiso = 0

        # SI la sala ya estaba en el estado correcto no debemos de ejecutar la petición 
        if permisos.get("events_default", 0) == nuevo_permiso:
            return {"La sala ya estaba en el estado deseado"}
        
        # Ejecutamos el cambio
        permisos["events_default"] = nuevo_permiso

        res_actualizar = await client.put(
            f"{settings.MATRIX_URL}/rooms/{room_id}/state/m.room.power_levels",
            headers=headers,
            json=permisos
        )

        if res_actualizar.status_code != 200:
            return {"ERROR": f"Fallo al actualizar los permisos de la sala: {res_actualizar.status_code} - {res_actualizar.text}"}
        
        return {"status": "success"}

async def enviar_mensaje_bot(room_id: str, texto: str):
    """
    Envía un mensaje utilizando el bot en una sala seleccionada.
    """
    # Construimos el texto en formato html
    cuerpo_texto = f"**[MENSAJE PROGRAMADO]**\n\n{texto}"

    texto_html = texto.replace('\n', '<br>')
    cuerpo_html = f"<strong>[MENSAJE PROGRAMADO]</strong><br><br>{texto_html}"

    headers = {"Authorization": f"Bearer {settings.MATRIX_BOT_TOKEN}"}
    payload = {
        "msgtype": "m.text",
        "body": cuerpo_texto,
        "format": "org.matrix.custom.html",
        "formatted_body": cuerpo_html
    }

    async with httpx.AsyncClient() as client:

        res = await client.post(
            f"{settings.MATRIX_URL}/rooms/{room_id}/send/m.room.message",
            headers=headers,
            json=payload
        )

        if res.status_code != 200:
            return {"ERROR": f"El bot no pudo procesar el envío: {res.status_code} - {res.text}"}
        
        return {"status": "success", "event_id": res.json().get("event_id")}

