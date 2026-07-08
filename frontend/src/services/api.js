// En este archivo realizaremos todas las comuniaciones entre el Frontend y el Backend de FatAPI

// Lee la variable de entorno que Vite usa para saber dónde está el backend.
// Si no existe, asume localhost:8000
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000/api";

/**
 *  MATRIX: Función para obtener la información de una sala en Matrix tras la petición en el backend
 */
export const fetchSalaInfo = async (roomId) => {

    try{
        const response = await fetch(`${API_BASE_URL}/matrix/salas/${encodeURIComponent(roomId)}`);
        
        if(!response.ok){

            throw new Error(`Error en la petición: ${response.status}`);
        }
        
        const data = await response.json();
        return data; 
        
    }catch (error){
        
        console.error("Error al obtener la info de la sala:", error);
        throw error;
    }
};

/**
 *  MATRIX: Función para obtener el perfil real del profesor de la sesión activa
 */
export const fetchPerfilUsuario = async () => {
    try {
        // Usamos el "me" para referirnos al usuario de la sesión
        const response = await fetch(`${API_BASE_URL}/matrix/usuarios/me/perfil`);        
        if (!response.ok) {
            throw new Error(`Error en la petición: ${response.status}`);
        }
        return await response.json(); 
    } catch (error) {
        console.error("Error al obtener el perfil de usuario:", error);
        throw error;
    }
};

/* INICIO: Función para obtener las estadísticas de la pestaña de inicio */
export const fetchEstadisticasInicio = async () => {

    try{
        const response = await fetch(`${API_BASE_URL}/inicio/estadisticas`);        
        if (!response.ok) {
            throw new Error(`Error en la petición: ${response.status}`);
        }
        return await response.json(); 
    }catch (error){

        console.error("Error al obtener las estadísticas de la pestaña de inicio.")
        throw error;
    }
};

/* PRADO: Funcion para obtener el listado de asignaturas a las que pertenece un usario*/

export const fetchAsignaturasPrado = async () => {
    try {
        // Usamos el "me" para referirnos al usuario de la sesión
        const response = await fetch(`${API_BASE_URL}/prado/usuarios/me/asignaturas`);        
        if (!response.ok) {
            throw new Error(`Error en la petición: ${response.status}`);
        }
        return await response.json();
    } catch (error) {

        console.error("Error al obtener las asignaturas de PRADO:", error);
        throw error;
    }
};

/* SISTEMA: Funcion para sincronizar una asignatura de Prado hacia Matrix (POST)*/

export const fetchSincronizarAsignatura = async (asignaturaId) =>{
    try{
        const response = await fetch(`${API_BASE_URL}/prado/asignaturas/${encodeURIComponent(asignaturaId)}/sincronizar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });        

        if (!response.ok) {
            throw new Error(`Error en la petición: ${response.status}`);
        }

        const data = await response.json();
        return data;
        
    } catch (error) {

        console.error(`Error sincronizando la asignatura ${asignaturaId}`, error);
        throw error
    }
}

/**
 * GESTOR SALAS: Obtiene una lista de todas las salas/espacios de una asingatura
 */
export const fetchEstructuraSalas = async (asignaturaId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/prado/asignaturas/${encodeURIComponent(asignaturaId)}/salas`);        
        
        if (!response.ok) {
            throw new Error(`Error en la petición: ${response.status}`);
        }
        return await response.json(); 
    } catch (error) {
        console.error(`Error al obtener las salas de la asignatura ${asignaturaId}:`, error);
        throw error;
    }
};

/**
 * GESTOR SALAS: Crea un nuevo nodo (espacio, sala o sala de avisos) colgando de un padre (raíz o subespacio) (POST)
 */

export const fetchCrearSala = async (asignaturaId,datosNodo) =>{
    try{
        const response = await fetch(`${API_BASE_URL}/prado/asignaturas/${encodeURIComponent(asignaturaId)}/salas`,{
            method: 'POST',
            headers:{
                'Content-Type': 'application/json'
            },
            // Convertimos el objeto de los cuestionarios de react al JSON que espera nuestro backend
            body: JSON.stringify(datosNodo)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || `Error en la petición: ${response.status}`);
        }
        
        return await response.json();
    }
    catch (error) {

        console.error(`Error al crear la sala de la asignatura ${asignaturaId}`, error);
        throw error
    }

}

/**
 * GESTOR SALAS: Edita nombre, descripcion y/o tipo de una sala/espacio existente (PUT)
 */
export const fetchEditarSala = async (asignaturaId, roomId, datosNodo) => {
    try {
        const response = await fetch(`${API_BASE_URL}/prado/asignaturas/${encodeURIComponent(asignaturaId)}/salas/${encodeURIComponent(roomId)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosNodo)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || `Error en la petición: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error al editar la sala ${roomId} en la asignatura ${asignaturaId}:`, error);
        throw error;
    }
};

/**
 * GESTOR SALAS: Elimina una sala o espacio (DELETE)
 */
export const fetchEliminarSala = async (asignaturaId, roomId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/prado/asignaturas/${encodeURIComponent(asignaturaId)}/salas/${encodeURIComponent(roomId)}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || `Error en la petición: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error al eliminar la sala ${roomId} en la asignatura ${asignaturaId}:`, error);
        throw error;
    }
};

/**
 * CRONOGRAMA: Obtiene la matriz 7x24 actual de una sala (GET)
 */
export const fetchGetCronograma = async (asignaturaId, roomId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/prado/asignaturas/${encodeURIComponent(asignaturaId)}/salas/${encodeURIComponent(roomId)}/cronograma`);        
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || `Error en la petición: ${response.status}`);
        }
        return await response.json(); 
    } catch (error) {
        console.error(`Error al obtener el cronograma de la sala ${roomId}:`, error);
        throw error;
    }
};

/**
 * CRONOGRAMA: Sobrescribe la matriz 7x24 de una sala (PUT)
 */
export const fetchPutCronograma = async (asignaturaId, roomId, datosCronograma) => {
    try {
        const response = await fetch(`${API_BASE_URL}/prado/asignaturas/${encodeURIComponent(asignaturaId)}/salas/${encodeURIComponent(roomId)}/cronograma`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosCronograma) //datosCronograma debe tener la forma { matriz: [[0,0...], [0,0...]...] }
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || `Error en la petición: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error al actualizar el cronograma de la sala ${roomId}:`, error);
        throw error;
    }
};

/**
 * MENSAJES PROGRAMADOS: Obtiene todos los mensajes pendientes (GET)
 */
export const fetchGetMensajesProgramados = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/prado/mensajes`);        
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || `Error en la petición: ${response.status}`);
        }
        return await response.json(); 
    } catch (error) {
        console.error("Error al obtener los mensajes programados:", error);
        throw error;
    }
};

/**
 * MENSAJES PROGRAMADOS: Crea un nuevo mensaje programado  (POST)
 */
export const fetchCrearMensajeProgramado = async (datosMensaje) => {
    try {
        const response = await fetch(`${API_BASE_URL}/prado/mensajes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // datosMensaje debe ser un objeto: { sala_id: 1, contenido: "...", fecha_envio: "2026-10-05T10:00:00Z" }
            body: JSON.stringify(datosMensaje) 
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || `Error en la petición: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("Error al crear el mensaje programado:", error);
        throw error;
    }
};

/**
 * MENSAJES PROGRAMADOS: Edita el texto o la fecha de un mensaje pendiente (PUT)
 */
export const fetchEditarMensajeProgramado = async (mensajeId, datosMensaje) => {
    try {
        const response = await fetch(`${API_BASE_URL}/prado/mensajes/${encodeURIComponent(mensajeId)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            // datosMensaje debe ser: { contenido: "...", fecha_envio: "..." }
            body: JSON.stringify(datosMensaje)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || `Error en la petición: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error al editar el mensaje programado ${mensajeId}:`, error);
        throw error;
    }
};

/**
 * MENSAJES PROGRAMADOS: Elimina un mensaje programado de la cola (DELETE)
 */
export const fetchEliminarMensajeProgramado = async (mensajeId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/prado/mensajes/${encodeURIComponent(mensajeId)}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || `Error en la petición: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error al cancelar el mensaje programado ${mensajeId}:`, error);
        throw error;
    }
};