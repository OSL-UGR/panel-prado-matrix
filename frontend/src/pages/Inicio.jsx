import { useState, useEffect } from 'react';
import { fetchEstadisticasInicio,fetchAsignaturasPrado  } from '../services/api';

export default function Inicio() {
  const [stats, setStats] = useState(null);
  const [asignaturas, setAsignaturas] = useState([]); 
  const [cargando, setCargando] = useState(true);
  const [sincronizando, setSincronizando] = useState(null);

  useEffect(() => {
    const cargarDatosBackend = async () => {
      try {

        const [statsData, asignaturasData] = await Promise.all([

          fetchEstadisticasInicio (),
          fetchAsignaturasPrado()
        ])

        setStats(statsData);
        setAsignaturas(asignaturasData);

      } catch (error) {
        console.error("Error cargando la información de la pantalla de inicio:", error);
      } finally {
        setCargando(false);
      }
    };
    cargarDatosBackend();
  }, []);

  // Función a ejecutar al pulsar el botón de SINCRONIZAR
  const handleSincronizar = async (idAsignatura) => {
    setSincronizando(idAsignatura); // UI: Ponemos el botón en "girando"
    
    // [AQUÍ IRÁ LA LLAMADA POST AL ENDPOINT DE SINCRONIZAR CUANDO LO CREEMOS]
    console.log(`Simulando envío a Matrix para la asignatura ${idAsignatura}...`);
    
    // Simulación temporal para probar la interfaz (luego lo borraremos)
    setTimeout(() => {
      setSincronizando(null); // UI: Quitamos el "girando"
      // En la versión final, aquí llamaremos a cargarDatosBackend() 
      // para que el servidor nos dé el nuevo estado real.
    }, 2000);
  };
  

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

      <div className="m-4 border-t border-bordes p-8">

        <h3 className="text-lg text-texto font-bold mb-6 text-right"> [ PANEL_DE_CONTROL_DE_ASIGNATURAS ] </h3>

        <div className="flex flex-col gap-4">

          {/* Recorremos todas las asignaturas para imprimir cada una de las tarjetas */}
          {asignaturas?.map((asig) => {

            const isSincronizada = asig.sincronizada; //Ya está creada en Matrix
            const isSincronizando = sincronizando === asig.id; // Se está creando

            let estadoBoton = "sinSincronizar";
            if (isSincronizada) estadoBoton = "sincronizado";
            else if (isSincronizando) estadoBoton = "cargando";

            // Los distintos estados del boton
            const botonClass = {
              sincronizado: "border-green-500/50 text-green-500 cursor-not-allowed opacity-50 bg-green-500/10",
              cargando: "border-yellow-500 text-yellow-500 cursor-wait bg-yellow-500/10",
              sinSincronizar: "border-azul-turquesa text-azul-turquesa hover:bg-azul-turquesa hover:text-fondo cursor-pointer hover:shadow-[0_0_15px_rgba(0,255,255,0.4)]"
            }[estadoBoton];

            // Renderizado del contenido del botón
            const renderBotonTexto = () => {
              if (isSincronizando) {
                return (
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 animate-spin"></div>
                    ENVIANDO_DATOS...
                  </span>
                );
              }
              if (isSincronizada) {
                return <p>ENLACE_ESTABLECIDO</p>;
              }
              return (
                <span className="flex items-center gap-2 font-bold tracking-widest">
                  SINCRONIZAR <span className="text-xl group-hover:translate-x-1 transition-transform">»</span>
                </span>
              );
            };

            // Estilos del panel de estado
            const estadoPanelClass = isSincronizada
              ? "border-green-500 bg-green-500/5"
              : "border-red-500/50 bg-red-500/5";

            const estadoTexto = isSincronizada ? "SALA_ACTIVA" : "NO_DETECTADA";
            const estadoColor = isSincronizada ? "text-green-500" : "text-red-500";

            return (
              <div key={asig.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-8 items-center bg-paneles border border-bordes p-4 hover:border-texto transition-colors">
                
                {/* 1. INFO DE PRADO */}
                <div className="flex flex-col">
                  <span className="text-texto font-bold text-lg">{asig.nombre}</span>
                  <span className="text-xs text-bordes">ID_PRADO: #{asig.id} | {asig.usuarios} Usuarios</span>
                </div>

                {/* 2. BOTÓN DE SINCRONIZAR */}
                <div className="flex justify-center items-center">
                  <button 
                    onClick={() => handleSincronizar(asig.id)}
                    disabled={isSincronizada || isSincronizando}
                    className={`relative group flex items-center justify-center h-12 px-6 border-2 transition-all duration-300 ${botonClass}`}
                  >
                    {renderBotonTexto()}
                  </button>
                </div>

                {/* 3. ESTADO EN MATRIX */}
                <div className="flex justify-end items-center">
                  <div className={`border p-3 flex flex-col items-end w-full md:w-48 ${estadoPanelClass}`}>
                    <span className="text-[10px] tracking-widest text-bordes mb-1 uppercase">
                      Estado Servidor
                    </span>
                    <div className={`flex items-center gap-2 font-bold ${estadoColor}`}>
                      <div className={`w-2 h-2 ${isSincronizada ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                      {estadoTexto}
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
          
          {(!asignaturas || asignaturas.length === 0) && (
            <div className="text-center text-bordes py-8 border border-dashed border-bordes">
              [ NO_SE_HAN_ENCONTRADO_ASIGNATURAS_PARA_ESTE_USUARIO ]
            </div>
          )}

        </div>
      </div>

    </div>

    
  );
}