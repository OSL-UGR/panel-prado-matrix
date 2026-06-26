import {useState, useEffect} from 'react';
import { fetchAsignaturasPrado } from '../services/api';

// Componente recursivo para dibujar el árbol
/*const NodoArbol = ({nodo, nivel = 0})=>{

}*/

export default function GestorSalas(){
    const [asignaturas, setAsignaturas] = useState([]);
    const [activaIndex, setActivaIndex] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [direccion, setDireccion] = useState(null);


    // Cargamos las asignaturas 
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

    // Funciones para navegar en el carrusel 
    const irAnterior = () => {
        setDireccion('izq');
        setActivaIndex((prev) => (prev === 0 ? asignaturas.length - 1 : prev - 1));
    };

    const irSiguiente = () => {
        setDireccion('der');
        setActivaIndex((prev) => (prev === asignaturas.length - 1 ? 0 : prev + 1));
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
    <div className="flex items-center justify-center w-full my-8 gap-4">
        {/* BOTÓN IZQUIERDA */}
        <button 
            onClick={irAnterior}
            className="w-12 h-12 border-4 bg-paneles border-texto text-texto hover:border-azul-turquesa hover:text-azul-turquesa cursor-pointer"
            >
        <p className="font-black text-xl">{"<"}</p>
        </button>

        {/* CONTENEDOR PRINCIPAL CARRUSEL */}
        <div className="w-full max-w-4xl overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_15%,_black_85%,transparent_100%)]">

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
            <div className="w-70 z-10 opacity-40 scale-90">
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
            <div className="w-70 z-10 scale-100">
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
            <div className="w-70 z-10 opacity-40 scale-90">
              {asigAnterior ? (
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
            className="w-12 h-12 border-4 bg-paneles border-texto text-texto hover:border-azul-turquesa hover:text-azul-turquesa cursor-pointer"
        >
        <p className="font-black text-xl">{">"}</p>
        </button>
    </div>
  </div>
  );

}