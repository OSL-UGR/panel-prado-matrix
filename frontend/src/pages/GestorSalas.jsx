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
            className="w-12 h-12 border-4 bg-paneles border-texto text-texto hover:border-azul-turquesa hover:text-azul-turquesa"
            >
        <p className="font-black text-xl">{"<"}</p>
        </button>

        {/* CONTENEDOR PRINCIPAL CARRUSEL */}
        <div className="w-full max-w-4xl overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_15%,_black_85%,transparent_100%)]">

            
        </div>
        {/* BOTÓN DERECHA */}
        <button 
            onClick={irSiguiente}
            className="w-12 h-12 border-4 bg-paneles border-texto text-texto hover:border-azul-turquesa hover:text-azul-turquesa"
        >
        <p className="font-black text-xl">{">"}</p>
        </button>
    </div>
  </div>
  );

}