// En este archivo realizaremos todas las comuniaciones entre el Frontend y el Backend de FatAPI



// Lee la variable de entorno que Vite usa para saber dónde está el backend.
// Si no existe, asume localhost:8000
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

/**
 * Función para obtener la información de una sala en Matrix tras la petición en el backend
 */
export const fetchSalaInfo = async (roomId) => {

    try{
        const response = await fetch(`${API_BASE_URL}/salas/${encodeURIComponent(roomId)}/info`);
        
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