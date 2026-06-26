import {useState, useEffect} from 'react';
import { fetchAsignaturasPrado, fetchEstructuraSalas } from '../services/api';

// COmponente para dibujar el arbol
const NodoArbol = ({ nodo, nivel = 0 }) => {
  return (
    <div className="flex flex-col items-center">
      
      {/* 1. EL NODO ACTUAL */}
      <div className="flex items-center justify-center py-4">
        {/* nodos */}
        <div className="group relative flex flex-col items-center justify-center text-center overflow-hidden border-2 cursor-pointer rounded-full w-40 h-40 border-texto duration-200 hover:border-azul-turquesa hover:shadow-[0_0_20px_var(--color-azul-turquesa)] shrink-0">
          
          {/* Imagen de fondo del nodo */}
          <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
            <img 
              src="https://i.pinimg.com/736x/33/94/81/339481462b4ce55efbcfc74321eb1db1.jpg" 
              alt="Fondo nodo" 
              className="w-full h-full object-cover" 
            />
          </div>

          {/* Textos del nodo*/}
          <span className="relative z-10 font-bold tracking-widest text-sm text-texto duration-200 group-hover:text-azul-turquesa">
            {nodo.nombre}
          </span>
          <span className="relative z-10 text-[10px] text-bordes tracking-widest mt-1">
            {nodo.tipo}
          </span>
        </div>
      </div>

      {/* Separamos los nodos por un alinea fina gris */}
      <div className="flex items-start justify-center gap-8 pt-4 border-t border-bordes/30 w-full min-w-full">
        
        {/*Cargamos todos los hijos*/}
        {nodo.hijos?.map((hijo) => (
          <NodoArbol key={hijo.id} nodo={hijo} nivel={nivel + 1} />
        ))}

        {/* nodo para añadir */}
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center py-4">
            <div 
              className="group flex flex-col items-center justify-center text-center border-2 border-dashed cursor-pointer rounded-full w-40 h-40 border-bordes duration-200 hover:border-texto"
              onClick={() => console.log('Añadir nueva sala colgando de:', nodo.room_id)}
            >
              <span className="font-black text-4xl text-bordes duration-200 group-hover:text-texto">
                +
              </span>
              <span className="text-[10px] text-bordes tracking-widest mt-2  duration-200 group-hover:text-texto">
                Nueva Sala
              </span>
            </div>
          </div>
        </div>

      </div>

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
          <div className="flex-1 border-4 border-texto bg-fondo p-8">
            {cargandoSalas ? (

              <p className="text-texto text-center font-bold tracking-widest mt-12">
                [ LEYENDO_JERARQUÍA_MATRIX_DE_SALAS... ]
              </p>
            ) : arbolSalas.length === 0 ? (

              <div className="text-texto text-center font-bold tracking-widest mt-12">
                [ NO_SE_HAN_ENCONTRADO_NODOS_EN_TU_JERARQUÍA_DE_SALAS ]
              </div>
            ) : (

              arbolSalas.map((raiz) => (
                <NodoArbol key={raiz.id} nodo={raiz} />
              ))
            )}
          </div>
          
        )}
        </div>
  </div>
  );

}