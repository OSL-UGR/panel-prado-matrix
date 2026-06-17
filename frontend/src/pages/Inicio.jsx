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
        console.error("Error cargando estadísticas en el componente:", error);
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

  // Comprobamos si el total de asignaturas sincronizadas en Matrix es 0
  const sinAsignaturasSincronizadas = stats?.matrix?.salas === 0;

  return (
    <div className="flex flex-col gap-6 font-mono">
      
      {/* ========================================== */}
      {/* 4 TARJETAS ESTADÍSTICAS SUPERIORES         */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Tarjeta 1: Asignaturas PRADO */}
        <div className="border border-bordes bg-paneles p-4 shadow-gris relative overflow-hidden group hover:border-texto transition-colors">
          <div className="text-[10px] text-bordes tracking-widest">// DEPT.PRADO // ASIG_TOTALES</div>
          <div className="text-4xl font-bold text-texto mt-2">
            {stats?.prado?.asignaturas ?? 0}
          </div>
          <div className="absolute right-2 bottom-0 text-5xl font-black text-bordes/10 pointer-events-none select-none">PRD</div>
        </div>

        {/* Tarjeta 2: Alumnos PRADO */}
        <div className="border border-bordes bg-paneles p-4 shadow-gris relative overflow-hidden group hover:border-texto transition-colors">
          <div className="text-[10px] text-bordes tracking-widest">// DEPT.PRADO // ALUM_MATRICULADOS</div>
          <div className="text-4xl font-bold text-texto mt-2">
            {stats?.prado?.alumnos ?? 0}
          </div>
          <div className="absolute right-2 bottom-0 text-5xl font-black text-bordes/10 pointer-events-none select-none">ALM</div>
        </div>

        {/* Tarjeta 3: Salas Matrix */}
        <div className="border border-bordes bg-paneles p-4 shadow-gris relative overflow-hidden group hover:border-azul-turquesa transition-colors">
          <div className="text-[10px] text-azul-turquesa tracking-widest">// SYNAPSE.MTRX // ESPACIOS_ACTIVOS</div>
          <div className="text-4xl font-bold text-azul-turquesa mt-2">
            {stats?.matrix?.salas ?? 0}
          </div>
          <div className="absolute right-2 bottom-0 text-5xl font-black text-azul-turquesa/10 pointer-events-none select-none">MTX</div>
        </div>

        {/* Tarjeta 4: Alumnos Matrix */}
        <div className="border border-bordes bg-paneles p-4 shadow-gris relative overflow-hidden group hover:border-azul-turquesa transition-colors">
          <div className="text-[10px] text-azul-turquesa tracking-widest">// SYNAPSE.MTRX // USUARIOS_REGISTRADOS</div>
          <div className="text-4xl font-bold text-azul-turquesa mt-2">
            {stats?.matrix?.alumnos ?? 0}
          </div>
          <div className="absolute right-2 bottom-0 text-5xl font-black text-azul-turquesa/10 pointer-events-none select-none">USR</div>
        </div>

      </div>

      {/* ========================================== */}
      {/* MENSAJE DE ADVERTENCIA / BIENVENIDA        */}
      {/* ========================================== */}
      {sinAsignaturasSincronizadas && (
        <div className="border border-azul-turquesa/50 bg-azul-turquesa/5 p-4 shadow-azul flex flex-col sm:flex-row items-center gap-4 justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-azul-turquesa animate-ping rounded-full"></div>
            <p className="text-xs sm:text-sm text-texto tracking-wider font-bold">
              TODAVÍA NO HEMOS SINCRONIZADO NINGUNA ASIGNATURA. ¡VAMOS A POR ELLO!
            </p>
          </div>
          <span className="text-xs text-azul-turquesa tracking-widest bg-paneles border border-bordes px-2 py-1 select-none">
            STATUS // PENDING_SYNC
          </span>
        </div>
      )}

      {/* ========================================== */}
      {/* CONTENEDOR DE LA PARTE INTERMEDIA          */}
      {/* (Aquí meteremos la lógica de las columnas) */}
      {/* ========================================== */}
      <div className="border border-dashed border-bordes p-8 text-center text-xs text-bordes">
        [ FILTRADO_DE_ESTADÍSTICAS_COMPLETO // PRÓXIMO_PASO: ACOPLAR_PANEL_DE_ASIGNATURAS_A_DOS_COLUMNAS ]
      </div>

    </div>
  );
}