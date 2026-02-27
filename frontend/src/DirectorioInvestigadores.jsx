import React from "react";
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { API_BASE } from './config';

export default function DirectorioInvestigadores() {
  const [resultados, setResultados] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState('');
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
        const res = await fetch(url);
        if (!res.ok) throw new Error('Error fetching resultados');
        const data = await res.json();
        setResultados(data);
      } catch (err) {
        setError('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filters]);

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
            {/* Título */}
            <h1 className="text-3xl font-bold text-primary">Directorio de Investigadores</h1>

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
    </div>
  );
}
