/* No recarga la página navegamos dentro del router de react*/
import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { fetchPerfilUsuario } from '../services/api';
export default function Layout() {
  const location = useLocation(); /* Nos indica donde estamos ahora*/

  // Estado inicial del perfil mientras carga
  const [perfil, setPerfil] = useState({
    nombre: 'CONECTANDO...',
    matrix_id: 'Sincronizando...',
    avatar_url: null
  });

  // Petición a la API al montar el componente
  useEffect(() => {
    const cargarPerfil = async () => {
      try {
        const datos = await fetchPerfilUsuario();
        if (!datos.error) {
          setPerfil(datos);
        }
      } catch (error) {
        console.error("Error cargando perfil:", error);
      }
    };
    cargarPerfil();
  }, []);

  // Definimos nuestras pantallas 
  const paginasNavegables = [
    { path: '/', label: 'INICIO' },
    { path: '/salas', label: 'GESTOR DE SALAS' },
    { path: '/avisos', label: 'PROG. DE AVISOS' },
    { path: '/horarios', label: 'CRONO. DE SALAS' },
    { path: '/sanciones', label: 'SANCIONES' },
    { path: '/logs', label: 'REGISTRO DE LOGS' },
  ];

  return (
    <div className="min-h-screen flex flex-col uppercase overflow-hidden">
      
      {/* --- HEADER --- */}
      <header className="border-b border-bordes bg-paneles p-4 flex justify-between items-center shadow-gris z-10">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-azul-turquesa animate-pulse"></div>
          <h1 className="text-2xl font-bold tracking-widest text-azul-turquesa">
            PRADO<span className="text-texto">::MATRIX</span>
          </h1>
        </div>

        {/* Bloque de perfil */}
        <div className="flex items-center gap-4 border border-bordes p-2 bg-fondo shadow-gris">
          <div className="w-10 h-10 border border-bordes bg-paneles flex items-center justify-center">
            {perfil.avatar_url ? (
              <img src={perfil.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs">IMG</span>
            )}
          </div>
          <div className="text-right">
            <div className="font-bold text-azul-turquesa ">{perfil.nombre}</div>
            <div className="text-xs text-bordes lowercase">{perfil.matrix_id}</div>
          </div>
        </div>
      </header>

      {/* --- MAIN --- */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* --- BARRA LATERAL ---*/}
        <aside className="w-64 border-r border-bordes bg-paneles p-4 flex flex-col gap-3 z-0">
          <div className="text-xs text-bordes mb-4 border-b border-bordes pb-2">
            SYS.NAV // SELECT_MODULE
          </div>
          
          {paginasNavegables.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`
                  p-3 border transition-all duration-200
                  ${isActive 
                    ? 'border-paneles text-fondo bg-azul-turquesa  shadow-azul font-bold translate-x-1' 
                    : 'border-bordes text-texto hover:border-texto hover:bg-bordes '
                  }
                `}
              >
                [{item.label}]
              </Link>
            );
          })}
          
          <div className="mt-auto pt-4 border-t border-bordes text-[10px] text-bordes opacity-50">
            <p>V. 0.6.7_BETA</p>
            <p>CONEXIÓN: ESTABLE</p>
          </div>
        </aside>

        {/* ÁREA CENTRAL */}
        <main className="flex-1 p-6 overflow-y-auto relative">
          <Outlet />
        </main>

      </div>
    </div>
  );
}