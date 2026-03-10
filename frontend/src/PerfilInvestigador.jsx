import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { API_BASE } from './config';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

const CHART_BLUE = '#2A5783';
const CHART_YELLOW = '#F5A800';

const TIPOLOGIA_CONFIG = [
  { sigla: 'NC', label: 'Nuevo Conocimiento' },
  { sigla: 'DTI', label: 'Desarrollo Tecnológico e Innovación' },
  { sigla: 'FRH', label: 'Formación del Recurso Humano' },
  { sigla: 'ASC', label: 'Apropiación Social del Conocimiento' },
  { sigla: 'DPC', label: 'Divulgación Pública de la Ciencia' }
];

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

function normalizeSortValue(value) {
  return String(value || '').toLowerCase().trim();
}

const assetImages = import.meta.glob('./assets/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default'
});

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
  if (a.length >= 5 && b.length >= 5 && a.slice(0, 5) === b.slice(0, 5)) return true;
  return false;
}

function getInvestigatorImage(nombre) {
  const normalizedName = normalizeText(nombre);
  const nameTokens = tokenize(nombre);
  if (!normalizedName || nameTokens.length === 0) return null;

  let bestMatch = null;
  let bestScore = 0;

  for (const [path, src] of Object.entries(assetImages)) {
    const fileName = path.split('/').pop() || '';
    const baseName = fileName.replace(/\.[^.]+$/, '');
    const normalizedFileName = normalizeText(baseName);
    const fileTokens = tokenize(baseName);

    if (normalizedFileName.includes('logo') || normalizedFileName.includes('fondo')) {
      continue;
    }

    if (normalizedName.includes(normalizedFileName) || normalizedFileName.includes(normalizedName)) {
      return src;
    }

    const overlap = nameTokens.filter((nameToken) =>
      fileTokens.some((fileToken) => tokenSimilar(fileToken, nameToken))
    );

    if (overlap.length > bestScore) {
      bestScore = overlap.length;
      bestMatch = src;
    }
  }

  return bestScore >= 2 ? bestMatch : null;
}

export default function PerfilInvestigador() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;
  const nombreInvestigador = location.state?.nombreInvestigador;
  const homePath = user?.role === 'admin' ? '/homeadmin' : '/home';
  const userName = user?.email?.split('@')[0] || 'Usuario';

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [datosInvestigador, setDatosInvestigador] = React.useState(null);
  const [selectedTipologia, setSelectedTipologia] = React.useState(null);

  React.useEffect(() => {
    if (!nombreInvestigador) {
      setError('No se especificó un investigador');
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Buscar datos del investigador desde los resultados
        const res = await fetch(`${API_BASE}/resultados`);
        if (!res.ok) throw new Error('Error fetching resultados');
        const data = await res.json();

        // Filtrar por nombre del investigador
        const datosInv = data.filter(r => r.nombre === nombreInvestigador);
        
        console.log('[PerfilInvestigador] Datos filtrados:', datosInv);
        console.log('[PerfilInvestigador] Total registros encontrados:', datosInv.length);
        
        if (datosInv.length === 0) {
          throw new Error('No se encontraron datos del investigador');
        }

        // Obtener el primer registro para datos básicos
        const primerRegistro = datosInv[0];
        console.log('[PerfilInvestigador] Primer registro:', primerRegistro);
        console.log('[PerfilInvestigador] Sexo:', primerRegistro.sexo);
        console.log('[PerfilInvestigador] Grado:', primerRegistro.grado);

        // Obtener el último grado (el más reciente o el que tenga valor)
        const gradosDisponibles = datosInv.filter(r => r.grado).map(r => r.grado);
        console.log('[PerfilInvestigador] Grados disponibles:', gradosDisponibles);
        const ultimoGrado = gradosDisponibles.length > 0 ? gradosDisponibles[gradosDisponibles.length - 1] : 'No disponible';

        setDatosInvestigador({
          nombre_completo: primerRegistro.nombre,
          genero: primerRegistro.sexo || 'No disponible',
          facultad: primerRegistro.facultad || 'No disponible',
          programa: primerRegistro.programa || 'No disponible',
          link_cvlac: primerRegistro.link_cvlac || null,
          ultimo_grado: ultimoGrado,
          correo: primerRegistro.correo || 'No disponible',
          orcid: primerRegistro.orcid || null,
          google_scholar: primerRegistro.google_scholar || null,
          totalProductos: datosInv.length,
          productos: datosInv
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [nombreInvestigador]);

  const correoLimpio = React.useMemo(() => {
    const correoRaw = datosInvestigador?.correo;
    if (!correoRaw || correoRaw === 'No disponible') return '';

    // Normaliza entradas como "mailto:correo@dominio.com" o con espacios accidentales.
    const normalizado = String(correoRaw).replace(/^mailto:/i, '').trim();
    return normalizado;
  }, [datosInvestigador]);

  const mailtoHref = correoLimpio ? `mailto:${encodeURIComponent(correoLimpio)}` : '';

  const fotoInvestigador = React.useMemo(() => {
    const nombreObjetivo = datosInvestigador?.nombre_completo || nombreInvestigador;
    return getInvestigatorImage(nombreObjetivo);
  }, [datosInvestigador, nombreInvestigador]);

  const tipologiasData = React.useMemo(() => {
    const productos = datosInvestigador?.productos || [];

    return TIPOLOGIA_CONFIG.map((tip) => {
      const items = productos.filter((row) => {
        const sigla = tipologiaToSigla(row.nodo_padre || row.nodo_padre_grouplab);
        return sigla === tip.sigla;
      });

      const byYear = {};
      items.forEach((item) => {
        const anioRaw = item.anio;
        const anio = anioRaw === null || anioRaw === undefined || anioRaw === '' ? 'Sin año' : String(anioRaw);
        byYear[anio] = (byYear[anio] || 0) + 1;
      });

      const labels = Object.keys(byYear).sort((a, b) => {
        if (a === 'Sin año') return 1;
        if (b === 'Sin año') return -1;
        return Number(a) - Number(b);
      });

      return {
        ...tip,
        count: items.length,
        items,
        chartLabels: labels.length > 0 ? labels : ['Sin datos'],
        chartValues: labels.length > 0 ? labels.map((year) => byYear[year]) : [0]
      };
    });
  }, [datosInvestigador]);

  if (!nombreInvestigador) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">No se especificó un investigador</p>
          <button
            onClick={() => navigate('/DirectorioInvestigadores', { state: { user } })}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
          >
            Volver al Directorio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 md:px-16 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-10 rounded-lg bg-primary text-white">
            <span className="material-symbols-outlined text-2xl">person</span>
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

      {/* Main Content */}
      <div className="container mx-auto flex-1 flex flex-col">
        <main className="flex-1 flex flex-col items-center py-8 px-6 md:px-16">
          <div className="max-w-4xl w-full flex flex-col gap-6">
            {/* Botón volver */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/DirectorioInvestigadores', { state: { user } })}
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-primary rounded-lg font-semibold hover:bg-slate-300 transition-all"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                <span>Volver al Directorio</span>
              </button>
            </div>

            {loading && (
              <div className="text-center py-12">
                <p className="text-lg text-slate-500">Cargando perfil del investigador...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <p className="text-red-600 text-lg">Error: {error}</p>
              </div>
            )}

            {!loading && !error && datosInvestigador && (
              <>
                {/* Encabezado del perfil */}
                <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 text-white shadow-lg">
                  <div className="flex items-center gap-6">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full border-2 border-white/40 flex items-center justify-center w-24 h-24">
                      {fotoInvestigador ? (
                        <img
                          src={fotoInvestigador}
                          alt={`Foto de ${datosInvestigador.nombre_completo}`}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-6xl">person</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold mb-2">{datosInvestigador.nombre_completo}</h1>
                      <p className="text-white/90 text-lg">{datosInvestigador.facultad}</p>
                      <p className="text-white/80">{datosInvestigador.programa}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/80 text-sm">Total de Productos</p>
                      <p className="text-4xl font-bold">{datosInvestigador.totalProductos}</p>
                    </div>
                  </div>
                </div>

                {/* Información básica */}
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 md:p-7">
                  <div className="mb-6 pb-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">info</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-primary leading-tight">Información Básica</h2>
                      <p className="text-sm text-slate-500">Resumen general del investigador</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">Nombre Completo</p>
                      <p className="text-base md:text-lg text-slate-900 font-semibold break-words">{datosInvestigador.nombre_completo}</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">Género</p>
                      <p className="text-base md:text-lg text-slate-900 font-semibold">{datosInvestigador.genero}</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                      <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">Último Grado Obtenido</p>
                      <p className="text-base md:text-lg text-slate-900 font-semibold break-words">{datosInvestigador.ultimo_grado}</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                      <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">Correo Electrónico</p>
                      {correoLimpio ? (
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <p className="text-base md:text-lg text-slate-900 font-semibold break-all">{correoLimpio}</p>
                          <button
                            type="button"
                            onClick={() => {
                              if (mailtoHref) {
                                window.location.href = mailtoHref;
                              }
                            }}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-all"
                          >
                            <span className="material-symbols-outlined text-base">mail</span>
                            Enviar correo
                          </button>
                        </div>
                      ) : (
                        <p className="text-base md:text-lg text-slate-900 font-semibold break-all">No disponible</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Enlaces académicos */}
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 md:p-7">
                  <div className="mb-6 pb-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">bar_chart</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-primary leading-tight">Producción por Tipología</h2>
                      <p className="text-sm text-slate-500">Haz clic en la cantidad para ver el listado de productos</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tipologiasData.map((tip, tipIndex) => (
                      <div key={tip.sigla} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">{tip.sigla}</p>
                            <h3 className="text-sm md:text-base font-bold text-slate-900">{tip.label}</h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedTipologia({
                              ...tip,
                              selectedYear: null,
                              sortDir: 'asc'
                            })}
                            className="inline-flex items-center justify-center min-w-10 h-10 px-3 rounded-full bg-primary text-white font-bold hover:bg-primary/90 transition-all"
                            title="Ver productos de esta tipología"
                          >
                            {tip.count}
                          </button>
                        </div>

                        <div className="h-44">
                          {(() => {
                            const tipColor = tipIndex % 2 === 0 ? CHART_BLUE : CHART_YELLOW;
                            return (
                          <Bar
                            data={{
                              labels: tip.chartLabels,
                              datasets: [
                                {
                                  label: 'Productos',
                                  data: tip.chartValues,
                                  backgroundColor: tipColor,
                                  borderColor: tipColor,
                                  borderWidth: 1,
                                  borderRadius: 6
                                }
                              ]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: false },
                                title: { display: false },
                                tooltip: { enabled: true },
                                datalabels: {
                                  formatter: (value) => value,
                                  anchor: 'center',
                                  align: 'center',
                                  font: {
                                    weight: 'bold',
                                    size: 11
                                  },
                                  color: tipColor === CHART_YELLOW ? '#1E3A5F' : '#FFFFFF'
                                }
                              },
                              onClick: (_event, elements) => {
                                if (!elements || elements.length === 0) return;
                                const index = elements[0].index;
                                const selectedYear = tip.chartLabels[index] || null;
                                setSelectedTipologia({
                                  ...tip,
                                  selectedYear,
                                  sortDir: 'asc'
                                });
                              },
                              scales: {
                                x: {
                                  ticks: { font: { size: 10 } }
                                },
                                y: {
                                  beginAtZero: true,
                                  ticks: {
                                    stepSize: 1,
                                    precision: 0
                                  }
                                }
                              }
                            }}
                          />
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
                  <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined">link</span>
                    Enlaces Académicos
                  </h2>

                  <div className="space-y-4">
                    {/* CVLAC */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 rounded-full p-2">
                          <span className="material-symbols-outlined text-primary">description</span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">CVLAC</p>
                          <p className="text-sm text-slate-600">Curriculum Vitae Latinoamericano y del Caribe</p>
                        </div>
                      </div>
                      {datosInvestigador.link_cvlac ? (
                        <a
                          href={datosInvestigador.link_cvlac}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-all"
                        >
                          Ver perfil
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-sm italic">No disponible</span>
                      )}
                    </div>

                    {/* ORCID */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 rounded-full p-2">
                          <span className="material-symbols-outlined text-green-600">badge</span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">ORCID</p>
                          <p className="text-sm text-slate-600">Open Researcher and Contributor ID</p>
                        </div>
                      </div>
                      {datosInvestigador.orcid ? (
                        <a
                          href={datosInvestigador.orcid}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
                        >
                          Ver perfil
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-sm italic">No disponible</span>
                      )}
                    </div>

                    {/* Google Scholar */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 rounded-full p-2">
                          <span className="material-symbols-outlined text-blue-600">school</span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Google Scholar</p>
                          <p className="text-sm text-slate-600">Perfil académico en Google Scholar</p>
                        </div>
                      </div>
                      {datosInvestigador.google_scholar ? (
                        <a
                          href={datosInvestigador.google_scholar}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
                        >
                          Ver perfil
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-sm italic">No disponible</span>
                      )}
                    </div>
                  </div>
                </div>

              </>
            )}
          </div>
        </main>
      </div>

      {selectedTipologia && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedTipologia(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-primary text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">{selectedTipologia.label}</h3>
                <p className="text-sm text-white/90">
                  {selectedTipologia.selectedYear
                    ? `Año ${selectedTipologia.selectedYear} - ${selectedTipologia.items.filter((item) => String(item.anio || 'Sin año') === String(selectedTipologia.selectedYear)).length} producto(s)`
                    : `${selectedTipologia.count} producto(s)`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTipologia(null)}
                className="rounded-full bg-white/20 hover:bg-white/30 size-10 flex items-center justify-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {(() => {
                const rowsBase = selectedTipologia.selectedYear
                  ? selectedTipologia.items.filter((item) => String(item.anio || 'Sin año') === String(selectedTipologia.selectedYear))
                  : selectedTipologia.items;

                const sortDir = selectedTipologia.sortDir || 'asc';

                const rows = [...rowsBase].sort((a, b) => {
                  const at = normalizeSortValue(a.tipo_proyecto || a.tipo_grouplab || '');
                  const bt = normalizeSortValue(b.tipo_proyecto || b.tipo_grouplab || '');
                  if (at < bt) return sortDir === 'asc' ? -1 : 1;
                  if (at > bt) return sortDir === 'asc' ? 1 : -1;

                  // Desempate estable por año para mantener una lectura consistente.
                  const ay = Number(a.anio) || 0;
                  const by = Number(b.anio) || 0;
                  return by - ay;
                });

                if (rows.length === 0) {
                  return <p className="text-slate-500 text-center py-8">No hay productos registrados para esta selección.</p>;
                }

                return (
                  <>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold border bg-primary text-white border-primary"
                      >
                        Ordenar por tipo
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTipologia((prev) => ({ ...prev, sortDir: (prev.sortDir || 'desc') === 'asc' ? 'desc' : 'asc' }))}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold border bg-white text-slate-700 border-slate-300"
                      >
                        {sortDir === 'asc' ? 'Ascendente' : 'Descendente'}
                      </button>
                    </div>

                    <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300">
                        <th className="text-left p-3 text-sm font-bold text-slate-700">#</th>
                        <th className="text-left p-3 text-sm font-bold text-slate-700">Título</th>
                        <th
                          className="text-left p-3 text-sm font-bold text-slate-700 cursor-pointer select-none"
                          onClick={() => setSelectedTipologia((prev) => ({
                            ...prev,
                            sortDir: (prev.sortDir || 'asc') === 'asc' ? 'desc' : 'asc'
                          }))}
                        >
                          Tipo {sortDir === 'asc' ? '↑' : '↓'}
                        </th>
                        <th className="text-left p-3 text-sm font-bold text-slate-700">Año</th>
                        <th className="text-left p-3 text-sm font-bold text-slate-700">Facultad</th>
                        <th className="text-left p-3 text-sm font-bold text-slate-700">Programa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((producto, index) => (
                        <tr key={`${producto.id || 'row'}-${index}`} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="p-3 text-sm text-slate-600">{index + 1}</td>
                          <td className="p-3 text-sm text-slate-900">{producto.titulo_proyecto || producto.titulo_grouplab || 'Sin título'}</td>
                          <td className="p-3 text-sm text-slate-600">{producto.tipo_proyecto || producto.tipo_grouplab || 'N/A'}</td>
                          <td className="p-3 text-sm text-slate-600">{producto.anio || 'N/A'}</td>
                          <td className="p-3 text-sm text-slate-600">{producto.facultad || 'N/D'}</td>
                          <td className="p-3 text-sm text-slate-600">{producto.programa || 'N/D'}</td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
