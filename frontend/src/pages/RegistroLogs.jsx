import { useState, useEffect } from "react";
import { fetchGetLogsSistema } from "../services/api";

export default function RegistroLogs() {
    // --- DATOS DE LA BD ---
    const [logs, setLogs] = useState([]);

    // --- DATOS GESTIÓN INTERFAZ ---
    const [cargando, setCargando] = useState(true);

    // --- CARGA INICIAL DE DATOS ---
    useEffect(() => {
        const cargarHistorialLogs = async () => {
            try {
                const respuesta = await fetchGetLogsSistema();
                if (respuesta.status === "success") {
                    setLogs(respuesta.logs || []);
                }
            } catch (error) {
                console.error("Error inicializando los logs:", error);
            } finally {
                setCargando(false);
            }
        };
        cargarHistorialLogs();
    }, []); 

    // Para cuando este cargando la pestaña
    if (cargando) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border border-dashed border-bordes bg-paneles tracking-widest text-azul-turquesa animate-pulse">
                [// LEYENDO_SISTEMA_DE_ARCHIVOS_PRADO_MATRIX...]
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 font-mono min-h-full p-4">
            
            {/* titulo */}
            <h2 className="text-3xl text-texto font-black tracking-widest border-b-4 border-texto pb-4">
                [ TU_REGISTRO_DE_ACCIONES ]
            </h2>

            {/* CONTENEDOR PRINCIPAL ESTILO TERMINAL */}
            <div className="relative border-4 border-texto bg-fondo p-6 flex flex-col gap-4 h-175 overflow-hidden">
                
                {/* Imagen de fondo*/}
                <div className="absolute inset-0 opacity-30 pointer-events-none select-none">
                    <img
                        src="https://i.pinimg.com/736x/a3/cc/46/a3cc46f816e7a2d85cf4160ba2d2fa27.jpg"
                        alt="Imagen panel fondo logs"
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Cabecera de la consola*/}
                <div className="relative z-10 flex justify-between items-center border-b  pb-3 text-xs text-bordes font-bold tracking-wider">
                    <span>STATUS: ONLINE</span>
                    <span>REGISTROS: {logs.length} </span>
                </div>

                {/* Logs con scroll vertical */}
                <div className="relative z-10 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-bordes scrollbar-track-transparent flex flex-col gap-3 ">
                    
                    {logs.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-texto animate-pulse tracking-widest font-bold">
                                [ NO_HAY_LOGS_TODAVÍA ]
                            </div>
                    ) : (
                        /* Recorremos cada una de las tuplas */
                        logs.map((log) => (
                            <div 
                                key={log.id} 
                                className="text-sm flex items-start gap-4 transition-colors p-2 border-b border-bordes/30 group"
                            >
                                <span className="text-azul-turquesa font-bold">
                                    &gt;
                                </span>

                                <span className="text-bordes text-xs font-bold font-mono">
                                    [{log.fecha}]
                                </span>

                                <span className="text-texto tracking-wide font-bold">
                                    {log.contenido}
                                </span>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
}