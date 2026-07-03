import { useState, useEffect } from "react";
import { fetchAsignaturasPrado, fetchEstructuraSalas, fetchGetCronograma, fetchPutCronograma } from "../services/api";

export default function CronogramaSalas(){
    // ---DATOS DE PRADO---
    const [asignaturas, setAsignaturas] = useState([]);
    const [activaIndex, setActivaIndex] = useState(0);

    // ---DATOS DE MATRIX---
    const [salas, setSalas] = useState([]);
    const [salaActivaId, setSalaActivaId] = useState(null);

    // ---DATOS DE LA BD---
    const [matriz, setMatriz] = useState([]); // Matriz 7x24 del cronograma actual

    // ---DATOS GESTIÓN INTERFAZ...
    const [cargando, setCargando] = useState(true); // Para bloquear la interfaz inicial mientras cargamos desde el servidor pa pagina entera
    const [cargandoSalas, setCargandoSalas] = useState(false); // Lo mismo pero sobre el panel de salas de la asignatura actual
    const [cargandoCron, setCargandoCron] = useState(false);
    const [direccion, setDireccion] = useState(null); // Para el carrusel

    // Función auxiliar para cargar lSOLO LAS SALAS de la asignatura
    const cargarEstructura = async (asignaturaId) => {
        try{
            const respuesta = await fetchEstructuraSalas(asignaturaId); // Obtenemos todas las salas

            // Filtramos, solo nos interesan las salas normales
            const todasLasSalas = respuesta.salas || []
            const salasNormales = todasLasSalas.filter(sala => sala.tipo === "sala");

            setSalas(salasNormales);

            // SI hay mas de una sala, seleccionamos la priemra como sala por defecto
            if (salasNormales.length > 0 ){
                setSalaActivaId(salasNormales[0].room_id)
                await cargarMatriz(asignaturaId, salasNormales[0].room_id);
            }
            else{
                setSalaActivaId(null);
                setMatriz([]);
            }
        } catch(error){
            console.error("Error cargando las salas para el cronograma:", error);

        } finally{
            setCargandoSalas(false); //Cuando termine dejamos de cloquear la interfaz y mostramos las salas
        }
    }

    // Función para cargar la matrix 7 x 24 de la sala activa
    const cargarMatriz = async (asignaturaId, roomId) => {
        setCargandoCron(true);
        try{
            const respuesta = await fetchGetCronograma(asignaturaId, roomId);

            if (respuesta.status === 'success') {
                setMatriz(respuesta.matriz);
            }

        } catch(error){
            console.error("Error cargando la matriz del cronograma: ", error);

        }finally{
            setCargandoCron(false);
        }
    }

    // Definimos el flujo inicial de la pantalla
    useEffect(() => {
        const init = async () => {
            try {
                const asigData = await fetchAsignaturasPrado();
                setAsignaturas(asigData); // Guardamos las asignaturas del profesor con todos sus datos
                
                // Si la primera asignatura que cargamos esta sincronizada, pedimos sus salas al momento, si no al cambiar de asignatura será el momento de cargar las salas
                if (asigData.length > 0 && asigData[0].sincronizada){

                    setCargandoSalas(true); // Iniciamos el bloqueo de UI mientras cargamos la estructura
                    cargarEstructura(asigData[0].id);
                }
            } catch (error) {
                console.error("Error inicializando cronograma:", error);
            } finally {
                setCargando(false);
            }
        };
        init();
    }, []);

    // Para la navegación del carrusel superior
    const irAnterior = () => {
        setDireccion('izq');

        const nuevoIndex = activaIndex === 0 ? asignaturas.length -1 : activaIndex - 1;

        setActivaIndex(nuevoIndex);
        setSalas([]); // Limpiamos las salas
        setSalaActivaId(null); // Limpiamos selección
        setMatriz([]);         // Limpiamos la cuadrícula

        const nuevaAsig = asignaturas[nuevoIndex];
        if(nuevaAsig && nuevaAsig.sincronizada){

            setCargandoSalas(true);
            cargarEstructura(nuevaAsig.id);
        }
    }

    const irSiguiente = () => {
        setDireccion('der');

        const nuevoIndex = activaIndex === asignaturas.length - 1 ? 0 : activaIndex + 1;
        
        setActivaIndex(nuevoIndex);
        setSalas([]); // Limpiamos las salas
        setSalaActivaId(null); // Limpiamos selección
        setMatriz([]);         // Limpiamos la cuadrícula

        const nuevaAsig = asignaturas[nuevoIndex];
        if(nuevaAsig && nuevaAsig.sincronizada){

            setCargandoSalas(true);
            cargarEstructura(nuevaAsig.id);
        }
    }

    if (cargando) {
        return(
            <div className="flex flex-col items-center justify-center h-64 border border-dashed border-bordes bg-paneles tracking-widest text-azul-turquesa animate-pulse">
                [// LEYENDO_SISTEMA_DE_ARCHIVOS_PRADO_MATRIX...]
            </div>
        );
    }

    // Si no tuviese asignaturas asignadas mostramos un mensaje que lo indique
    if (asignaturas.length === 0){
        return(
            <div className="text-center p-12 border-4 border-dashed border-bordes text-xl font-black text-bordes tracking-widest">
                 [ NO_TIENE_ASIGNATURAS_ASIGNADAS ]
            </div>
        );
    }

    const len = asignaturas.length
    const asigAnterior = len > 1 ? asignaturas[(activaIndex - 1 + len) % len] : null;
    const asigActual = asignaturas[activaIndex];
    const asigSiguiente = len > 1 ? asignaturas[(activaIndex + 1) % len] : null;

    return(
        <div className="flex flex-col gap-8 font-mono min-h-full p-4">
            {/* TÍTULO */}
            <h2 className="text-3xl text-texto font-black  tracking-widest border-b-4 border-texto pb-4 ]">
                [ HORARIOS_DE_USO_EN_TUS_SALAS ]
            </h2>
            {/* CARRUSEL DE ASIGNATURAS */}
            <div className="flex items-center justify-center w-full my-2 gap-4">

                {/* BOTÓN IZQUIERDA */}
                <button 
                    onClick={irAnterior}
                    className="w-12 h-12 m-4 border-4 bg-paneles border-texto text-texto hover:border-azul-turquesa hover:text-azul-turquesa cursor-pointer"
                    >
                <p className="font-black text-xl">{"<"}</p>
                </button>

                {/* CARRUSEL */}
                <div className="w-full max-w-3xl overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_15%,_black_85%,transparent_100%)]">
                    
                    {/* Animaciones*/}
                    <style>{`
                        @keyframes slideDesdeDerecha {
                        0% { transform: translateX(320px) scale(0.95); opacity: 0.4; }
                        100% { transform: translateX(0) scale(1); opacity: 1; }
                        }
                        @keyframes slideDesdeIzquierda {
                        0% { transform: translateX(-320px) scale(0.95); opacity: 0.4; }
                        100% { transform: translateX(0) scale(1); opacity: 1; }
                        }
                        .anim-slide-der { 
                        animation: slideDesdeDerecha 1s cubic-bezier(0.25, 1, 0.5, 1) forwards; 
                        }
                        .anim-slide-izq { 
                        animation: slideDesdeIzquierda 1s cubic-bezier(0.25, 1, 0.5, 1) forwards; 
                        }
                    `}
                    </style>
                    <div
                        key={activaIndex}
                        className={`flex items-center justify-center gap-6 py-4 ${
                            direccion === 'der' ? 'anim-slide-der' : 
                            direccion === 'izq' ? 'anim-slide-izq' : ''
                        }`}
                    >
                        {/* TARJETA ANTERIOR */}
                        <div className="w-64 z-10 opacity-40 scale-90">
                        {asigAnterior ? (
                            <div className="flex flex-col border-2 border-bordes bg-paneles p-4">
                                <div className="absolute inset-0 z-0 opacity-18">
                                <img 
                                    src="https://i.pinimg.com/736x/2f/69/6f/2f696f5ae5c19160760e999184772cf5.jpg" 
                                    alt="Imagen fondo tarjetas" 
                                    className="w-full h-full object-cover" 
                                />
                                </div>
                            <span className="text-texto font-black truncate">{asigAnterior.nombre}</span>
                            <span className="text-xs text-bordes tracking-widest">ID: #{asigAnterior.id} | USR: {asigAnterior.usuarios}</span>
                            </div>
                        ) : (
                            <div className="w-full h-24 border-2 border-dashed border-bordes/20"></div> 
                        )}
                        </div>

                        {/* TARJETA INTERMEDIA*/}
                        <div className="w-64 z-10 scale-100">
                        <div className="flex flex-col border-4 border-azul-turquesa bg-paneles p-4">
                            <div className="absolute inset-0 z-0 opacity-18">
                            <img 
                                src="https://i.pinimg.com/736x/2f/69/6f/2f696f5ae5c19160760e999184772cf5.jpg" 
                                alt="Imagen fondo tarjetas" 
                                className="w-full h-full object-cover" 
                            />
                            </div>
                            <span className="text-texto font-black truncate">{asigActual.nombre}</span>
                            <span className="text-xs text-bordes mt-2 font-bold tracking-widest">
                            ID: #{asigActual.id} | USR: {asigActual.usuarios}
                            </span>
                        </div>
                        </div>

                        {/* TARJETA SIGUIENTE */}
                        <div className="w-64 z-10 opacity-40 scale-90">
                        {asigSiguiente ? (
                            <div className="flex flex-col border-2 border-bordes bg-paneles p-4">
                                <div className="absolute inset-0 z-0 opacity-18">
                                <img 
                                    src="https://i.pinimg.com/736x/2f/69/6f/2f696f5ae5c19160760e999184772cf5.jpg" 
                                    alt="Imagen fondo tarjetas" 
                                    className="w-full h-full object-cover" 
                                />
                                </div>
                            <span className="text-texto font-black truncate">{asigSiguiente.nombre}</span>
                            <span className="text-xs text-bordes tracking-widest">ID: #{asigSiguiente.id} | USR: {asigSiguiente.usuarios}</span>
                            </div>
                        ) : (
                            <div className="w-full h-24 border-2 border-dashed border-bordes/20"></div> 
                        )}
                        </div>

                    </div>
                </div>
                {/* BOTÓN DERECHA */}
                <button 
                    onClick={irSiguiente}
                    className="w-12 h-12 m-4 border-4 bg-paneles border-texto text-texto hover:border-azul-turquesa hover:text-azul-turquesa cursor-pointer"
                >
                <p className="font-black text-xl">{">"}</p>
                </button>
            </div>

            {/* ZONA PRINCIPAL DE LA PANTALLA */}
            <div className=" flex flex-col flex-1">

                {!asigActual.sincronizada ? (

                    /* Si la asignatura no está sincronizada */
                    <div className="flex-1 border-2 border-dashed border-azul-turquesa/50 bg-azul-turquesa/5 p-8 flex flex-col items-center justify-center text-center gap-6">
            
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-3 bg-azul-turquesa animate-ping"></div>
                            <p className="text-xs text-azul-turquesa tracking-widest border border-azul-turquesa px-3 py-1 shadow-azul">
                                Status // Matrix_Disconnected
                            </p>
                            <div className="w-3 h-3 bg-azul-turquesa animate-ping"></div>
                        </div>
                        
                        <h2 className="text-2xl lg:text-3xl text-texto font-bold max-w-2xl leading-relaxed">
                            TODAVÍA NO HEMOS SINCRONIZADO ESTA ASIGNATURA. <br />
                            <p className="text-azul-turquesa">¡VAMOS A POR ELLO!</p>
                        </h2>
                        
                        <p className="text-sm text-bordes max-w-xl">
                            Redirígete a la pestaña de [ INICIO ] para sincronizar esta asignatura con un espacio en Matrix
                        </p>

                    </div>
                ) : cargandoSalas ?(

                    /* Mientras está cargando las salas */
                    <div className="flex-1 border-2 border-dashed border-azul-turquesa/50 bg-azul-turquesa/5 p-8 flex flex-col items-center justify-center text-center gap-6">
                        <p className="text-texto text-center font-bold tracking-widest animate-pulse">
                            [ LEYENDO_ESTRUCTURA_DE_SALAS... ]
                        </p>
                    </div>
                ) : salas.length === 0 ? (

                    /* Si está sincronizada pero no tiene salas normales */
                    <div className="flex-1 border-2 border-dashed border-azul-turquesa/50 bg-azul-turquesa/5 p-8 flex flex-col items-center justify-center text-center gap-6">
                        <h2 className="text-2xl lg:text-3xl text-azul-turquesa font-bold max-w-2xl leading-relaxed">
                            LA ASIGNATURA NO CONTIENE NINGUNA SALA OPERATIVA. <br />
                        </h2>
                        <p className="text-sm text-bordes max-w-xl">
                            Crea salas desde el [ GESTOR DE SALAS ] para poder automatizar sus horarios de acceso.
                        </p>
                    </div>

                ) : (

                    /* Si tiene salas, mostramos el selector y la matriz */ 
                    <div className="flex flex-col gap-6">


                    </div>
                )}

            </div>
        </div>
    );
}