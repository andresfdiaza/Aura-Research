import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './login';
import NuevoConocimiento from './NuevoConocimiento';
import DesarrolloTecnologico from './DesarrolloTecnologico';
import ApropriacionSocial from './ApropriacionSocial';
import DivulgacionPublica from './DivulgacionPublica';
import FormacionRecursoHumano from './FormacionRecursoHumano';
import Home from './Home';
import HomeAdmin from './HomeAdmin';
import Investigadores from './Investigadores';
import Datos from './Datos';
import Analisis from './Analisis';
import DirectorioInvestigadores from './DirectorioInvestigadores';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/homeadmin" element={<HomeAdmin />} />
        <Route path="/investigadores" element={<Investigadores />} />
        <Route path="/datos" element={<Datos />} />
        <Route path="/analisis" element={<Analisis />} />
        <Route path="/NuevoConocimiento" element={<NuevoConocimiento />} />
        <Route path="/DesarrolloTecnologico" element={<DesarrolloTecnologico />} />
        <Route path="/ApropriacionSocial" element={<ApropriacionSocial />} />
        <Route path="/DivulgacionPublica" element={<DivulgacionPublica />} />
        <Route path="/FormacionRecursoHumano" element={<FormacionRecursoHumano />} />
        <Route path="/DirectorioInvestigadores" element={<DirectorioInvestigadores />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
