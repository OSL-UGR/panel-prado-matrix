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

    // ---DATOS GESTIÓN INTERFAZ---
    const [cargando, setCargando] = useState(true); // Para bloquear la interfaz inicial mientras cargamos desde el servidor pa pagina entera
    const [cargandoSalas, setCargandoSalas] = useState(false); // Lo mismo pero sobre el panel de salas de la asignatura actual
    const [cargandoCron, setCargandoCron] = useState(false);
    const [direccion, setDireccion] = useState(null); // Para el carrusel

    // ---DATOS GESTIÓN ARRASTRAR Y SELECCIONAR CON EL RATÓN---
    const [isDragging, setIsDragging] = useState(false);
    const [dragValue, setDragValue] = useState(null); 
    const [hayCambios, setHayCambios] = useState(false);

    const len = asignaturas.length
    const asigAnterior = len > 1 ? asignaturas[(activaIndex - 1 + len) % len] : null;
    const asigActual = asignaturas[activaIndex];
    const asigSiguiente = len > 1 ? asignaturas[(activaIndex + 1) % len] : null;

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

    const handleAlternarHora = (dia, hora, estadoAlArrastrar = null) => {

        //Copiamos la matriz
        const nuevaMatriz = [];
        for (const fila of matriz){
            // Copiamos la fila
            const copiaFila = [...fila];

            nuevaMatriz.push(copiaFila);
        }

        // Revisamos si la función se ha ejecutado arastrando o bien clicando directamente. 
        if (estadoAlArrastrar != null){

            nuevaMatriz[dia][hora] = estadoAlArrastrar;
        }
        else{
            if(nuevaMatriz[dia][hora] === 0){

                nuevaMatriz[dia][hora] = 1;
            }
            else{

                nuevaMatriz[dia][hora] = 0;
            }
        }

        setMatriz(nuevaMatriz);
        setHayCambios(true); // Para indicar que ha habido cambios
    };

    // Se ejecuta cuando se hace el primer click y se comienza a arrastrar
    const handleMouseDown = (dia, hora) => {

        setIsDragging(true);
        
        // Si la celda era 0, pintaremos 1. Si era 1, pintaremos 0.
        const estadoAPintar = matriz[dia][hora] === 0 ? 1 : 0; 
        setDragValue(estadoAPintar);
        
        // Alternamos la hora de la celda en específico
        handleAlternarHora(dia, hora, estadoAPintar);
    };

    // Si el usuario pulsa fuera de la cuadricula, se desactiva el modo aggarre
    useEffect(() => {
        const handleMouseUp = () => {
            setIsDragging(false);
            setDragValue(null);
        };

        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [isDragging]);

    // Se ejecuta de manera continua al pasar por encima de las cledas con el click encima
    const handleMouseEnter = (dia, hora) => {

        if(isDragging && dragValue !== null){
            handleAlternarHora(dia, hora, dragValue);
        }
    };

    const handleGuardarCrono = async () => {
        const asigActual = asignaturas[activaIndex];

        try{
            await fetchPutCronograma(asigActual.id, salaActivaId, {matriz});
            setHayCambios(false);
        } catch(error){

            alert("ERROR: No se ha podido guardar el cronograma: " + error.message)
        }
    };

    // Función auxiliar para que avise al cambiar de sala si hay cambios pendientes
    const handleCambioSala = async (roomId) => {
        if (hayCambios) {
            const confirmar = window.confirm("Tienes cambios sin guardar en el panel de horarios. ¿Seguro que deseas cambiar de sala y perder los cambios?");
            if (!confirmar) return;
        }
        setSalaActivaId(roomId);
        await cargarMatriz(asigActual.id, roomId);
    };

    const DIAS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

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

    return(
        <div className="flex flex-col gap-8 font-mono min-h-full p-4">
            {/* TÍTULO */}
            <h2 className="text-3xl text-texto font-black  tracking-widest border-b-4 border-texto pb-4 ]">
                [ TUS_HORARIOS_DE_USO_EN_SALAS ]
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
                    <div className="flex flex-col gap-4">
                        <label className="text text-azul-turquesa tracking-widest font-black text-right">
                            [ SELECCIONA_LA_SALA_PARA_CAMBIARLE_EL_HORARIO ]
                        </label>
    
                        {/* Contenedor con scroll horizontal */}
                        <div className="relative flex items-center justify-center gap-6 py-8 px-4 overflow-x-auto border-2 border-bordes bg-fondo scrollbar-thin scrollbar-thumb-bordes scrollbar-track-paneles">
                            
                            {/* Imagen de fondo del panel */}
                            <div className="absolute inset-0 opacity-20 pointer-events-none">
                                <img
                                    src="https://i.pinimg.com/736x/9c/c6/59/9cc6593a2bbca73a572e9f1e7f711732.jpg"
                                    alt="Fondo del panel horizontal"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            
                            {salas.map((sala) => {
                                const esActiva = sala.room_id === salaActivaId;
                                return(
                                    <div key={sala.room_id} className="flex justify-center">
                                        <div onClick={() => handleCambioSala(sala.room_id)}>                                            
                                            <div className="group relative flex flex-col justify-center text-center overflow-hidden border-2 cursor-pointer rounded-full w-40 h-40 border-texto duration-200 hover:border-azul-turquesa hover:shadow-[0_0_20px_var(--color-azul-turquesa)] bg-paneles z-10">

                                                {/* Imagen de fondo del nodo */}
                                                <div className="absolute opacity-50 pointer-events-none">
                                                    <img 
                                                        src={esActiva 
                                                            ? "https://i.pinimg.com/736x/b5/fe/23/b5fe23fdff23565de2d4509d3f065934.jpg" // Si es activa
                                                            : "https://i.pinimg.com/736x/fd/0a/88/fd0a886a160facf6c2de40b690019a36.jpg" 
                                                        }                                                
                                                        alt="Fondo nodo" 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                </div>

                                                {/* Textos de la sala */}
                                                <span className="relative z-10 font-bold tracking-widest text-sm text-texto duration-200 group-hover:text-azul-turquesa">
                                                    {sala.nombre}
                                                </span>
                                                <span className="relative z-10 text-[10px] text-bordes tracking-widest mt-1">
                                                    {sala.tipo}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* =========================================
                            MATRIZ SEMANAL 7x24 (LA BERJA)
                            ========================================= */}
                        {cargandoCron ? (
                            
                            <p className="text-texto text-center font-bold tracking-widest mt-12 animate-pulse">
                                [ LEYENDO_MATRIZ_DESDE_POSTGRESQL... ]
                            </p>

                        ) : matriz.length > 0 && (
                            
                            <div className="flex flex-col gap-4 mt-8">
                                <label className="text-xs text-azul-turquesa tracking-widest uppercase font-black">
                                    [ CONFIGURAR_HORARIOS_SEMANALES_DE_ACCESO ]
                                </label>
                                
                                {/* Estilo inyectado para la textura de la berja (rayas rojas de advertencia) */}
                                <style>{`
                                    .textura-berja {
                                        background-color: #111827;
                                        background-image: repeating-linear-gradient(45deg, #ef4444 0, #ef4444 2px, transparent 0, transparent 50%);
                                        background-size: 8px 8px;
                                        border-color: #ef4444 !important;
                                        color: #ef4444 !important;
                                        box-shadow: inset 0 0 10px rgba(239, 68, 68, 0.4);
                                    }
                                `}</style>

                                {/* Contenedor Grid de 7 Columnas */}
                                <div className="relative grid grid-cols-7 gap-2 border-4 border-texto bg-fondo p-4">
                                    
                                    {/* Imagen de fondo del panel */}
                                    <div className="absolute inset-0 opacity-25 pointer-events-none">
                                        <img
                                            src="https://i.pinimg.com/736x/29/59/9e/29599e739b0c39d64e9d17941f18b25b.jpg"
                                            alt="Fondo del panel de la matriz."
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    {/* Recorremos cada uno de los 7 días */}
                                    {matriz.map((filaHoras, dia) => {
                         
                                        
                                        return (
                                            <div key={dia} className="relative flex flex-col gap-2">
                                                
                                                {/* Cabecera del Día */}
                                                <div className="relative overflow-hidden border-2 border-bordes bg-paneles text-center py-2 border-b-4">
                                                    
                                                    {/* Imagen de fondo */}
                                                    <div className="absolute inset-0 opacity-40 pointer-events-none">
                                                        <img 
                                                            src="https://i.pinimg.com/control1/736x/cd/14/d6/cd14d6b7244c5579c8d5fe40e547ffb2.jpg" 
                                                            alt="Fondo día" 
                                                            className="w-full h-full object-cover" 
                                                        />
                                                    </div>
                                                    
                                                    {/* Texto del día */}
                                                    <span className="relative z-10 text-xs font-black tracking-widest text-texto">
                                                        {DIAS[dia]}
                                                    </span>
                                                </div>
                                                
                                                {/* Panel vertical de las horas (uno para cada día) */}
                                                <div className="flex flex-col gap-1 h-140 overflow-y-auto pr-2 scrollbar-thin select-none ">
                                                    {filaHoras.map((estado, hora) => {

                                                        // Formateamos las horas para que tengan todas el mismo formato
                                                        const horaStr = `${String(hora).padStart(2, '0')}:00`;
                                                        const horaStr2 = `${String(hora+1).padStart(2, '0')}:00`;
                                                        
                                                        return (
                                                            <div
                                                                key={hora}
                                                                onMouseDown={() => handleMouseDown(dia, hora)}
                                                                onMouseEnter={() => handleMouseEnter(dia, hora)}
                                                                className={`border border-bordes/64 p-2 text-center text-xs font-mono font-bold tracking-wider cursor-pointer select-none transition-all duration-150 ${
                                                                    estado === 1 
                                                                    ? 'border-red-500 bg-red-950/50 text-red-500 ]' 
                                                                    : 'bg-paneles text-texto hover:border-azul-turquesa hover:text-azul-turquesa'
                                                                }`}
                                                            >
                                                                {horaStr} {'-'} {horaStr2} {estado === 1 ? '[CERRADO]' : '[ABIERTO]'} 
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                            </div>
                                        );
                                    })}
                                </div>

                                {/* BOTÓN DE GUARDADO */}
                                <div className="flex justify-center mt-4">


                                    <button type="button" onClick={handleGuardarCrono} className="group relative overflow-hidden px-8 py-4 border-4 border-azul-turquesa bg-fondo text-azul-turquesa hover:bg-azul-turquesa hover:text-fondo font-black tracking-widest">
                                        
                                        {/* Imagen de fondo */}
                                        <div className="absolute inset-0 opacity-10 pointer-events-none">
                                            <img
                                                src="https://i.pinimg.com/736x/5f/c5/76/5fc5764f3f5126cf7866f24fc04f0a56.jpg"
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        <span className="relative z-10">
                                            [ GUARDAR_CAMBIOS ]
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}