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

    // ---DATOS DEL FORMULARIO DE INSERCIÓN---
    const [salaSeleccionada, setSalaSeleccionada] = useState("");
    const [contenido, setContenido] = useState("");
    const [fechaEnvio, setFechaEnvio] = useState("");

    // ---DATOS MODAL DE EDICION Y BORRADO---
    const [modalEdicion, setModalEdicion] = useState({ abierto: false, mensajeId: null });
    const [datosEdicion, setDatosEdicion] = useState({contenido: '', fecha_envio: ''});
    const [enviandoEdicion, setEnviandoEdicion] = useState(false);
    const [confirmarBorrado, setConfirmarBorrado] = useState(false);

    // ---DATOS COLA DE MENSAJES---
    const [colaMensajes, setColaMensajes] = useState([]);
    const [cargandoCola, setCargandoCola] = useState(false);
    const [cargandoSalas, setCargandoSalas] = useState(false);

    // ---DATOS CALCULO HORA---
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
            setColaMensajes(data.mensajes || []);
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

    // --- PARA LOS MODALES DE EDICION Y BORRADO ---
    
    //Abre el modal de edición y adapta el formato de la fecha del back al establecido en el front
    const abrirModalEdicion = (mensaje) => {
        const fechaObj = new Date(mensaje.fecha_envio);
        const anio = fechaObj.getFullYear();
        const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
        const dia = String(fechaObj.getDate()).padStart(2, '0');
        const horas = String(fechaObj.getHours()).padStart(2, '0');
        const minutos = String(fechaObj.getMinutes()).padStart(2, '0');

        setDatosEdicion({
            contenido: mensaje.contenido,
            fecha_envio: `${anio}-${mes}-${dia}T${horas}:${minutos}`
        })
        
        setModalEdicion({ abierto: true, mensajeId: mensaje.id });
    };

    // Envia el resultado de el formulario al backend
    const handleGuardarEdicion = async (e) => {
        e.preventDefault();
        setEnviandoEdicion(true);

        try{

           await fetchEditarMensajeProgramado(modalEdicion.mensajeId,{
                contenido: datosEdicion.contenido,
                fecha_envio: new Date(datosEdicion.fecha_envio).toISOString()
            });

            setModalEdicion({ abierto: false, mensajeId: null });
            await cargarMensajes(); // Refrescamos la cola 

        }catch(error){
            console.error("Error al editar el mensaje:", error);
        }finally{
            setEnviandoEdicion(false)
        }
    }

    // Elimina el mensaje programado 
    const handleEjecutarBorrado = async() =>{
        setEnviandoEdicion(true);

        try {

            await fetchEliminarMensajeProgramado(modalEdicion.mensajeId);

            setConfirmarBorrado(false);
            setModalEdicion({ abierto: false, mensajeId: null });

            await cargarMensajes(); // Refrescamos la cola 

        } catch (error){
            console.error("Error al cancelar el mensaje:", error);
        } finally{
            setEnviandoEdicion(false);
        }
    }


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

    // Genera la cadena de texto de tiempo actual para que no se pueda poner un tiempo anterior a este
    const obtenerFechaMinima = () => {
        const ahora = new Date();
        const anio = ahora.getFullYear();
        const mes = String(ahora.getMonth() + 1).padStart(2, '0');
        const dia = String(ahora.getDate()).padStart(2, '0');
        const horas = String(ahora.getHours()).padStart(2, '0');
        const minutos = String(ahora.getMinutes()).padStart(2, '0');
        
        return `${anio}-${mes}-${dia}T${horas}:${minutos}`;
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
    {/* submodal para el borrado */}
    {confirmarBorrado && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70">
            <div className="border-4 border-red-500 bg-fondo max-w-md p-6 text-center">
                <h4 className="text-xl text-red-500 font-black tracking-widest mb-4">
                    [ ¡CUIDADO! ]
                </h4>
                
                <p className="text-sm leading-relaxed mb-6">
                    ¿Seguro que quieres eliminar este mensaje programado? Esta acción es irreversible, no se enviará la información a Matrix.
                </p>

                <div className="flex justify-center gap-4">
                    <button 
                        type="button"
                        onClick={() => setConfirmarBorrado(false)}
                        className="px-6 py-2 border-2 border-bordes text-bordes hover:text-texto hover:border-texto font-bold tracking-widest"
                    >
                        CERRAR
                    </button>
                    
                    <button 
                        type="button"
                        disabled={enviandoEdicion}
                        onClick={handleEjecutarBorrado} 
                        className="px-6 py-2 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-fondo font-bold tracking-widest disabled:opacity-50"
                    >
                        {enviandoEdicion ? 'ELIMINADO...' : 'SÍ, ELIMINAR'}
                    </button>
                </div>
            </div>
        </div>
    )}

    {/* modal para la edición del mensaje */}
    {modalEdicion.abierto && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/80">
            <div className="border-4 border-texto bg-fondo w-full max-w-2xl p-8 ">
                <h3 className="text-2xl text-texto font-black tracking-widest border-b-2 border-bordes/50 pb-4 mb-6">
                    [ EDITAR_MENSAJE_PROGRAMADO ]
                </h3>
                
                <form onSubmit={handleGuardarEdicion} className="flex flex-col gap-6">
                    
                    {/* Para la fecha de envío */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-azul-turquesa tracking-widest">NUEVA_HORA:</label>
                        <input 
                            required
                            type="datetime-local" 
                            min={obtenerFechaMinima()}
                            className="bg-paneles border-2 border-bordes p-3 text-texto outline-none focus:border-azul-turquesa cursor-text"
                            value={datosEdicion.fecha_envio}
                            onChange={(e) => setDatosEdicion({ ...datosEdicion, fecha_envio: e.target.value })}
                        />
                    </div>

                    {/* para el mensaje */}
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                            <label className="text-xs text-azul-turquesa tracking-widest font-bold">NUEVO_MENSAJE:</label>
                            <span className="text-xs text-bordes font-mono">
                                {datosEdicion.contenido.length}/512
                            </span>
                        </div>
                        <textarea 
                            required
                            rows="4" 
                            maxLength={512}
                            className="bg-paneles border-2 border-bordes p-3 text-texto outline-none focus:border-azul-turquesa resize-none"
                            value={datosEdicion.contenido}
                            onChange={(e) => setDatosEdicion({...datosEdicion, contenido: e.target.value})}
                        />
                    </div>

                    {/* botones de acciones */}
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-bordes/50">
                        
                        {/* Botón de Eliminar  */}
                        <button 
                            type="button"
                            onClick={() => setConfirmarBorrado(true)}
                            className="px-4 py-2 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-fondo font-bold tracking-widest"
                        >
                            ELIMINAR
                        </button>

                        <div className="flex gap-4">
                            <button 
                                type="button"
                                onClick={() => {
                                    setModalEdicion({ abierto: false, mensajeId: null });
                                    setDatosEdicion({ contenido: '', fecha_envio: '' });
                                }}
                                className="px-6 py-2 border-2 border-bordes text-bordes hover:text-texto hover:border-texto font-bold tracking-widest"
                            >
                                CANCELAR
                            </button>
                            <button 
                                type="submit"
                                disabled={enviandoEdicion}
                                className="px-6 py-2 border-2 border-azul-turquesa text-azul-turquesa hover:bg-azul-turquesa hover:text-fondo font-bold tracking-widest transition-colors disabled:opacity-50"
                            >
                                {enviandoEdicion ? 'EJECUTANDO...' : 'GUARDAR_CAMBIOS'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )}

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
                        
                    <div className="flex-1 border-2 border-dashed border-azul-turquesa/50 bg-azul-turquesa/5 p-8 flex flex-col items-center justify-center text-center gap-6">
                        <h2 className="text-2xl lg:text-2xl text-azul-turquesa font-bold max-w-2xl leading-relaxed">
                            LA ASIGNATURA NO CONTIENE NINGUNA SALA OPERATIVA. <br />
                        </h2>
                        <p className="text-sm text-bordes max-w-xl">
                            Crea salas desde el [ GESTOR DE SALAS ] para poder automatizar sus horarios de acceso.
                        </p>
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
                                            {sala.nombre} ({sala.tipo === 'sala_avisos' ? 'Solo lectura' : 'Chat normal'})
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
                                    min={obtenerFechaMinima()}
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
                <div className="lg:col-span-5 flex flex-col gap-6 border-4 border-texto bg-paneles/40 p-6">
                    <h3 className="text-xl text-texto font-black tracking-widest border-b-2 border-bordes/50 pb-4 ">
                        [ TUS_MENSAJES_PROGRAMADOS ]
                    </h3>

                    {/* Contenedor para la lista de mensajes con scroll vertical*/}
                    <div className="flex flex-col gap-1 h-120 overflow-y-auto pr-2 scrollbar-thin select-none">

                        {cargandoCola ? (
                            // Pantalla de carga

                            <div className="flex-1 flex items-center justify-center text-texto animate-pulse tracking-widest font-bold">
                                [ LEYENDO_POSTGRESQL... ]
                            </div>
                        ) : colaMensajes.length === 0 ? (
                            //Si no hubiese mensajes programados

                            <div className="flex-1 flex items-center justify-center text-texto animate-pulse tracking-widest font-bold">
                                [ NO_HAY_MENSAJES_PENDIENTES ]
                            </div>
                        ) : (

                            /* Mapeo de la cola de mensajes  */
                            colaMensajes.map((mensaje) => {
                                const porcentaje = obtenerPorcentajeCarga(mensaje.fecha_creacion, mensaje.fecha_envio);
                                
                                return (
                                    <div 
                                        key={mensaje.id} 
                                        onClick={() => abrirModalEdicion(mensaje)}
                                        className="flex flex-col border-2 border-bordes bg-fondo p-4 gap-3 group hover:border-azul-turquesa cursor-pointer mb-2"
                                    >
                                        
                                        {/* Cabecera de la tarjeta */}
                                        <div className="flex justify-between border-b border-bordes pb-2">

                                            <div className="flex flex-col">
                                                <span className="text-sm text-azul-turquesa font-bold tracking-widest">
                                                    Mensaje_para: {mensaje.nombre_sala}
                                                </span>
                                                <span className="text-[10px] text-bordes font-mono mt-1">
                                                    TIPO: {mensaje.tipo_sala}
                                                </span>
                                            </div>

                                            <div className="text-right flex flex-col items-end">
                                                <span className="text-xs text-texto bg-paneles border border-bordes px-2 py-1 font-bold">
                                                    ENVIO: {new Date(mensaje.fecha_envio).toLocaleString('es-ES', { 
                                                        day: '2-digit', month: '2-digit', year: '2-digit', 
                                                        hour: '2-digit', minute:'2-digit' 
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Cuerpo del mensaje */}
                                        <div className="text-sm text-bordes font-mono line-clamp-2 italic">
                                            "{mensaje.contenido}"
                                        </div>
                                        
                                        {/* Barra de progreso */}
                                        <div className="flex items-center gap-4 mt-2">
                                            <span className="text-[10px] text-azul-turquesa tracking-widest font-bold">
                                                STATUS
                                            </span>
                                            
                                            {/* Contenedor del progreso */}
                                            <div className="flex-1 h-2 bg-paneles border border-bordes/50 relative overflow-hidden">
                                                <div 
                                                    className="absolute top-0 left-0 h-full bg-azul-turquesa transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(6,182,212,0.7)]"
                                                    style={{ width: `${porcentaje}%` }}
                                                ></div>
                                            </div>
                                            
                                            {/* Indicador numérico */}
                                            <span className="text-[10px] text-azul-turquesa font-black w-8 text-right">
                                                {Math.round(porcentaje)}%
                                            </span>
                                        </div>

                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>

  </div>
  );
}