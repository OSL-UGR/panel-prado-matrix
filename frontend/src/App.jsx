// Enrutador de la aplicación
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';  //Para envolver a todas las páginas y mantener el estilo común
import Inicio from './pages/Inicio';
import GestorSalas from './pages/GestorSalas';
import CronogramaSalas from './pages/CronogramaSalas';

// TODO: Pantallas provisionales para comprobar que la navegación funciona
const ProgramadorAvisos = () => <div className='border border-bordes p-6 bg-paneles shadow-gris'><h2 className="text-azul-turquesa text-xl mb-4">MÓDULO: PROGRAMADOR DE AVISOS</h2><p>El formulario para programar avisos en salas irá aquí...</p></div>
const ControlSanciones = () => <div className='border border-bordes p-6 bg-paneles shadow-gris'><h2 className='text-azul-turquesa text-xl mb-4'>MÓDULO: CONTROL DE SANCIONES </h2><p>El listado de usuarios para controlar las sanciones a estos irá aquí... </p></div>
const RegistroLogs = () => <div className='border border-bordes p-6 bg-paneles shadow-gris'><h2 className='text-azul-turquesa text-xl mb-4'>MÓDULO: REGISTRO DE LOGS</h2><p>Todos los logs de las distintas operaciones del sistema iran aquí...</p></div>

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}> 
          <Route index element={<Inicio />} />          
          <Route path="salas" element={<GestorSalas />} />
          <Route path="avisos" element={<ProgramadorAvisos/>} />
          <Route path="horarios" element={<CronogramaSalas/>} />
          <Route path="sanciones" element={<ControlSanciones/>} />
          <Route path="logs" element={<RegistroLogs/>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}