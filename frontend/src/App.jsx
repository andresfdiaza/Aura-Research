import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './login';
import NuevoConocimiento from './NuevoConocimiento';
import Home from './Home';
import Investigadores from './Investigadores';
import Datos from './Datos';
import Analisis from './Analisis';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/investigadores" element={<Investigadores />} />
        <Route path="/datos" element={<Datos />} />
        <Route path="/analisis" element={<Analisis />} />
        <Route path="/NuevoConocimiento" element={<NuevoConocimiento />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
