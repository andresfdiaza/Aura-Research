import React from "react";
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { API_BASE, SERVER_BASE } from './config';
import AuraLogo from './components/AuraLogo';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

const assetImages = import.meta.glob('./assets/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default'
});

const TIPOLOGIA_ORDER = ['NC', 'DTI', 'FRH', 'ASC', 'DPC'];
const TIPOLOGIA_LABELS = {
  NC: 'Nuevo Conocimiento',
  DTI: 'Desarrollo Tecnologico e Innovacion',
  FRH: 'Formacion del Recurso Humano',
  ASC: 'Apropiacion Social del Conocimiento',
  DPC: 'Divulgacion Publica de la Ciencia'
};

// Colores institucionales UNAC (intercalados para la grafica).
const CHART_COLOR_PRIMARY = '#2A5783';
const CHART_COLOR_ACCENT = '#F5A800';

function normalizeText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenize(text) {
  const stopwords = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'docente', 'unac']);
  return normalizeText(text)
    .split(' ')
    .filter((token) => token.length > 1 && !stopwords.has(token));
}

function tokenSimilar(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.startsWith(b) || b.startsWith(a)) return true;

  // Tolerancia para variaciones pequeñas (ej: cordoba/cordova).
  if (a.length >= 5 && b.length >= 5 && a.slice(0, 5) === b.slice(0, 5)) {
    return true;
  }

  return false;
}

function getInvestigatorImage(nombre) {
  const normalizedName = normalizeText(nombre);
  const nameTokens = tokenize(nombre);
  if (!normalizedName || nameTokens.length === 0) return null;

  const entries = Object.entries(assetImages);
  let bestMatch = null;
  let bestScore = 0;

  for (const [path, src] of entries) {
    const fileName = path.split('/').pop() || '';
    const baseName = fileName.replace(/\.[^.]+$/, '');
    const normalizedFileName = normalizeText(baseName);
    const fileTokens = tokenize(baseName);

    // Excluir imágenes de branding/fondo.
    if (normalizedFileName.includes('logo') || normalizedFileName.includes('fondo')) {
      continue;
    }

    // Coincidencia exacta o por contención completa.
    if (normalizedName.includes(normalizedFileName) || normalizedFileName.includes(normalizedName)) {
      return src;
    }

    // Coincidencia por tokens (nombre/apellido) con tolerancia a variaciones.
    const overlap = nameTokens.filter((nameToken) =>
      fileTokens.some((fileToken) =>
        tokenSimilar(fileToken, nameToken)
      )
    );

    const score = overlap.length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = src;
    }
  }

  // Requerimos al menos 2 tokens coincidentes para evitar asignaciones erróneas.
  return bestScore >= 2 ? bestMatch : null;
}

function tipologiaToSigla(tipologia) {
  const t = normalizeText(tipologia);
  if (!t) return null;
  if (t.includes('nuevo conocimiento')) return 'NC';
  if (t.includes('desarrollo tecnologico') || t.includes('innovacion')) return 'DTI';
  if (t.includes('formacion') || t.includes('recurso humano')) return 'FRH';
  if (t.includes('apropiacion social')) return 'ASC';
  if (t.includes('divulgacion publica')) return 'DPC';
  return null;
}

function getOrderedTipologiaData(productosPorTipologia) {
  const acumulado = { NC: 0, DTI: 0, FRH: 0, ASC: 0, DPC: 0 };

  Object.entries(productosPorTipologia || {}).forEach(([tipologia, cantidad]) => {
    const sigla = tipologiaToSigla(tipologia);
    if (sigla) {
      acumulado[sigla] += Number(cantidad) || 0;
    }
  });

  return {
    labels: TIPOLOGIA_ORDER,
    values: TIPOLOGIA_ORDER.map((sigla) => acumulado[sigla])
  };
}

function toTitleCase(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b\p{L}/gu, (char) => char.toUpperCase());
}

function parseProgramas(programaValue) {
  return String(programaValue || '')
    .split(/[,/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function DirectorioInvestigadores() {
  const [resultados, setResultados] = React.useState([]);
  const [programasCatalogo, setProgramasCatalogo] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [formData, setFormData] = React.useState({
    nombre_completo: '',
    cedula: '',
    link_cvlac: '',
    facultad: '',
    programas: [],
    correo: '',
    google_scholar: '',
    orcid: '',
  });
  const [formLoading, setFormLoading] = React.useState(false);
  const [formError, setFormError] = React.useState(null);
  const [formSuccess, setFormSuccess] = React.useState(false);
  const [filters, setFilters] = React.useState({
    facultad: '',
    programa: ''
  });
  const [selectedTipologia, setSelectedTipologia] = React.useState(null);
  const [filtroTipoProyecto, setFiltroTipoProyecto] = React.useState('');

  // Obtener datos del backend
  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (filters.facultad) qs.append('facultad', filters.facultad);
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
  }, [filters.facultad]);

  // Cargar catálogo oficial de programas para el filtro.
  React.useEffect(() => {
    const loadProgramas = async () => {
      try {
        const res = await fetch(`${API_BASE}/programas`);
        if (!res.ok) return;
        const data = await res.json();
        setProgramasCatalogo(Array.isArray(data) ? data : []);
      } catch (_err) {
        setProgramasCatalogo([]);
      }
    };
    loadProgramas();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProgramaChange = (e) => {
    const { value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      programas: checked
        ? [...prev.programas, value]
        : prev.programas.filter((p) => p !== value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    setFormSuccess(false);

    try {
      const res = await fetch(`${API_BASE}/investigadores`, {
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
        programas: [],
        correo: '',
        google_scholar: '',
        orcid: '',
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
      parseProgramas(r.programa).forEach((p) => {
        if (p && !opts.programa.includes(p)) opts.programa.push(p);
      });
    });
    // Si hay catálogo, agregar solo los que no están ya
    programasCatalogo.forEach((p) => {
      if (p && !opts.programa.includes(p)) opts.programa.push(p);
    });
    Object.values(opts).forEach(arr => arr.sort());
    return opts;
  }, [resultados, programasCatalogo]);

  // Obtener lista única de investigadores con conteo de productos por tipología
  const investigadores = React.useMemo(() => {
    const investigadoresMap = {};
    
    resultados.forEach(r => {
      const nombre = r.nombre || 'Sin nombre';
      const nombreMostrar = r.nombre_completo || toTitleCase(nombre);
      if (!investigadoresMap[nombre]) {
        investigadoresMap[nombre] = {
          nombre,
          nombreMostrar,
          facultad: r.facultad || 'Sin facultad',
          programas: [],
          grupoInvestigacion: r.sigla_grupo_grouplab || r.nombre_grupo_grouplab || 'GI2A',
          tipoInvestigador: r.categoria || 'Sin categoría',
          productosPorTipologia: {},
          articulosCount: 0,
          totalProductos: 0
        };
      }

      // Agregar programa si no está ya en la lista
      parseProgramas(r.programa).forEach((p) => {
        if (!investigadoresMap[nombre].programas.includes(p)) {
          investigadoresMap[nombre].programas.push(p);
        }
      });

      // Completar datos de perfil si en registros siguientes aparecen valores más ricos.
      if (!investigadoresMap[nombre].grupoInvestigacion || investigadoresMap[nombre].grupoInvestigacion === 'GI2A') {
        investigadoresMap[nombre].grupoInvestigacion = r.sigla_grupo_grouplab || r.nombre_grupo_grouplab || investigadoresMap[nombre].grupoInvestigacion;
      }
      if ((!investigadoresMap[nombre].tipoInvestigador || investigadoresMap[nombre].tipoInvestigador === 'Sin categoría') && r.categoria) {
        investigadoresMap[nombre].tipoInvestigador = r.categoria;
      }

      investigadoresMap[nombre].totalProductos += 1;

      const tipoProyectoNormalizado = normalizeText(r.tipo_proyecto || '');
      if (tipoProyectoNormalizado.includes('articulo')) {
        investigadoresMap[nombre].articulosCount += 1;
      }

      const tipologia = r.nodo_padre || 'Sin tipología';
      if (!investigadoresMap[nombre].productosPorTipologia[tipologia]) {
        investigadoresMap[nombre].productosPorTipologia[tipologia] = 0;
      }
      investigadoresMap[nombre].productosPorTipologia[tipologia] += 1;
    });

    return Object.values(investigadoresMap).sort((a, b) => {
      if (b.articulosCount !== a.articulosCount) {
        return b.articulosCount - a.articulosCount;
      }
      if (b.totalProductos !== a.totalProductos) {
        return b.totalProductos - a.totalProductos;
      }
      return a.nombre.localeCompare(b.nombre, 'es');
    });
  }, [resultados]);

  // Filtrar investigadores por búsqueda
  const filtered = React.useMemo(() => {
    return investigadores.filter(inv => {
      const nombre = (inv.nombre || '').toLowerCase();
      const facultad = (inv.facultad || '').toLowerCase();
      const programasStr = (inv.programas || []).join(' ').toLowerCase();
      const search = searchTerm.toLowerCase();

      const matchSearch = nombre.includes(search) || facultad.includes(search) || programasStr.includes(search);
      const matchFacultad = !filters.facultad || inv.facultad === filters.facultad;
      const matchPrograma = !filters.programa || inv.programas.includes(filters.programa);

      return matchSearch && matchFacultad && matchPrograma;
    });
  }, [investigadores, searchTerm, filters]);

  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;
  const homePath = user?.role === 'admin' ? '/homeadmin' : '/home';
  const userName = user?.email?.split('@')[0] || 'Usuario';

  // Handler para clic en barras de tipología
  const handleTipologiaClick = (nombreInvestigador, sigla) => {
    // Filtrar productos del investigador por tipología
    const productosInvestigador = resultados.filter(r => {
      const match = (r.nombre || '') === nombreInvestigador;
      if (!match) return false;
      
      const tipologiaSigla = tipologiaToSigla(r.nodo_padre);
      return tipologiaSigla === sigla;
    });

    setSelectedTipologia({
      investigador: nombreInvestigador,
      sigla: sigla,
      tipologia: TIPOLOGIA_LABELS[sigla],
      productos: productosInvestigador,
      filtroAnio: ''
    });
    setFiltroTipoProyecto('');
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 md:px-16 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-10 rounded-lg bg-primary text-white">
            <AuraLogo />
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
            className="text-slate-500 hover:text-primary text-sm font-semibold transition-colors"
            to={homePath}
            state={{ user }}
          >
            Inicio
          </Link>
          <Link
            className="text-primary text-sm font-bold border-b-2 border-accent pb-1"
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

              <div className="grid grid-cols-2 gap-4">
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
                  {filtered.map((inv, idx) => {
                    const fotoInvestigador = getInvestigatorImage(inv.nombreMostrar || inv.nombre);
                    const chartTipologia = getOrderedTipologiaData(inv.productosPorTipologia);
                    const investigatorChartColor = idx % 2 === 0 ? CHART_COLOR_PRIMARY : CHART_COLOR_ACCENT;

                    return (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                      >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="bg-primary/10 rounded-full border border-primary/20 flex items-center justify-center w-12 h-12 flex-shrink-0">
                          {fotoInvestigador ? (
                            <img
                              src={fotoInvestigador}
                              alt={`Foto de ${inv.nombreMostrar || inv.nombre}`}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-primary">person</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <Link
                            to="/PerfilInvestigador"
                            state={{ user, nombreInvestigador: inv.nombre }}
                            className="hover:underline"
                          >
                            <h3 className="text-lg font-bold text-primary break-words hover:text-primary/80 transition-colors cursor-pointer">
                              {inv.nombreMostrar || inv.nombre}
                            </h3>
                          </Link>
                          <p className="text-xs text-slate-600">{inv.facultad}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-semibold">
                              Programa: {inv.programas && inv.programas.length > 0 ? inv.programas.join(', ') : 'Sin programa'}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold">
                              Grupo: {inv.grupoInvestigacion || 'GI2A'}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-semibold">
                              {inv.tipoInvestigador || 'Sin categoría'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Gráfica horizontal por tipología */}
                      <div className="mb-3 pb-3 border-t border-slate-200 pt-3">
                        <p className="text-xs font-semibold text-slate-700 mb-2">Productos por Tipología:</p>
                        <div className="h-[200px]">
                          <Bar
                            data={{
                              labels: chartTipologia.labels,
                              datasets: [{
                                label: 'Productos',
                                data: chartTipologia.values,
                                backgroundColor: investigatorChartColor,
                                borderColor: investigatorChartColor,
                                borderWidth: 1
                              }]
                            }}
                            options={{
                              indexAxis: 'y',
                              responsive: true,
                              maintainAspectRatio: false,
                              onClick: (event, elements) => {
                                if (elements.length > 0) {
                                  const index = elements[0].index;
                                  const sigla = chartTipologia.labels[index];
                                  handleTipologiaClick(inv.nombre, sigla);
                                }
                              },
                              plugins: {
                                legend: {
                                  display: false
                                },
                                datalabels: {
                                  color: investigatorChartColor === CHART_COLOR_ACCENT ? '#1E3A5F' : '#ffffff',
                                  font: {
                                    weight: 'bold',
                                    size: 12
                                  },
                                  anchor: 'center',
                                  align: 'center',
                                  offset: 0,
                                  padding: {
                                    right: 6
                                  }
                                },
                                tooltip: {
                                  callbacks: {
                                    title: function(context) {
                                      const sigla = chartTipologia.labels[context[0].dataIndex];
                                      return `${sigla} - ${TIPOLOGIA_LABELS[sigla] || sigla}`;
                                    }
                                  }
                                }
                              },
                              scales: {
                                x: {
                                  beginAtZero: true,
                                  ticks: {
                                    stepSize: 1,
                                    font: { size: 10 }
                                  }
                                },
                                y: {
                                  ticks: {
                                    font: { size: 9 }
                                  }
                                }
                              }
                            }}
                          />
                        </div>
                      </div>

                      <Link
                        to="/datos"
                        state={{ user, investigador: inv.nombre }}
                        className="inline-flex items-center gap-2 text-primary font-bold text-sm hover:gap-3 transition-all"
                      >
                        Ver productos
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </Link>
                      </div>
                    );
                  })}
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
              {/* Correo Electrónico */}
              <div className="col-span-1">
                <label className="block mb-2 text-slate-700 dark:text-slate-300 text-sm font-semibold">Correo Electrónico</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                  <input className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="correo@ejemplo.com" type="email" name="correo" value={formData.correo} onChange={handleInputChange} />
                </div>
              </div>
              {/* Link Google Scholar */}
              <div className="col-span-1">
                <label className="block mb-2 text-slate-700 dark:text-slate-300 text-sm font-semibold">Link de Google Scholar</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">school</span>
                  <input className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="https://scholar.google.com/..." type="url" name="google_scholar" value={formData.google_scholar} onChange={handleInputChange} />
                </div>
              </div>
              {/* Link ORCID */}
              <div className="col-span-1">
                <label className="block mb-2 text-slate-700 dark:text-slate-300 text-sm font-semibold">Link de ORCID</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">fingerprint</span>
                  <input className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="https://orcid.org/0000-0000-0000-0000" type="url" name="orcid" value={formData.orcid} onChange={handleInputChange} />
                </div>
              </div>
              {/* Facultad */}
              <div className="col-span-1">
                <label className="block mb-2 text-slate-700 dark:text-slate-300 text-sm font-semibold">Facultad</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">account_balance</span>
                  <select className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none" name="facultad" value={formData.facultad} onChange={handleInputChange}>
                    <option value="">Seleccione Facultad</option>
                    <option value="Facultad de Ingeniería">Facultad de Ingeniería</option>
                    <option value="Facultad de Ciencias de la Salud">Facultad de Ciencias de la Salud</option>
                    <option value="Facultad de Educación">Facultad de Educación</option>
                    <option value="Facultad de Teología">Facultad de Teología</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                </div>
              </div>
              {/* Programas Académicos - Selección Múltiple */}
              <div className="col-span-1">
                <label className="block mb-2 text-slate-700 dark:text-slate-300 text-sm font-semibold">Programas Académicos (puede seleccionar varios)</label>
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" value="Ingeniería de Sistemas" checked={formData.programas.includes('Ingeniería de Sistemas')} onChange={handleProgramaChange} className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary" />
                    <span className="text-slate-900 dark:text-slate-100">Ingeniería de Sistemas</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" value="Ingeniería Industrial" checked={formData.programas.includes('Ingeniería Industrial')} onChange={handleProgramaChange} className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary" />
                    <span className="text-slate-900 dark:text-slate-100">Ingeniería Industrial</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" value="Especialización en Inteligencia de Negocios y Big Data" checked={formData.programas.includes('Especialización en Inteligencia de Negocios y Big Data')} onChange={handleProgramaChange} className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary" />
                    <span className="text-slate-900 dark:text-slate-100">Especialización en Inteligencia de Negocios y Big Data</span>
                  </label>
                  {formData.programas.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-600 dark:text-slate-400">Seleccionados: {formData.programas.length}</p>
                    </div>
                  )}
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

      {/* Modal para Productos por Tipología */}
      {selectedTipologia && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-primary text-white p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{selectedTipologia.investigador}</h2>
                <p className="text-white/90 text-sm mt-1">
                  {selectedTipologia.sigla} - {selectedTipologia.tipologia}
                </p>
                <p className="text-white/80 text-xs mt-1">
                  {(() => {
                    let count = selectedTipologia.productos.length;
                    if (filtroTipoProyecto) {
                      count = selectedTipologia.productos.filter(p => p.tipo_proyecto === filtroTipoProyecto).length;
                    }
                    if (selectedTipologia.filtroAnio) {
                      count = selectedTipologia.productos.filter(p => 
                        (!filtroTipoProyecto || p.tipo_proyecto === filtroTipoProyecto) &&
                        String(p.anio) === String(selectedTipologia.filtroAnio)
                      ).length;
                    }
                    return `${count} producto(s) ${(filtroTipoProyecto || selectedTipologia.filtroAnio) ? 'filtrado(s)' : 'encontrado(s)'}`;
                  })()}
                </p>
              </div>
              <button
                onClick={() => setSelectedTipologia(null)}
                className="bg-[#F5A800] hover:bg-[#d99400] text-primary rounded-full p-2 transition-all shadow-lg"
              >
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>

            {/* Filtros */}
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Tipo:</label>
                    <select
                      className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]"
                      value={filtroTipoProyecto}
                      onChange={(e) => setFiltroTipoProyecto(e.target.value)}
                    >
                      <option value="">Todos los tipos</option>
                      {[...new Set(selectedTipologia.productos.map(p => p.tipo_proyecto).filter(Boolean))].sort().map(tipo => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Año:</label>
                    <select
                      className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[150px]"
                      value={selectedTipologia.filtroAnio || ''}
                      onChange={(e) => setSelectedTipologia(prev => ({ ...prev, filtroAnio: e.target.value }))}
                    >
                      <option value="">Todos los años</option>
                      {[...new Set(selectedTipologia.productos.map(p => p.anio).filter(Boolean))].sort((a, b) => b - a).map(anio => (
                        <option key={anio} value={anio}>{anio}</option>
                      ))}
                    </select>
                  </div>
                  {(filtroTipoProyecto || selectedTipologia.filtroAnio) && (
                    <button
                      onClick={() => {
                        setFiltroTipoProyecto('');
                        setSelectedTipologia(prev => ({ ...prev, filtroAnio: '' }));
                      }}
                      className="ml-auto text-sm text-primary font-semibold hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-base">filter_alt_off</span>
                      Limpiar filtros
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Tabla */}
            <div className="flex-1 overflow-auto p-6">
              {(() => {
                let productosFiltrados = selectedTipologia.productos;
                
                // Filtrar por tipo de proyecto
                if (filtroTipoProyecto) {
                  productosFiltrados = productosFiltrados.filter(p => p.tipo_proyecto === filtroTipoProyecto);
                }
                
                // Filtrar por año
                if (selectedTipologia.filtroAnio) {
                  productosFiltrados = productosFiltrados.filter(p => String(p.anio) === String(selectedTipologia.filtroAnio));
                }

                if (productosFiltrados.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-500">
                      <span className="material-symbols-outlined text-6xl mb-4 block opacity-30">search_off</span>
                      <p className="text-lg font-semibold">No se encontraron productos con estos filtros</p>
                    </div>
                  );
                }

                return (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-300">
                        <th className="text-left p-3 text-sm font-bold text-slate-700">#</th>
                        <th className="text-left p-3 text-sm font-bold text-slate-700">Título</th>
                        <th className="text-left p-3 text-sm font-bold text-slate-700">Tipo</th>
                        <th className="text-left p-3 text-sm font-bold text-slate-700">Año</th>
                        <th className="text-left p-3 text-sm font-bold text-slate-700">Categoría</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosFiltrados.map((producto, index) => (
                        <tr
                          key={index}
                          className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                          <td className="p-3 text-sm text-slate-600">{index + 1}</td>
                          <td className="p-3 text-sm text-slate-800">
                            {producto.titulo_proyecto || 'Sin título'}
                          </td>
                          <td className="p-3 text-sm text-slate-600">
                            {producto.tipo_proyecto || 'N/A'}
                          </td>
                          <td className="p-3 text-sm text-slate-600 text-center">
                            {producto.anio || 'N/A'}
                          </td>
                          <td className="p-3 text-sm">
                            <span className="inline-block px-2 py-1 bg-primary/10 text-primary rounded text-xs font-semibold">
                              {producto.categoria || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedTipologia(null)}
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
