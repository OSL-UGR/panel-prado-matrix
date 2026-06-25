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