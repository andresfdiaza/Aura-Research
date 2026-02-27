import React from 'react';
import { useLocation, Navigate, Link, useNavigate } from 'react-router-dom';
import './home.css';
import { API_BASE } from './config';

export default function HomeAdmin() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;
  const homePath = user?.role === 'admin' ? '/homeadmin' : '/home';
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [formData, setFormData] = React.useState({
    nombre_completo: '',
    cedula: '',
    link_cvlac: '',
    facultad: '',
    programa_academico: '',
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(false);

  // estado de scraping
  const [scrapingStatus, setScrapingStatus] = React.useState(null);

  if (!user) {
    // if accessed directly without login redirect to login
    return <Navigate to="/" replace />;
  }

  const userName = user.email.split('@')[0];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('http://localhost:4000/investigadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error saving investigador');
      }

      setSuccess(true);
      setFormData({
        nombre_completo: '',
        cedula: '',
        link_cvlac: '',
        facultad: '',
        programa_academico: '',
      });
      setTimeout(() => {
        setShowAddModal(false);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 md:px-16 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-10 rounded-lg bg-primary text-white">
            <span className="material-symbols-outlined text-2xl">rocket_launch</span>
          </div>
          <div className="flex flex-col">
            <h2 className="text-primary text-lg font-bold leading-tight tracking-tight">AURA RESEARCH UNAC</h2>
            <span className="text-xs text-neutral-muted font-medium uppercase tracking-wider">
              Facultad de Ingeniería
            </span>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <Link
            className="text-primary text-sm font-bold border-b-2 border-accent pb-1"
            to={homePath}
            state={{ user }}
          >
            Inicio
          </Link>
          <Link
            className="text-slate-500 hover:text-primary text-sm font-semibold transition-colors"
            to="/DirectorioInvestigadores"
            state={{ user }}
          >
            Investigadores
          </Link>
          <Link
            className="text-slate-500 hover:text-primary text-sm font-semibold transition-colors" 
            to="/analisis"
            state={{ user }}
           >
              Análisis
            
          </Link>
          
        </nav>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button className="flex items-center justify-center rounded-full size-10 bg-slate-100 text-primary hover:bg-slate-200 transition-all">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="flex items-center justify-center rounded-full size-10 bg-slate-100 text-primary hover:bg-slate-200 transition-all">
              <span className="material-symbols-outlined">settings</span>
            </button>
          </div>
          <div className="h-10 w-[1px] bg-slate-200 mx-2"></div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-primary">{userName}</p>
            </div>
            <div className="bg-primary/10 rounded-full border border-primary/20 flex items-center justify-center w-10 h-10">
              <span className="material-symbols-outlined text-primary text-2xl">person</span>
            </div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1 px-3 py-2 ml-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-all text-sm font-semibold"
              title="Cerrar sesión"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>
      <div className="container mx-auto flex-1 flex flex-col">
        <main className="flex-1 flex flex-col items-center pt-2 px-6 md:px-16">
        <div className="max-w-6xl w-full flex flex-col gap-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex flex-col gap-3">
              <h1 className="text-primary text-4xl md:text-5xl font-black leading-tight tracking-tight">
                <br className="hidden md:block" />¡{userName} Bienvenido al <span className="text-primary">Sistema analitico de investigadores de la UNAC</span> !
              </h1>
              <p className="text-slate-600 text-lg max-w-2xl leading-relaxed">
                Gestión y análisis de productos de investigación de la Corporación Universitaria Adventista. Visualiza el
                impacto de la producción científica en tiempo real.
              </p>
            </div>

          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="action-card group relative flex flex-col overflow-hidden rounded-3xl shadow-soft max-w-sm mx-auto">
              <div className="absolute top-0 right-0 p-4 opacity-5 transition-transform group-hover:scale-110 group-hover:rotate-12">
                <span className="material-symbols-outlined text-[60px] text-primary">group_add</span>
              </div>
              <div className="p-6 md:p-8 flex flex-col h-full relative z-10">
                <div className="size-14 rounded-2xl bg-[#F5A800] flex items-center justify-center text-white mb-6 shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-3xl">person_add</span>
                </div>
                <h3 className="text-xl font-bold text-primary mb-3 tracking-tight">
                  Directorio de Investigadores
                </h3>
                <p className="text-slate-600 mb-8 text-sm">
                  Accede al directorio completo de investigadores afiliados a la UNAC, con detalles de su producción científica.
                </p>
                <div className="mt-auto">
                  <Link
                    to="/DirectorioInvestigadores"
                    state={{ user }}
                    className="flex items-center gap-2 text-primary font-bold group-hover:gap-4 transition-all uppercase text-sm tracking-widest"
                  >
                    Ingresar
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </Link>
                </div>
              </div>
              <div className="h-2 w-full bg-[#F5A800] mt-auto"></div>
            </div>
            {/* Card for Analisis categories */}
            <div className="action-card group relative flex flex-col overflow-hidden rounded-3xl shadow-soft max-w-sm mx-auto">
              <div className="absolute top-0 right-0 p-4 opacity-5 transition-transform group-hover:scale-110 group-hover:rotate-12">
                <span className="material-symbols-outlined text-[60px] text-primary">analytics</span>
              </div>
              <div className="p-6 md:p-8 flex flex-col h-full relative z-10">
                <div className="size-14 rounded-2xl bg-[#F5A800] flex items-center justify-center text-white mb-6 shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-3xl" style={{ color: '#FFF' }}>insights</span>
                </div>
                <h3 className="text-xl font-bold text-primary mb-3 tracking-tight">
                  Análisis
                </h3>
                <p className="text-slate-600 mb-8 text-sm">
                  Navega por las tipologías de análisis.
                </p>
                <div className="mt-auto">
                  <Link
                    to="/analisis"
                    state={{ user }}
                    className="flex items-center gap-2 text-primary font-bold group-hover:gap-4 transition-all uppercase text-sm tracking-widest"
                  >
                    Analizar
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </Link>
                </div>
              </div>
              <div className="h-2 w-full bg-[#F5A800] mt-auto"></div>
            </div>
          </div>
         
        </div>
      </main>
      </div>
      <div className="flex gap-2 justify-end mb-8">
        <button
          title="Agregar Investigador"
          className="flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-lg font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all text-sm"
          onClick={() => setShowAddModal(true)}
        >
          <span className="material-symbols-outlined text-base">person_add</span>
          <span>Agregar</span>
        </button>
        <button
          title="Iniciar Scraping"
          className="flex items-center gap-1 px-4 py-2 bg-[#F5A800] text-white rounded-lg font-bold shadow-md shadow-yellow-300 hover:bg-yellow-500 transition-all text-sm"
          onClick={async () => {
            setScrapingStatus('Ejecutando...');
            try {
              const res = await fetch(`${API_BASE}/scraping/ejecutar`, { method: 'POST' });
              const data = await res.json();
              if (res.ok) setScrapingStatus(data.message || 'Scraping ejecutado correctamente');
              else setScrapingStatus(data.error || 'Error ejecutando scraping');
            } catch (err) {
              setScrapingStatus(err.message);
            }
          }}
        >
          <span className="material-symbols-outlined text-base">web</span>
          <span>Scraping</span>
        </button>
        <button
          title="Editar Investigador"
          className="flex items-center gap-1 px-4 py-2 bg-slate-500 text-white rounded-lg font-bold shadow-md shadow-slate-400 hover:bg-slate-600 transition-all text-sm"
          onClick={() => navigate('/investigadores', { state: { user } })}
        >
          <span className="material-symbols-outlined text-base">edit</span>
          <span>Editar</span>
        </button>
      </div>
      {scrapingStatus && (
        <div className="w-full mb-4 text-center">
          <span className="text-sm font-semibold text-neutral-muted">{scrapingStatus}</span>
        </div>
      )}
      <footer className="mt-auto py-8 border-t border-slate-200 bg-white text-center">
        <p className="text-sm text-neutral-muted font-medium">
          © 2026 Corporacion Universitaria Adventista - Facultad de Ingeniería 
        </p>
      </footer>
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 shadow-xl rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-[800px] overflow-hidden relative">
            <button
              className="absolute top-2 left-2 text-primary hover:bg-primary/10 rounded-full p-2 text-xl flex items-center"
              onClick={() => setShowAddModal(false)}
              aria-label="Volver"
            >
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
            <button
              className="absolute top-2 right-2 text-slate-400 hover:text-primary text-xl"
              onClick={() => setShowAddModal(false)}
              aria-label="Cerrar"
            >
              
            </button>
            {/* Card Header / Hero Area */}
            <div className="relative h-32 bg-primary overflow-hidden flex items-center px-8">
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm text-white border border-white/20">
                  <span className="material-symbols-outlined text-3xl">person_add</span>
                </div>
                <div>
                  <h1 className="text-white text-2xl font-bold">Agregar Nuevo Investigador</h1>
                  <p className="text-white/80 text-sm">Registro oficial para el sistema de gestión GI2A</p>
                </div>
              </div>
            </div>
            {/* Form Content */}
            <form className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
              {success && (
                <div className="col-span-1 md:col-span-2 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                  ✓ Investigador guardado exitosamente
                </div>
              )}
              {error && (
                <div className="col-span-1 md:col-span-2 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                  Error: {error}
                </div>
              )}
              {/* Nombre Completo */}
              <div className="col-span-1 md:col-span-2">
                <label className="block mb-2 text-slate-700 dark:text-slate-300 text-sm font-semibold">Nombre Completo</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">person</span>
                  <input className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="Ej: Juan Sebastián Pérez García" type="text" name="nombre_completo" value={formData.nombre_completo} onChange={handleInputChange} required />
                </div>
              </div>
              {/* Cédula de Ciudadanía */}
              <div className="col-span-1">
                <label className="block mb-2 text-slate-700 dark:text-slate-300 text-sm font-semibold">Cédula de Ciudadanía</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">badge</span>
                  <input className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="Número de identificación" type="text" name="cedula" value={formData.cedula} onChange={handleInputChange} />
                </div>
              </div>
              {/* Link CVLAC */}
              <div className="col-span-1">
                <label className="block mb-2 text-slate-700 dark:text-slate-300 text-sm font-semibold">Link de CVLAC</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">link</span>
                  <input className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="https://scienti.minciencias.gov.co/cvlac/..." type="url" name="link_cvlac" value={formData.link_cvlac} onChange={handleInputChange} />
                </div>
              </div>
              {/* Facultad */}
              <div className="col-span-1">
                <label className="block mb-2 text-slate-700 dark:text-slate-300 text-sm font-semibold">Facultad</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">account_balance</span>
                  <select className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none" name="facultad" value={formData.facultad} onChange={handleInputChange}>
                    <option value="">Seleccione Facultad</option>
                    <option value="ingenieria">Facultad de Ingeniería</option>
                    <option value="ciencias_salud">Facultad de Ciencias de la Salud</option>
                    <option value="educacion">Facultad de Educación</option>
                    <option value="teologia">Facultad de Teología</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                </div>
              </div>
              {/* Programa Académico */}
              <div className="col-span-1">
                <label className="block mb-2 text-slate-700 dark:text-slate-300 text-sm font-semibold">Programa Académico</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">school</span>
                  <select className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none" name="programa_academico" value={formData.programa_academico} onChange={handleInputChange}>
                    <option value="">Seleccione Programa</option>
                    <option value="sistemas">Ingeniería de Sistemas</option>
                    <option value="electronica">Ingeniería Electrónica</option>
                    <option value="industrial">Ingeniería Industrial</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                </div>
              </div>
              {/* Form Actions */}
              <div className="col-span-1 md:col-span-2 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-end gap-4">
                <button className="px-6 py-3 rounded-lg font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" type="button" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </button>
                <button className="px-6 py-3 rounded-lg font-semibold text-primary border border-primary hover:bg-primary hover:text-white transition-colors" type="button" onClick={() => setShowAddModal(false)}>
                  Volver
                </button>
                <button className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2" type="submit" disabled={loading}>
                  <span className="material-symbols-outlined text-xl">{loading ? 'hourglass_top' : 'save'}</span>
                  {loading ? 'Guardando...' : 'Guardar Investigador'}
                </button>
              </div>
            </form>
            {/* Faculty Footer Logo/Tag */}
            <div className="mt-12 flex flex-col items-center opacity-40">
              <div className="w-16 h-16 bg-slate-300 dark:bg-slate-700 rounded-full flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-3xl">account_balance</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-xs font-bold tracking-widest uppercase">Facultad de Ingeniería - UNAC</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
