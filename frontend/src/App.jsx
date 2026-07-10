// Enrutador de la aplicación
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';  //Para envolver a todas las páginas y mantener el estilo común
import Inicio from './pages/Inicio';
import GestorSalas from './pages/GestorSalas';
import CronogramaSalas from './pages/CronogramaSalas';
import ProgramadorAvisos from './pages/ProgramadorAvisos';
import RegistroLogs from './pages/RegistroLogs';


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}> 
          <Route index element={<Inicio />} />          
          <Route path="salas" element={<GestorSalas />} />
          <Route path="avisos" element={<ProgramadorAvisos/>} />
          <Route path="horarios" element={<CronogramaSalas/>} />
          <Route path="logs" element={<RegistroLogs/>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}