import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login/Login';
import NuevoConocimiento from './pages/Tipologias/NuevoConocimiento';
import DesarrolloTecnologico from './pages/Tipologias/DesarrolloTecnologico';
import ApropriacionSocial from './pages/Tipologias/ApropriacionSocial';
import DivulgacionPublica from './pages/Tipologias/DivulgacionPublica';
import FormacionRecursoHumano from './pages/Tipologias/FormacionRecursoHumano';
import Home from './pages/Home/Home';
import HomeAdmin from './pages/HomeAdmin/HomeAdmin';
import Investigadores from './pages/Investigadores/Investigadores';
import Datos from './pages/Datos/Datos';
import Analisis from './pages/Analisis/Analisis';
import DirectorioInvestigadores from './pages/DirectorioInvestigadores/DirectorioInvestigadores';
import PerfilInvestigador from './pages/PerfilInvestigador/PerfilInvestigador';
import Usuarios from './pages/Usuarios/Usuarios';
import Ajustes from './pages/Ajustes/Ajustes';
import GlobalToast from './components/GlobalToast';
import { canAccessRoles, homePathForRole } from './utils/rolePermissions';
import './App.css';

function ProtectedRoute({ element, allowedRoles = [] }) {
  const location = useLocation();
  const user = location.state?.user;
  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (!canAccessRoles(user.role, allowedRoles)) {
    return <Navigate to={homePathForRole(user.role)} replace state={{ user }} />;
  }
  return element;
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<ProtectedRoute element={<Home />} />} />
        <Route path="/homeadmin" element={<ProtectedRoute element={<HomeAdmin />} allowedRoles={['admin']} />} />
        <Route path="/investigadores" element={<ProtectedRoute element={<Investigadores />} allowedRoles={['admin', 'coordinador']} />} />
        <Route path="/datos" element={<ProtectedRoute element={<Datos />} />} />
        <Route path="/analisis" element={<ProtectedRoute element={<Analisis />} />} />
        <Route path="/NuevoConocimiento" element={<ProtectedRoute element={<NuevoConocimiento />} />} />
        <Route path="/DesarrolloTecnologico" element={<ProtectedRoute element={<DesarrolloTecnologico />} />} />
        <Route path="/ApropriacionSocial" element={<ProtectedRoute element={<ApropriacionSocial />} />} />
        <Route path="/DivulgacionPublica" element={<ProtectedRoute element={<DivulgacionPublica />} />} />
        <Route path="/FormacionRecursoHumano" element={<ProtectedRoute element={<FormacionRecursoHumano />} />} />
        <Route path="/DirectorioInvestigadores" element={<ProtectedRoute element={<DirectorioInvestigadores />} />} />
        <Route path="/PerfilInvestigador" element={<ProtectedRoute element={<PerfilInvestigador />} />} />
        <Route path="/usuarios" element={<ProtectedRoute element={<Usuarios />} allowedRoles={['admin', 'director']} />} />
        <Route path="/ajustes" element={<ProtectedRoute element={<Ajustes />} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <GlobalToast />
    </HashRouter>
  );
}

export default App;

