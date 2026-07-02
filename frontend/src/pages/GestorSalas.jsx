import {useState, useEffect} from 'react';
import { fetchAsignaturasPrado, fetchEstructuraSalas, fetchCrearSala, fetchEditarSala, fetchEliminarSala} from '../services/api';

// Componente para dibujar el árbol
const NodoArbol = ({ nodo, nivel = 0 , abrirModalCrearNodo, abrirModalEditarNodo}) => {
  const esEspacio = nodo.tipo === 'espacio';
  const numHijos = (nodo.hijos?.length || 0) + 1; //El numero de salas mas el nodo de añadir (+)

  return (
    <div className="flex flex-col">
      
      {/* Nodo principal */}
      <div className="flex justify-center ">
        <div 
        onClick={(e) => {
            e.stopPropagation();
            abrirModalEditarNodo(nodo);
        }}
        className="group relative flex flex-col justify-center text-center overflow-hidden border-2 cursor-pointer rounded-full w-40 h-40 border-texto duration-200 hover:border-azul-turquesa hover:shadow-[0_0_20px_var(--color-azul-turquesa)] bg-paneles z-10">
          
          {/* Imagen de fondo del nodo */}
          <div className="absolute opacity-50 pointer-events-none">
            <img 
              src={esEspacio 
                ? "https://i.pinimg.com/736x/cb/25/1b/cb251b7b8ab7be51f69067da26770afb.jpg" //Si es un espacio
                : "https://i.pinimg.com/736x/fd/0a/88/fd0a886a160facf6c2de40b690019a36.jpg" //Si es una sala
              }
              alt="Fondo nodo" 
              className="w-full h-full object-cover" 
            />
          </div>

          {/* Textos del nodo */}
          <span className="relative z-10 font-bold tracking-widest text-sm text-texto duration-200 group-hover:text-azul-turquesa">
            {nodo.nombre}
          </span>
          <span className="relative z-10 text-[10px] text-bordes tracking-widest mt-1">
            {nodo.tipo}
          </span>
        </div>
      </div>

      {/* jerarquía de líneas e hijos*/}
      {esEspacio && (
        <div className="relative flex justify-center pt-8 mt-2">
          
          {/* Tronco que baja del padre */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-8 bg-bordes/50"></div>

          {/* Cargamos todos los hijos */}
          {nodo.hijos?.map((hijo, index) => {
            const isFirst = index === 0;
            return (
              <div key={hijo.id} className="relative flex flex-col pt-8 px-1">
                
                {/* Linea horizontal: Si hay más de 1 elemento, dibujamos la línea. Si es el primero, va de la mitad a la derecha. Si es del medio, completa. */}
                {numHijos > 1 && (
                  <div className={`absolute top-0 h-px bg-bordes/50 ${isFirst ? 'left-1/2 right-0' : 'left-0 right-0'}`}></div>
                )}
                
                {/* Rama vertical que baja hacia el hijo concreo */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-8 bg-bordes/50"></div>

                {/* Pintamos el hijo con recursividad*/}
                <NodoArbol 
                  nodo={hijo} 
                  nivel={nivel + 1} 
                  abrirModalCrearNodo={abrirModalCrearNodo} 
                  abrirModalEditarNodo={abrirModalEditarNodo}
                />
              </div>
            );
          })}

          {/* 3El nodo de añadir es el último */}
          <div className="relative flex flex-col pt-8 px-1">
            
            {/* Línea horizontal*/}
            {numHijos > 1 && (
              <div className="absolute top-0 left-0 right-1/2 h-px bg-bordes/50"></div>
            )}
            
            {/* Rama vertical que baja hacia el botón de añadir */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-8 bg-bordes/50"></div>

            <div className="flex items-center justify-center">
              <div 
                className="group relative flex flex-col justify-center text-center overflow-hidden border-2 cursor-pointer rounded-full w-40 h-40 border-texto duration-200 hover:border-azul-turquesa hover:shadow-[0_0_20px_var(--color-azul-turquesa)] bg-paneles z-10"
                onClick={() => abrirModalCrearNodo(nodo.room_id)}
              >
                <span className="relative z-10 font-bold tracking-widest text-4xl text-texto duration-200 group-hover:text-azul-turquesa">
                  +
                </span>
                <span className="relative z-10 text-[10px] text-bordes tracking-widest mt-1">
                  Nueva Sala
                </span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default function GestorSalas(){
    // ---DATOS DE PRADO---
    const [asignaturas, setAsignaturas] = useState([]); //Guarda el array de asignaturas de un profesor
    const [activaIndex, setActivaIndex] = useState(0); //El iterador del array de asignaturas (para saber la asignatura actual)

    // ---DATOS DE MATRIX---
    const [salas, setSalas] = useState([]); // Guarda el array de salas de la asignatura actual

    // ---DATOS GESTIÓN INTERFAZ---
    const [cargando, setCargando] = useState(true); // Para bloquear la interfaz inicial mientras cargamos desde el servidor pa pagina entera
    const [cargandoSalas, setCargandoSalas] = useState(false); // Lo mismo pero sobre el panel de salas de la asignatura actual
    const [direccion, setDireccion] = useState(null); // Para saber si a animación del carrusel superior es hacia la izq o la der

    // ---DATOS GESTIÓN FORMULARIO---
    const [modalConfig, setModalConfig] = useState({ abierto: false, modo: 'crear', id_padre: null, room_id: null });    
    const [formSala, setFormSala] = useState({ nombre: '', descripcion: '', tipo: 'sala', auto_añadir: false }); // Guarda los datos del formulario en tiempo real
    const [enviandoSala, setEnviandoSala] = useState(false); // Para desactivar el boton de crear una vez que se le ha dado, mientras se realiza la peticion (evita que se le 2 veces)

    // ---DATOS GESTIÓN BORRADO---
    const [confirmarBorrado, setConfirmarBorrado] = useState({ abierto: false, tieneHijos: false });

    // Función auxiliar para cargar la estructura de salas de una asignatura
    const cargarEstructura = async (asignaturaId) => {
      try{
          const respuesta = await fetchEstructuraSalas(asignaturaId); // Obtenemos las salas de la asignatura especificada
          setSalas(respuesta.salas || []); // Si no tuviese ninguna sala o hubiese algun fallo, definimos el vector como vacío []

      }catch (error){
          console.error("Error cargando estructura de salas:", error);

      }finally{
          setCargandoSalas(false); // Dejamos de bloquear la interfaz y mostramos las salas
      }
    };

    // Use effect para cargar las asingaturas del profesor, flujo inicial de la pantalla
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
                console.error("Error cargando asignaturas:", error);
            } finally {
                setCargando(false);
            }
        };
        init();
    }, []);

    // Función para manejar que se abra el modal en modo edidición
    const handleAbrirModalEditar = (nodo) => {

      setModalConfig({
          abierto: true,
          modo: 'editar',
          id_padre: nodo.id_padre,
          room_id: nodo.room_id 
      });

      setFormSala({
          nombre: nodo.nombre,
          descripcion: nodo.descripcion || '', 
          tipo: nodo.tipo,
          auto_añadir: false 
      });
    }

    // Función que se ejecuta al darle al botón de confirmar en el formulario (tanto para el de editar como el de añadir)
    const handleGuardarFormulario = async (e) => {
        e.preventDefault();
        setEnviandoSala(true); // Desactiva el botón de guardar mientras el servidor está realizando operaciones
        const asigActual = asignaturas[activaIndex];

        try {
          if(modalConfig.modo === 'crear'){

              await fetchCrearSala(asigActual.id, {
                  nombre: formSala.nombre,
                  descripcion: formSala.descripcion,
                  tipo: formSala.tipo,
                  id_padre: modalConfig.id_padre,
                  auto_añadir: formSala.auto_añadir
              });

          }else{

              await fetchEditarSala(asigActual.id, modalConfig.room_id, {
                  nombre: formSala.nombre,
                  descripcion: formSala.descripcion,
                  tipo: formSala.tipo
              });

          }

          // Ejecutamos las operaciones
          setModalConfig({ abierto: false, modo: 'crear', id_padre: null, room_id: null });
          setFormSala({ nombre: '', descripcion: '', tipo: 'sala', auto_añadir: false });
          cargarEstructura(asigActual.id);

        } catch (error){

            alert("Error al crear/editar la sala: " + error.message);
        } finally{

            setEnviandoSala(false); // Volvemos a habilitar el botón de guardar
        }
    };

    // Ejetuta la petición de borrar
    const handleConfirmarBorradoNodo = async () =>{
      setEnviandoSala(true);
      const asigActual = asignaturas[activaIndex];

      try{
        await fetchEliminarSala(asigActual.id, modalConfig.room_id);
        setConfirmarBorrado({ abierto: false, tieneHijos: false });
        setModalConfig({ abierto: false, modo: 'crear', id_padre: null, room_id: null });
        setFormSala({ nombre: '', descripcion: '', tipo: 'sala', auto_añadir: false });
        cargarEstructura(asigActual.id);

      }catch (error){
          alert("Error al eliminar el nodo: " + error.message);
      }finally{

          setEnviandoSala(false);
      }

    }

    // Esta función convierte un array plano (Ej: [{id: 1, padre: null}, {id: 2, padre: 1}] en una estructura jerráquica (Ej: [{id: 1, hijos: [{id: 2}]}])
    const construirArbol = (lista) =>{
        const mapa = {};
        const raices = [];

        lista.forEach(sala => { mapa[sala.room_id] = { ...sala, hijos: [] }; });
        lista.forEach(sala => {

            if (sala.id_padre && mapa[sala.id_padre]) {

                mapa[sala.id_padre].hijos.push(mapa[sala.room_id]);
            } else {

                raices.push(mapa[sala.room_id]);
        }
        });
        return raices;
    };

    const arbolSalas = construirArbol(salas); // Ejecutamos la función cada vez que el estado de las salas se modifique
 
    // Funciones para navegar en el carrusel 
    const irAnterior = () => {
        setDireccion('izq');

        const nuevoIndex = activaIndex === 0 ? asignaturas.length - 1 : activaIndex - 1; // Calculamos el nuevo indice de la asignatura 

        setActivaIndex(nuevoIndex);
        setSalas([]);   // Limpiamos el arbol visual

        const nuevaAsig = asignaturas[nuevoIndex];
        if (nuevaAsig && nuevaAsig.sincronizada) {
            setCargandoSalas(true);
            cargarEstructura(nuevaAsig.id);
        }
    };

    const irSiguiente = () => {
        setDireccion('der');

        const nuevoIndex = activaIndex === asignaturas.length - 1 ? 0 : activaIndex + 1; // Calculamos el nuevo indice de la asignatura

        setActivaIndex(nuevoIndex);
        setSalas([]);   // Limpiamos el arbol visual

        const nuevaAsig = asignaturas[nuevoIndex];
        if (nuevaAsig && nuevaAsig.sincronizada) {
            setCargandoSalas(true);
            cargarEstructura(nuevaAsig.id);
        }
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
  const len = asignaturas.length;
  const asigAnterior = len > 1 ? asignaturas[(activaIndex - 1 + len) % len] : null;
  const asigActual = asignaturas[activaIndex];
  const asigSiguiente = len > 1 ? asignaturas[(activaIndex + 1) % len] : null;

  
  const nodoActualEnEdicion = salas.find(s => s.room_id === modalConfig.room_id);
  const tieneHijosElNodoEdicion = nodoActualEnEdicion?.id_padre === null || (salas.filter(s => s.id_padre === modalConfig.room_id).length > 0);

  return( 
  <div className="flex flex-col gap-8 font-mono min-h-full p-4">

{/* SUB-MODAL DE CONFIRMACIÓN DE BORRADO */}
    {confirmarBorrado.abierto && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70">
            <div className="border-4 border-red-500 bg-fondo max-w-md p-6 text-center">
                <h4 className="text-xl text-red-500 font-black tracking-widest mb-4">
                    {!tieneHijosElNodoEdicion ? '[ ¡CUIDADO! ]' : '[ ACCIÓN_BLOQUEADA ]'}
                </h4>
                
                {/* Vemos si es un espacio con hijos */}
                {tieneHijosElNodoEdicion ? (
                    <p className="text-sm leading-relaxed mb-6 font-mono">
                        Para borrar un espacio con salas, debes primero eliminar todas sus subsalas. El sistema no permite dejar salas huérfanas.
                    </p>
                ) : (
                    <p className="text-sm leading-relaxed mb-6">
                        ¿Seguro que quieres eliminar esta sala? Esta acción es irreversible, borrando la sala junto todo su historial por completo.
                    </p>
                )}

                <div className="flex justify-center gap-4">
                    <button 
                        type="button"
                        onClick={() => setConfirmarBorrado({ abierto: false, tieneHijos: false })}
                        className="px-6 py-2 border-2 border-bordes text-bordes hover:text-texto hover:border-texto font-bold tracking-widest"
                    >
                        CERRAR
                    </button>
                    
                    {/* El botón de borrar solo se habilita si no tiene hijos */}
                    {!tieneHijosElNodoEdicion && (
                        <button 
                            type="button"
                            disabled={enviandoSala}
                            onClick={handleConfirmarBorradoNodo}
                            className="px-6 py-2 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-fondo font-bold tracking-widest disabled:opacity-50"
                        >
                            {enviandoSala ? 'ELIMINADO...' : 'SÍ, ELIMINAR'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )}

    {/* PARA LOS MODALES DE LOS FORMULARIOS DE EDITAR/CREAR */}
    {modalConfig.abierto && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/80">
            <div className="border-4 border-texto bg-fondo w-full max-w-2xl p-8">
                <h3 className="text-2xl text-texto font-black tracking-widest border-b-2 border-bordes/50 pb-4 mb-6">
                    {modalConfig.modo === 'crear' ? '[ CREAR_NODO ]' : '[ EDITAR_NODO ]'}
                </h3>
                
                <form onSubmit={handleGuardarFormulario} className="flex flex-col gap-6">
                    {/* Para el nombre */}
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                            <label className=" text-azul-turquesa tracking-widest">NOMBRE_DE_SALA</label>
                            {/* Contador de caracteres */}
                            <span className="text-xs text-bordes font-mono">
                                {formSala.nombre.length}/40
                            </span>
                        </div>
                        <input 
                            required
                            type="text"
                            maxLength={40} 
                            className="bg-paneles border-2 border-bordes p-3 text-texto outline-none focus:border-azul-turquesa"
                            value={formSala.nombre}
                            onChange={(e) => setFormSala({...formSala, nombre: e.target.value})}
                        />
                    </div>

                    {/* Para la descripción */}
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                            <label className=" text-azul-turquesa tracking-widest">DESCRIPCIÓN </label>
                            {/* Contador de caracteres */}
                            <span className="text-xs text-bordes font-mono">
                                {formSala.descripcion.length}/255
                            </span>
                        </div>
                        <textarea 
                            required
                            rows="4" 
                            maxLength={255}
                            className="bg-paneles border-2 border-bordes p-3 text-texto outline-none focus:border-azul-turquesa resize-none"
                            value={formSala.descripcion}
                            onChange={(e) => setFormSala({...formSala, descripcion: e.target.value})}
                        />
                    </div>

                    {/* Select: Tipo */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-azul-turquesa tracking-widest">TIPO_DE_NODO</label>
                        <select 
                            disabled={modalConfig.modo === 'editar' && formSala.tipo === 'espacio'}
                            className="bg-paneles border-2 border-bordes p-3 text-texto outline-none focus:border-azul-turquesa cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            value={formSala.tipo}
                            onChange={(e) => setFormSala({...formSala, tipo: e.target.value})}
                        >
                            {/* Si es un espacio y estamos editando, solo mostramos la opción espacio */}
                            {modalConfig.modo === 'editar' && formSala.tipo === 'espacio' ? (
                                <option value="espacio">ESPACIO (Contenedor de Salas)</option>

                            
                            ) :( 
                                <>
                                    <option value="sala">SALA (Chat Normal)</option>
                                    <option value="sala_avisos">SALA_DE_AVISOS (Solo lectura)</option>
                                    {/* Solo permitimos crear espacios nuevos, este modal no se encuentra en el modo edicin */}
                                    {modalConfig.modo === 'crear' && (
                                        <option value="espacio">ESPACIO (Contenedor de Salas)</option>
                                    )}
                                </>
                            )}
                            
                        </select>
                    </div>

                    {/* Checkbox: Para insertar a los alumnos (solo se muestra en el modo de crear) */}
                    {modalConfig.modo === 'crear' && (
                        <div className="flex items-center gap-4 mt-2">
                            <input 
                                type="checkbox" 
                                id="auto_añadir"
                                className="w-5 h-5 accent-azul-turquesa cursor-pointer"
                                checked={formSala.auto_añadir}
                                onChange={(e) => setFormSala({...formSala, auto_añadir: e.target.checked})}
                            />
                            <label htmlFor="auto_añadir" className="text-sm text-texto cursor-pointer select-none">
                                Forzar matriculación automática de alumnos
                            </label>
                        </div>
                    )}

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-bordes/50">
                        
                        {/* Botón de Eliminar (solo se muestra en el botón de editar) */}
                        {modalConfig.modo === 'editar' ? (
                            <button 
                                type="button"
                                onClick={() => setConfirmarBorrado({ abierto: true, tieneHijos: tieneHijosElNodoEdicion })}
                                className="px-4 py-2 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-fondo font-bold tracking-widest"
                            >
                                ELIMINAR NODO
                            </button>
                        ) : (
                            <div></div> //Div vacío para empujar los demás botones a la derecha
                        )}

                        <div className="flex gap-4">
                            <button 
                                type="button"
                                onClick={() => {
                                    setModalConfig({ abierto: false, modo: 'crear', id_padre: null, room_id: null });
                                    setFormSala({ nombre: '', descripcion: '', tipo: 'sala', auto_añadir: false });
                                }}
                                className="px-6 py-2 border-2 border-bordes text-bordes hover:text-texto hover:border-texto font-bold tracking-widest"
                            >
                                CANCELAR
                            </button>
                            <button 
                                type="submit"
                                disabled={enviandoSala}
                                className="px-6 py-2 border-2 border-azul-turquesa text-azul-turquesa hover:bg-azul-turquesa hover:text-fondo font-bold tracking-widest transition-colors disabled:opacity-50"
                            >
                                {enviandoSala ? 'EJECUTANDO...' : 'GUARDAR_CAMBIOS'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )}
    
    {/* TÍTULO */}
    <h2 className="text-3xl text-texto font-black  tracking-widest border-b-4 border-texto pb-4 ]">
        [ TU_ARBOL_DE_SALAS ]
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
          
) : (
          /* Si la asignatura está sincronizada */
          <div className="border-4 border-texto bg-fondo  relative">
            <div className="absolute inset-0 opacity-25 pointer-events-none">
              {/* Imagen para el fondo*/}
              <img 
                src="https://i.pinimg.com/736x/c6/e5/5d/c6e55deb95d37b0be10290c0b2970a15.jpg" 
                alt="Fondo seccion arbol" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="relative z-10 p-8 min-h-full overflow-x-auto">
              {cargandoSalas ? (

                <p className="text-texto text-center font-bold tracking-widest mt-12">
                  [ LEYENDO_JERARQUÍA_MATRIX_DE_SALAS... ]
                </p>
              ) : arbolSalas.length === 0 ? (

                <div className="text-texto text-center font-bold tracking-widest mt-12">
                  [ NO_SE_HAN_ENCONTRADO_NODOS_EN_TU_JERARQUÍA_DE_SALAS ]
                </div>
              ) : (
                <div className="min-w-max">
                  {arbolSalas.map((raiz) => (
                    <NodoArbol 
                        key={raiz.id} 
                        nodo={raiz} 
                        abrirModalCrearNodo={(idPadre) => setModalConfig({ abierto: true, modo: 'crear', id_padre: idPadre, room_id: null })} 
                        abrirModalEditarNodo={handleAbrirModalEditar}
                    />                  
                  ))}
                </div>
              )}
            </div>
          </div>
          
        )}
        </div>
  </div>
  );

}