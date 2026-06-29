import {useState, useEffect} from 'react';
import { fetchAsignaturasPrado, fetchEstructuraSalas } from '../services/api';

// Componente para dibujar el árbol
const NodoArbol = ({ nodo, nivel = 0 }) => {
  const esEspacio = nodo.tipo === 'espacio';
  const numHijos = (nodo.hijos?.length || 0) + 1; // Contamos las salas + 1 (el botón de añadir)

  return (
    <div className="flex flex-col">
      
      {/* Nodo principal */}
      <div className="flex justify-center ">
        <div className="group relative flex flex-col justify-center text-center overflow-hidden border-2 cursor-pointer rounded-full w-40 h-40 border-texto duration-200 hover:border-azul-turquesa hover:shadow-[0_0_20px_var(--color-azul-turquesa)] bg-paneles z-10">
          
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
                <NodoArbol nodo={hijo} nivel={nivel + 1} />
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
                onClick={() => console.log('Añadir nueva sala colgando de:', nodo.room_id)}
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
    const [asignaturas, setAsignaturas] = useState([]);
    const [activaIndex, setActivaIndex] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [direccion, setDireccion] = useState(null);
    const [salas, setSalas] = useState([]);
    const [cargandoSalas, setCargandoSalas] = useState(false);


    // 1. Use effect para cargar las asingaturas del profesor
    useEffect(() => {
        const init = async () => {
            try {
                const asigData = await fetchAsignaturasPrado();
                setAsignaturas(asigData);
            } catch (error) {
                console.error("Error cargando asignaturas:", error);
            } finally {
                setCargando(false);
            }
        };
        init();
    }, []);

    // 2. Use effect para pedir la estructura de salas de la asignatura dada
    useEffect(() => {

        if(asignaturas.length === 0) return;

        const asigActual = asignaturas[activaIndex];

        // Cargamos el arbol de la asignatura si esta sincronizada
        if (asigActual && asigActual.sincronizada){

                const cargarSalas = async () => {

                setCargandoSalas(true);
                try {

                    const respuesta = await fetchEstructuraSalas(asigActual.id);
                    setSalas(respuesta.salas || []);
                } catch (error) {

                    console.error("Error cargando estructura de salas:", error);
                } finally {

                    setCargandoSalas(false);
                }
            };
            cargarSalas();
        }
    }, [activaIndex, asignaturas]);

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

    const arbolSalas = construirArbol(salas);
 
    // Funciones para navegar en el carrusel 
    const irAnterior = () => {
        setDireccion('izq');
        setActivaIndex((prev) => (prev === 0 ? asignaturas.length - 1 : prev - 1));
        setSalas([]);   // Limpiamos el arbol visual
    };

    const irSiguiente = () => {
        setDireccion('der');
        setActivaIndex((prev) => (prev === asignaturas.length - 1 ? 0 : prev + 1));
        setSalas([]);   // Limpiamos el arbol visual

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

  return( 
  <div className="flex flex-col gap-8 font-mono min-h-full p-4">
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
                  <span className="text-xs text-bordes tracking-widest">ID_PRADO: #{asigAnterior.id} | {asigAnterior.usuarios} Usuarios</span>
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
                  <span className="text-xs text-bordes tracking-widest">ID_PRADO: #{asigSiguiente.id} | {asigSiguiente.usuarios} Usuarios</span>
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
              <div className="w-3 h-3 bg-azul-turquesa animate-ping rounded-full"></div>
              <p className="text-xs text-azul-turquesa tracking-widest border border-azul-turquesa px-3 py-1 shadow-azul">
                Status // Matrix_Disconnected
              </p>
              <div className="w-3 h-3 bg-azul-turquesa animate-ping rounded-full"></div>
            </div>
            
            <h2 className="text-2xl lg:text-3xl text-texto font-bold max-w-2xl leading-relaxed">
              TODAVÍA NO HEMOS SINCRONIZADO NINGUNA ASIGNATURA. <br />
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
                    <NodoArbol key={raiz.id} nodo={raiz} />
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