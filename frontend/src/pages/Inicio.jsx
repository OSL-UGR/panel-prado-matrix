import { useState, useEffect } from 'react';
import { fetchEstadisticasInicio  } from '../services/api';

export default function Inicio() {
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarEstadisticas = async () => {
      try {
        const data = await fetchEstadisticasInicio ();
        setStats(data);
      } catch (error) {
        console.error("Error cargando estadísticas:", error);
      } finally {
        setCargando(false);
      }
    };
    cargarEstadisticas();
  }, []);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed border-bordes bg-paneles tracking-widest text-azul-turquesa animate-pulse">
        [// LEYENDO_SISTEMA_DE_ARCHIVOS_PRADO_MATRIX...]
      </div>
    );
  }

  //Comprobamos si el total de asignaturas sincronizadas en Matrix es 0
  const sinAsignaturasSincronizadas = stats?.matrix?.salas === 0;

  return (
    <div className="flex flex-col gap-8 font-mono min-h-full">
      
      {/* Sección superior de estadísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-center">
        
        {/* Columna izquierda de prado */}
        <div className="flex flex-col gap-4">

          { /* Titulo de la columna */}
          <div className="text-xs text-bordes border-b border-bordes pb-2 mb-2 font-bold tracking-widest">
            <p>[ MOODLE / PRADO ]</p>
          </div>

          {/* Tarjeta Prado 1 */}
          <div className="border border-bordes bg-paneles p-5 shadow-gris flex justify-between items-center relative overflow-hidden">
            <div className="z-10">
              <div className="text-lg text-texto font-bold">Asignaturas Activas</div>
              <div className="text-[10px] text-bordes mt-1 tracking-wider max-w-[200px]">Tus materias asignadas en Prado.</div>
            </div>
            <div className="text-5xl font-black text-texto z-10">{stats?.prado?.asignaturas ?? 0}</div>
          </div>

          {/* Tarjeta Prado 2 */}
          <div className="border border-bordes bg-paneles p-5 shadow-gris flex justify-between items-center relative overflow-hidden">
            <div className="z-10">
              <div className="text-lg text-texto font-bold">Usuarios en Prado</div>
              <div className="text-[10px] text-bordes mt-1 tracking-wider max-w-[200px]">Tu total de alumnos matriculados.</div>
            </div>
            <div className="text-5xl font-black text-texto z-10">{stats?.prado?.alumnos ?? 0}</div>
          </div>
        </div>

        {/* Imagen central del vs. Esta se oculta en moviles*/}
        <div className="hidden lg:flex flex-col items-center justify-center px-4">
          <div className="h-16 w-px bg-bordes/50 mb-4"></div>
          
          <img 
            src="https://i.pinimg.com/736x/58/d7/2f/58d72f9f95c02dcee250fe7c9744d687.jpg" 
            alt="Versus" 
            className="w-20 object-contain filter invert grayscale-0 "
          />
          
          <div className="h-16 w-px bg-bordes/50 mt-4"></div>
        </div>

        {/* Columna derecha de matrix */}
        <div className="flex flex-col gap-4">
          <div className="text-xs text-bordes border-b border-bordes pb-2 mb-2 font-bold tracking-widest flex items-center justify-between">
            <p>[ MATRIX / ELEMENT ]</p>
          </div>

          {/* Tarjeta Matrix 1 */}
          <div className="border border-bordes bg-paneles p-5 shadow-gris flex justify-between items-center relative overflow-hidden">
            <div className="z-10">
              <div className="text-lg text-azul-turquesa font-bold">Espacios de Matrix</div>
              <div className="text-[10px] text-bordes mt-1 tracking-wider max-w-[200px]">Espacios creados en Matrix para tus clases.</div>
            </div>
            <div className="text-5xl font-black text-azul-turquesa z-10">{stats?.matrix?.salas ?? 0}</div>
          </div>

          {/* Tarjeta Matrix 2 */}
          <div className="border border-bordes bg-paneles p-5 shadow-gris flex justify-between items-center relative overflow-hidden">
            <div className="z-10">
              <div className="text-lg text-azul-turquesa font-bold">Usuarios en Matrix</div>
              <div className="text-[10px] text-bordes mt-1 tracking-wider max-w-[200px]">Tus alumnos registrados en tus espacios de Matrix.</div>
            </div>
            <div className="text-5xl font-black text-azul-turquesa z-10">{stats?.matrix?.alumnos ?? 0}</div>
          </div>
        </div>

      </div>

      {/* Mnesaje si no hubiese todavía asignaturas sincronizadasm, si las hubiera no se mostaría nada*/}
      {sinAsignaturasSincronizadas ? (
        <div className="flex-1 border-2 border-dashed border-azul-turquesa/50 bg-azul-turquesa/5 p-8 flex flex-col items-center justify-center text-center gap-6">
          
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-azul-turquesa animate-ping rounded-full"></div>
            <p className="text-xs text-azul-turquesa tracking-widest border border-azul-turquesa px-3 py-1  shadow-azul">
              Status // Pending_Sync
            </p>
            <div className="w-3 h-3 bg-azul-turquesa animate-ping rounded-full"></div>
          </div>
          
          <h2 className="text-2xl lg:text-3xl text-texto font-bold max-w-2xl leading-relaxed">
            TODAVÍA NO HEMOS SINCRONIZADO NINGUNA ASIGNATURA. <br />
            <p className="text-azul-turquesa">¡VAMOS A POR ELLO!</p>
          </h2>
          
          <p className="text-sm text-bordes max-w-xl">
            A continuación se muestran tus asignaturas de PRADO. Pulsa el botón de sincronizar para crear los espacios de comunicación en Matrix y matricular a tus estudiantes automáticamente.
          </p>

        </div>
      ) : null}

      {/* Columnas de sincronziación de salas Prado con Matrix */}
      <div>Por implementar dos columnas para la sincronización</div>

    </div>

    
  );
}