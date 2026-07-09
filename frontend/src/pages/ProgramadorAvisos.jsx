import { useState, useEffect, use } from "react";
import { 
    fetchGetMensajesProgramados,  
    fetchCrearMensajeProgramado,
    fetchEditarMensajeProgramado,
    fetchEliminarMensajeProgramado,
    fetchAsignaturasPrado,
    fetchEstructuraSalas
} from "../services/api";

export default function ProgramadorAvisos(){

    // ---DATOS DE PRADO---
    const [asignaturas, setAsignaturas] = useState([]); //Guarda el array de asignaturas de un profesor
    const [activaIndex, setActivaIndex] = useState(0); //El iterador del array de asignaturas (para saber la asignatura actual)

    // ---DATOS DE MATRIX---
    const [salas, setSalas] = useState([]); // Guarda el array de salas de la asignatura actual
    
    // ---DATOS GESTIÓN INTERFAZ---
    const [cargando, setCargando] = useState(true); // Para bloquear la interfaz inicial mientras cargamos desde el servidor pa pagina entera
    const [direccion, setDireccion] = useState(null); // Para saber si a animación del carrusel superior es hacia la izq o la der

    // ---DATOS DEL FORMULARIO
    const [salaSeleccionada, setSalaSeleccionada] = useState("");
    const [contenido, setContenido] = useState("");
    const [fechaEnvio, setFechaEnvio] = useState("");

    // --DATOS COLA DE MENSAJES--
    const [colaMensajes, setColaMensajes] = useState([]);
    const [cargandoCola, setCargandoCola] = useState(false);
    const [cargandoSalas, setCargandoSalas] = useState(false);

    // --DATOS CALCULO HORA--
    const [horaActual, setHoraActual] = useState(new Date());

    // --VARIABLES PARA NAVEGACION Y CARGA--
    const len = asignaturas.length;
    const asigAnterior = len > 1 ? asignaturas[(activaIndex - 1 + len) % len] : null;
    const asigActual = asignaturas[activaIndex];
    const asigSiguiente = len > 1 ? asignaturas[(activaIndex + 1) % len] : null;


    // --- FUNCIONES DE CARGA ---

    // Carga las salas de la asignatura actual
    const cargarSalasAsignatura = async (asignaturaId) => {
        setCargandoSalas(true);
        try{
            // Obtenemos las salas y salas de avisos (no en espacios)
            const res = await fetchEstructuraSalas(asignaturaId);
            const todasLasSalas = res.salas || [];

            const salas = todasLasSalas.filter((sala) => {
                return sala.tipo === "sala" || sala.tipo === "sala_avisos";
            });

            setSalas(salas);
            if(salas.length > 0){

                setSalaSeleccionada(salas[0].id); // Cojemos por defecto la primera
            } else{

                setSalaSeleccionada("");
            }

        } catch (error){
            console.error("Error cargando las salas de la asignatura: ", error);
        } finally{
            setCargandoSalas(false);
        }
    };

    // Carga los mensajes 
    const cargarMensajes = async () => {
        setCargandoCola(true);
        try{
            const data = await fetchGetMensajesProgramados();
            setColaMensajes(data);
        }catch(error){
            console.error("Error leyendo cola de salida: ", error);
        }finally{
            setCargandoCola(false);
        }
        
    };

    // --- INICIALIZACIÓN ---
    useEffect(() => {
        const init = async () => {
            try{
                // 1. Cargamos asignaturas y mensajes
                const [asigData] = await Promise.all([
                    fetchAsignaturasPrado(),
                    cargarMensajes() 
                ]);
                
                setAsignaturas(asigData);

                // 2. Si la primera asignatura está sincronizada, pedimos sus salas
                if(asigData.length > 0 && asigData[0].sincronizada){
                    await cargarSalasAsignatura(asigData[0].id);
                }

            } catch (error){
                console.error("Error en la inicialización:", error);
            } finally {
                setCargando(false);
            }
        };
        init();
    }, []);

    // --- TEMPORIZADOR CADA MINUTO ---
    useEffect(() => {
        const timer = setInterval(() => setHoraActual(new Date()), 60000); 
        return () => clearInterval(timer);
    }, []);

    // --- NAVEGACIÓN CARRUSEL ---

    const cambiarAsignatura = (nuevoIndex, direccionAnimacion) => {
        setDireccion(direccionAnimacion);
        setActivaIndex(nuevoIndex);
        setSalas([]);
        setSalaSeleccionada("");

        const nuevaAsig = asignaturas[nuevoIndex];
        if (nuevaAsig && nuevaAsig.sincronizada) {
            cargarSalasAsignatura(nuevaAsig.id);
        }
    };

    const irAnterior = () => {
        const nuevoIndex = activaIndex === 0 ? len - 1 : activaIndex - 1;
        cambiarAsignatura(nuevoIndex, 'izq');
    };

    const irSiguiente = () => {
        const nuevoIndex = activaIndex === len - 1 ? 0 : activaIndex + 1;
        cambiarAsignatura(nuevoIndex, 'der');
    };

    // --- FUNCIONES LÓGICA PRINCIPAL ---


    // fución que se ejecuta para enviar los datos del formulario
    const handleCrearMensaje = async (e) =>{
        e.preventDefault();
        if (!salaSeleccionada || !contenido.trim() || !fechaEnvio) {
            alert("Rellena todos los parámetros del payload.");
            return;
        }

        const datosMensaje = {
            sala_id: parseInt(salaSeleccionada),
            contenido: contenido,
            fecha_envio: new Date(fechaEnvio).toISOString() 
        };

        try{
            await fetchCrearMensajeProgramado(datosMensaje);
            setContenido("");
            setFechaEnvio("");
            await cargarMensajes(); // Refrescamos la cola
        } catch (error) {
            console.error("Error al crear el mensaje:", error);
        } 
    };

    // funcion para obtener el porentaje de la barra de carga
    const obtenerPorcentajeCarga = (fechaCreacion, fechaDestino) => {
        const inicio = new Date(fechaCreacion).getTime();
        const fin = new Date(fechaDestino).getTime();
        const ahora = horaActual.getTime();

        if (ahora >= fin) return 100;
        if (ahora <= inicio) return 0;

        return ((ahora - inicio) / (fin - inicio)) * 100;
    };

    // Para cuando este cargando la pestaña
    if (cargando) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border border-dashed border-bordes bg-paneles tracking-widest text-azul-turquesa animate-pulse">
                [// LEYENDO_SISTEMA_DE_ARCHIVOS_PRADO_MATRIX...]
            </div>
        );
    }

    // Si no tuviese asignaturas asignadas mostramos un mensaje que lo indique
    if (asignaturas.length === 0) {
        return (
            <div className="text-center p-12 border-4 border-dashed border-bordes text-xl font-black text-bordes tracking-widest">
                [ NO_TIENE_ASIGNATURAS_ASIGNADAS ]
            </div>
        );
    }
  
  return(
  <div className="flex flex-col gap-8 font-mono min-h-full p-4">

    {/* TÍTULO */}
    <h2 className="text-3xl text-texto font-black  tracking-widest border-b-4 border-texto pb-4 ]">
        [ TU_PROGRAMADOR_DE_AVISOS ]
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
          `}</style>

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

    {/* ZONA INFERIOR */}
    <div className="flex flex-col flex-1">
        {!asigActual?.sincronizada ? (

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

        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">

                {/* Columna izquierda, formulario (40%)*/}
                <div className="lg:col-span-5 flex flex-col gap-6 border-4 border-texto bg-paneles/40 p-6">
                    
                    <h3 className="text-xl text-texto font-black tracking-widest border-b-2 border-bordes/50 pb-4 ">
                        [ INSERTAR_MENSAJE_PROGRAMADO ]
                    </h3>

                    {/* Pantalla de carga para las cargar las salas*/}
                    {cargandoSalas ? (

                        <div className="flex-1 flex items-center justify-center text-texto animate-pulse">
                            [ BUSCANDO_NODOS_DE_COMUNICACIÓN... ]
                        </div>

                    ) : salas.length === 0 ? ( // Si no hubiese salas en la asignatura
                        
                        <div className="flex-1 flex flex-col items-center justify-center text-center text-red-500 font-bold border-2 border-dashed border-red-500/50 p-4 gap-2">
                            <span className="text-sm text-bordes">No hay salas disponibles en esta asignatura para enviar avisos.</span>
                        </div>

                    ) : ( // Mostramos el formulario
                        <form onSubmit={handleCrearMensaje} className="flex flex-col gap-6 flex-1">
                            
                            {/* 1. Seleccionamos la sala (modal) */}
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-azul-turquesa tracking-widest">SALA_DESTINO</label>
                                <select 
                                    value={salaSeleccionada}
                                    onChange={(e) => setSalaSeleccionada(e.target.value)}
                                    className="bg-paneles border-2 border-bordes p-3 text-texto outline-none focus:border-azul-turquesa cursor-pointer"
                                >
                                    {salas.map((sala) => (
                                        <option key={sala.id} value={sala.id}>
                                            {sala.nombre} ({sala.tipo === 'sala_avisos' ? 'Lectura' : 'Chat'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 2. Seleccionamos el día y la hora (fecha) */}
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-azul-turquesa tracking-widest">HORA_ENVIO</label>
                                <input 
                                    type="datetime-local" 
                                    value={fechaEnvio}
                                    onChange={(e) => setFechaEnvio(e.target.value)}
                                    className="bg-paneles border-2 border-bordes p-3 text-texto outline-none focus:border-azul-turquesa cursor-text [color-scheme:dark]"
                                />
                            </div>

                            {/* 3. contenido del mensaje */}
                            <div className="flex flex-col gap-2 flex-1">
                                <div className="flex justify-between items-end">
                                    <label className="text-sm text-azul-turquesa tracking-widest">CONTENIDO_MENSAJE</label>
                                    <span className="text-xs text-bordes font-mono">
                                        {contenido.length}/512
                                    </span>
                                </div>
                                <textarea 
                                    maxLength={512}
                                    value={contenido}
                                    onChange={(e) => setContenido(e.target.value)}
                                    placeholder="Escribe el mensaje..."
                                    className="bg-paneles border-2 border-bordes p-3 text-texto outline-none focus:border-azul-turquesa resize-none flex-1 min-h-[150px]"
                                />
                            </div>

                            {/* botón de confirmación */}
                            <div className="flex justify-end pt-4 border-t border-bordes/50 mt-auto">
                                <button 
                                    type="submit" 
                                    disabled={!salaSeleccionada || !contenido.trim() || !fechaEnvio}
                                    className="px-6 py-2 border-2 border-azul-turquesa text-azul-turquesa hover:bg-azul-turquesa hover:text-fondo font-bold tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    CONFIRMAR_MENSAJE
                                </button>
                            </div>
                        </form>
                    )}
                </div>
                
                {/* Columna intermedia, formulario (10%)*/}
                <div className="hidden lg:flex lg:col-span-2 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-50 pointer-events-none">
                        <img 
                            src="https://i.pinimg.com/1200x/f6/44/a4/f644a4996816b501b95b2605f33921b4.jpg" 
                            alt="Columna central" 
                            className="w-full h-full object-cover" 
                        />
                    </div>
                </div>
                {/* Columna derecha, formulario (50%)*/}
                <div className="lg:col-span-5 flex flex-col gap-6 border-2 border-bordes bg-paneles p-6">


                </div>
            </div>
        )}
    </div>

  </div>
  );
}