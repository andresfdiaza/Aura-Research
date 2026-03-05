import React from "react";
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { API_BASE, SERVER_BASE } from './config';

export default function DirectorioInvestigadores() {
  const [resultados, setResultados] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [formData, setFormData] = React.useState({
    nombre_completo: '',
    cedula: '',
    link_cvlac: '',
    facultad: '',
    programa_academico: '',
  });
  const [formLoading, setFormLoading] = React.useState(false);
  const [formError, setFormError] = React.useState(null);
  const [formSuccess, setFormSuccess] = React.useState(false);
  const [filters, setFilters] = React.useState({
    facultad: '',
    programa: ''
  });

  // Obtener datos del backend
  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (filters.facultad) qs.append('facultad', filters.facultad);
        if (filters.programa) qs.append('programa', filters.programa);
        const url = `${API_BASE}/resultados` + (qs.toString() ? ('?' + qs.toString()) : '');
        console.log('[DirectorioInvestigadores] Fetching resultados', { url, filters });
        const res = await fetch(url);
        if (!res.ok) {
          const errorText = await res.text();
          console.error('[DirectorioInvestigadores] Fetch failed', {
            url,
            status: res.status,
            statusText: res.statusText,
            body: errorText,
          });
          throw new Error(`Error fetching resultados (${res.status})`);
        }
        const data = await res.json();
        console.log('[DirectorioInvestigadores] Fetch success', { rows: data.length });
        setResultados(data);
      } catch (err) {
        console.error('[DirectorioInvestigadores] Load error', err);
        setError('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filters]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    setFormSuccess(false);

    try {
      const res = await fetch(`${SERVER_BASE}/investigadores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error saving investigador');
      }

      setFormSuccess(true);
      setFormData({
        nombre_completo: '',
        cedula: '',
        link_cvlac: '',
        facultad: '',
        programa_academico: '',
      });
      setTimeout(() => {
        setShowAddModal(false);
        setFormSuccess(false);
      }, 2000);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Opciones de filtros dinámicas
  const filterOptions = React.useMemo(() => {
    const opts = { facultad: [], programa: [] };
    resultados.forEach(r => {
      if (r.facultad && !opts.facultad.includes(r.facultad)) opts.facultad.push(r.facultad);
      if (r.programa && !opts.programa.includes(r.programa)) opts.programa.push(r.programa);
    });
    Object.values(opts).forEach(arr => arr.sort());
    return opts;
  }, [resultados]);

  // Obtener lista única de investigadores con conteo de productos
  const investigadores = React.useMemo(() => {
    const investigadoresMap = {};
    
    resultados.forEach(r => {
      const nombre = r.nombre || 'Sin nombre';
      if (!investigadoresMap[nombre]) {
        investigadoresMap[nombre] = {
          nombre,
          facultad: r.facultad || 'Sin facultad',
          programa: r.programa || 'Sin programa',
          cantidad_productos: 0,
          tipologias: new Set()
        };
      }
      investigadoresMap[nombre].cantidad_productos += 1;
      if (r.nodo_padre) {
        investigadoresMap[nombre].tipologias.add(r.nodo_padre);
      }
    });

    // Convertir Set a Array en cada objeto
    return Object.values(investigadoresMap).map(inv => ({
      ...inv,
      tipologias: Array.from(inv.tipologias)
    }));
  }, [resultados]);

  // Filtrar investigadores por búsqueda
  const filtered = React.useMemo(() => {
    return investigadores.filter(inv => {
      const nombre = (inv.nombre || '').toLowerCase();
      const facultad = (inv.facultad || '').toLowerCase();
      const programa = (inv.programa || '').toLowerCase();
      const search = searchTerm.toLowerCase();

      const matchSearch = nombre.includes(search) || facultad.includes(search) || programa.includes(search);
      const matchFacultad = !filters.facultad || inv.facultad === filters.facultad;
      const matchPrograma = !filters.programa || inv.programa === filters.programa;

      return matchSearch && matchFacultad && matchPrograma;
    });
  }, [investigadores, searchTerm, filters]);

  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;
  const homePath = user?.role === 'admin' ? '/homeadmin' : '/home';
  const userName = user?.email?.split('@')[0] || 'Usuario';

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 md:px-16 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-10 rounded-lg bg-primary text-white">
            <span className="material-symbols-outlined text-2xl">group</span>
          </div>
          <div className="flex flex-col">
            <h2 className="text-primary text-lg font-bold leading-tight tracking-tight">GI2A UNAC</h2>
            <span className="text-xs text-neutral-muted font-medium uppercase tracking-wider">
              Facultad de Ingeniería
            </span>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <Link
            className="text-slate-500 hover:text-primary text-sm font-semibold transition-colors"
            to={homePath}
            state={{ user }}
          >
            Inicio
          </Link>
          <Link
            className="text-primary text-sm font-bold border-b-2 border-accent pb-1"
            to="/investigadores"
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
          </div>
        </div>
      </header>

      <div className="container mx-auto flex-1 flex flex-col">
        <main className="flex-1 flex flex-col items-center py-6 px-6 md:px-16">
          <div className="max-w-7xl w-full flex flex-col gap-6">
            {/* Título y Botones */}
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-primary">Directorio de Investigadores</h1>
              <div className="flex gap-2">
                <button
                  title="Agregar Investigador"
                  className="flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-lg font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all text-sm"
                  onClick={() => setShowAddModal(true)}
                >
                  <span className="material-symbols-outlined text-base">person_add</span>
                  <span>Agregar</span>
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
            </div>

            {/* Búsqueda y Filtros */}
            <div className="bg-white p-4 rounded-lg shadow flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-primary">Buscar por nombre, facultad o programa</label>
                <input
                  type="text"
                  placeholder="Ingresa nombre o palabra clave..."
                  className="w-full border rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-xs">Facultad</label>
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={filters.facultad}
                    onChange={e => setFilters(prev => ({ ...prev, facultad: e.target.value }))}
                  >
                    <option value="">Todos</option>
                    {filterOptions.facultad?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-xs">Programa</label>
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={filters.programa}
                    onChange={e => setFilters(prev => ({ ...prev, programa: e.target.value }))}
                  >
                    <option value="">Todos</option>
                    {filterOptions.programa?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Contenido */}
            {loading && <p className="text-center text-lg text-slate-500">Cargando investigadores…</p>}
            {error && <p className="text-center text-red-600">Error: {error}</p>}
            
            {!loading && !error && investigadores.length === 0 && (
              <p className="text-center text-gray-600 text-lg">No hay investigadores disponibles.</p>
            )}

            {!loading && !error && filtered.length === 0 && investigadores.length > 0 && (
              <p className="text-center text-gray-600 text-lg">No se encontraron investigadores que coincidan con los filtros.</p>
            )}

            {!loading && !error && filtered.length > 0 && (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-600 font-semibold">
                    Mostrando <span className="text-primary">{filtered.length}</span> de <span className="text-primary">{investigadores.length}</span> investigadores
                  </p>
                </div>

                {/* Grid de investigadores */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((inv, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="bg-primary/10 rounded-full border border-primary/20 flex items-center justify-center w-12 h-12 flex-shrink-0">
                          <span className="material-symbols-outlined text-primary">person</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-primary break-words">{inv.nombre}</h3>
                          <p className="text-xs text-slate-600">{inv.facultad}</p>
                          <p className="text-xs text-slate-500">{inv.programa}</p>
                        </div>
                      </div>

                      <div className="mb-3 pb-3 border-t border-slate-200">
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-sm font-semibold text-slate-700">Productos:</span>
                          <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-bold">
                            {inv.cantidad_productos}
                          </span>
                        </div>
                      </div>

                      {inv.tipologias.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-slate-700 mb-2">Tipologías:</p>
                          <div className="flex flex-wrap gap-2">
                            {inv.tipologias.slice(0, 2).map((tip, i) => (
                              <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                                {tip}
                              </span>
                            ))}
                            {inv.tipologias.length > 2 && (
                              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                                +{inv.tipologias.length - 2} más
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <Link
                        to="/datos"
                        state={{ user, investigador: inv.nombre }}
                        className="inline-flex items-center gap-2 text-primary font-bold text-sm hover:gap-3 transition-all"
                      >
                        Ver productos
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </Link>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Botón volver */}
            <div className="flex justify-end mt-6">
              <button
                className="px-4 py-2 bg-slate-200 text-primary rounded-lg font-semibold hover:bg-slate-300 transition-all"
                onClick={() => window.history.back()}
              >
                <span className="material-symbols-outlined align-middle mr-2">arrow_back</span>
                Volver
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Modal para Agregar Investigador */}
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
              {formSuccess && (
                <div className="col-span-1 md:col-span-2 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                  ✓ Investigador guardado exitosamente
                </div>
              )}
              {formError && (
                <div className="col-span-1 md:col-span-2 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                  Error: {formError}
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
                <button className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2" type="submit" disabled={formLoading}>
                  <span className="material-symbols-outlined text-xl">{formLoading ? 'hourglass_top' : 'save'}</span>
                  {formLoading ? 'Guardando...' : 'Guardar Investigador'}
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
