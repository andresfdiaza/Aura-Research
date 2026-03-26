import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { API_BASE } from './config';
import AuraLogo from './components/AuraLogo';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar } from 'react-chartjs-2';

// register required components including arc element for pie/doughnut
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, ChartDataLabels);

export default function Datos() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;
  const homePath = user?.role === 'admin' ? '/homeadmin' : '/home';

  const [resultados, setResultados] = React.useState([]);
  const [totalResultados, setTotalResultados] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const [filters, setFilters] = React.useState({
    facultad: '',
    grupo: '',
    programa: '',
    categoria: '',
    cedula: '',
    sexo: '',
    grado: '',
    tipo_proyecto: '',
    tipologia_productos: '',
    titulo_proyecto: ''
  });

  // Catálogo de programas y facultades
  const [programasCatalogo, setProgramasCatalogo] = React.useState([]);
  const [facultadesCatalogo, setFacultadesCatalogo] = React.useState([]);
  React.useEffect(() => {
    const loadProgramas = async () => {
      try {
        const res = await fetch(`${API_BASE}/programas_full`);
        if (!res.ok) return;
        const data = await res.json();
        setProgramasCatalogo(Array.isArray(data) ? data : []);
      } catch (_err) {
        setProgramasCatalogo([]);
      }
    };
    const loadFacultades = async () => {
      try {
        const res = await fetch(`${API_BASE}/facultades`);
        if (!res.ok) return;
        const data = await res.json();
        setFacultadesCatalogo(Array.isArray(data) ? data : []);
      } catch (_err) {
        setFacultadesCatalogo([]);
      }
    };
    loadProgramas();
    loadFacultades();
  }, []);
  const chartRef = React.useRef();

  const openTableInNewTab = () => {
    if (!filtered || filtered.length === 0) {
      alert('No hay datos para mostrar en la tabla');
      return;
    }
    const headers = Object.keys(filtered[0]);
    const styles = `
      table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background: #f3f4f6; color: #0f172a; font-weight: 700; }
      tr:nth-child(even) { background: #fafafa; }
    `;
    const thead = `<tr>${headers.map(h => `<th>${displayLabel(h)}</th>`).join('')}</tr>`;
    const rows = filtered.map(r => `<tr>${headers.map(h => `<td>${(r[h] ?? '').toString().replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>`).join('')}</tr>`).join('');
    const html = `
      <html>
        <head>
          <title>Tabla de resultados</title>
          <meta charset="utf-8" />
          <style>${styles}</style>
        </head>
        <body>
          <h2>Tabla de resultados</h2>
          <div style="overflow:auto; max-width:100%;">
            <table>${thead}${rows}</table>
          </div>
        </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (!w) {
      alert('No se pudo abrir la pestaña. Revisa el bloqueador de popups.');
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  // institutional palette + helpers
  // extended professional palette including neutrals for bar charts
  const palette = ['#2A5783', '#F5A800', '#8F9FBF', '#4A4A4A', '#CCCCCC'];
  const pickColor = (i) => palette[i % palette.length];
  // separate palette for pie chart (bright/vibrant)
  const piePalette = ['#FF5733', '#33FF57', '#3357FF', '#FF33A8', '#33FFF5', '#F5FF33', '#FF8F33'];
  // generate n distinct colors using piePalette
  const generateColors = (n) => {
    const colors = [];
    for (let i = 0; i < n; i++) {
      if (i < piePalette.length) {
        colors.push(piePalette[i]);
      } else {
        const base = piePalette[i % piePalette.length];
        // for extras just rotate through with slight opacity
        colors.push(base + 'CC');
      }
    }
    return colors;
  };

  // Helper function to normalize text for comparison
  const normalizeText = (text) => {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  };

  // Convert full tipologia name to abbreviated form (sigla)
  const tipologiaToSigla = (tipologia) => {
    const t = normalizeText(tipologia);
    if (!t) return tipologia; // Return original if empty
    if (t.includes('nuevo conocimiento')) return 'NC';
    if (t.includes('desarrollo tecnologico') || t.includes('innovacion')) return 'DTI';
    if (t.includes('formacion') || t.includes('recurso humano')) return 'FRH';
    if (t.includes('apropiacion social')) return 'ASC';
    if (t.includes('divulgacion publica')) return 'DPC';
    // If no match, return original
    return tipologia;
  };

  const userName = user?.email?.split('@')[0] || 'Usuario';

  const labelMap = {
    facultad: 'Facultad',
    grupo: 'Grupo de Investigación',
    programa: 'Programa',
    investigador: 'Investigador',
    categoria: 'Categoría',
    cedula: 'Cédula',
    sexo: 'Sexo',
    grado: 'Grado',
    tipo_proyecto: 'Tipo de proyecto',
    titulo_proyecto: 'Título del proyecto'
  };
  const displayLabel = (k) => labelMap[k] || (k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));

  // Opciones de filtros dinámicas (programas y facultades desde catálogo)
  const filterOptions = React.useMemo(() => {
    const opts = {
      facultad: [], grupo: [], programa: [],
      categoria: [], cedula: [], sexo: [], grado: [], tipo_proyecto: [], tipologia_productos: [], titulo_proyecto: []
    };
    resultados.forEach(r => {
      if (r.facultad && !opts.facultad.includes(r.facultad)) opts.facultad.push(r.facultad);
      const grupo = (r.sigla_grupo_grouplab || r.nombre_grupo_grouplab || '').toString().trim();
      if (grupo && !opts.grupo.includes(grupo)) opts.grupo.push(grupo);
      if (r.categoria && !opts.categoria.includes(r.categoria)) opts.categoria.push(r.categoria);
      if (r.cedula && !opts.cedula.includes(r.cedula)) opts.cedula.push(r.cedula);
      if (r.sexo && !opts.sexo.includes(r.sexo)) opts.sexo.push(r.sexo);
      if (r.grado && !opts.grado.includes(r.grado)) opts.grado.push(r.grado);
      if (r.tipo_proyecto && !opts.tipo_proyecto.includes(r.tipo_proyecto)) opts.tipo_proyecto.push(r.tipo_proyecto);
      if (r.tipologia_productos && !opts.tipologia_productos.includes(r.tipologia_productos)) opts.tipologia_productos.push(r.tipologia_productos);
      if (r.titulo_proyecto && !opts.titulo_proyecto.includes(r.titulo_proyecto)) opts.titulo_proyecto.push(r.titulo_proyecto);
    });

    // Programas: todos los de la tabla programa, filtrados por facultad si aplica
    let programasFiltrados = programasCatalogo;
    if (filters.facultad) {
      // Buscar id_facultad de la facultad seleccionada
      const fac = facultadesCatalogo.find(f => f.nombre_facultad === filters.facultad);
      const idFac = fac?.id_facultad;
      if (idFac) {
        programasFiltrados = programasCatalogo.filter(p => String(p.id_facultad) === String(idFac));
      } else {
        programasFiltrados = [];
      }
    }
    opts.programa = programasFiltrados.map(p => p.nombre_programa);

    // sort options for nicer UI
    Object.values(opts).forEach(arr => arr.sort());
    return opts;
  }, [resultados, programasCatalogo, filters.facultad, facultadesCatalogo]);

  // compute filtered dataset
  const filtered = React.useMemo(() => {
    return resultados.filter(r => {
      if (filters.facultad && r.facultad !== filters.facultad) return false;
      if (filters.grupo) {
        const grupo = (r.sigla_grupo_grouplab || r.nombre_grupo_grouplab || '').toString().trim();
        if (grupo !== filters.grupo) return false;
      }
      if (filters.programa) {
        const programasArr = (r.programa || '').split(' / ').map(p => p.trim());
        if (!programasArr.includes(filters.programa)) return false;
      }
      if (filters.categoria && r.categoria !== filters.categoria) return false;
      if (filters.cedula && r.cedula !== filters.cedula) return false;
      if (filters.sexo && r.sexo !== filters.sexo) return false;
      if (filters.grado && r.grado !== filters.grado) return false;
      if (filters.tipo_proyecto && r.tipo_proyecto !== filters.tipo_proyecto) return false;
      if (filters.tipologia_productos && r.tipologia_productos !== filters.tipologia_productos) return false;
      if (filters.titulo_proyecto && r.titulo_proyecto !== filters.titulo_proyecto) return false;
      return true;
    });
  }, [resultados, filters]);

  // drill state for padre-hijo chart
  const [drillMode, setDrillMode] = React.useState(false);
  const [parentSelected, setParentSelected] = React.useState('');
  const topTipos = React.useMemo(() => {
    const counts = {};
    filtered.forEach((r) => {
      const tip = (r.nodo_padre || '').toString().trim();
      if (!tip) return;
      counts[tip] = (counts[tip] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [filtered]);

  const childColumns = React.useMemo(() => {
    if (!drillMode || !parentSelected) return [];
    const counts = {};
    filtered.forEach((r) => {
      const tip = (r.nodo_padre || '').toString().trim();
      if (tip !== parentSelected) return;
      const nodo = (r.tipo_proyecto || '').toString().trim();
      if (!nodo) return;
      counts[nodo] = (counts[nodo] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([nodo, cantidad]) => ({ nodo, cantidad }));
  }, [drillMode, parentSelected, filtered]);

  const computeParentCount = () => {
    const rec = topTipos.find(([t]) => t === parentSelected);
    return rec ? rec[1] : 0;
  };

  // compute counts by año locally from filtered results
  const yearCounts = React.useMemo(() => {
    const counts = {};
    filtered.forEach(r => {
      const y = r.anio || 'N/A';
      counts[y] = (counts[y] || 0) + 1;
    });
    return counts;
  }, [filtered]);

  const years = React.useMemo(() => {
    // sort keys numerically where possible
    const ks = Object.keys(yearCounts);
    ks.sort((a,b)=>{
      const na = parseInt(a);
      const nb = parseInt(b);
      if(!isNaN(na) && !isNaN(nb)) return na-nb;
      return a.localeCompare(b);
    });
    return ks;
  }, [yearCounts]);

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch filtered
        const qs = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => {
          if (v) qs.append(k, v);
        });
        const url = `${API_BASE}/tabla-normalizada-final${qs.toString() ? '?' + qs.toString() : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Error fetching tabla_normalizada_final');
        const data = await res.json();
        setResultados(data);

        // Fetch total (sin filtros)
        const resTotal = await fetch(`${API_BASE}/tabla-normalizada-final`);
        if (resTotal.ok) {
          const dataTotal = await resTotal.json();
          setTotalResultados(Array.isArray(dataTotal) ? dataTotal.length : 0);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filters]);

  const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

  const downloadCsvText = (csvText, fileName) => {
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = async () => {
    const today = new Date().toISOString().split('T')[0];
    const resultadosRows = Array.isArray(filtered) ? filtered : [];
    let normalizadaRows = [];

    // Traer tabla_Normalizada_final con filtros compatibles del backend.
    try {
      const qs = new URLSearchParams();
      if (filters.facultad) qs.append('facultad', filters.facultad);
      if (filters.programa) qs.append('programa', filters.programa);
      const url = `${API_BASE}/tabla-normalizada-final${qs.toString() ? `?${qs.toString()}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        normalizadaRows = Array.isArray(data) ? data : [];
      }
    } catch (_err) {
      normalizadaRows = [];
    }

    if (resultadosRows.length === 0 && normalizadaRows.length === 0) {
      alert('No hay datos para descargar');
      return;
    }

    const headersSet = new Set(['fuente']);
    resultadosRows.forEach((row) => Object.keys(row || {}).forEach((k) => headersSet.add(k)));
    normalizadaRows.forEach((row) => Object.keys(row || {}).forEach((k) => headersSet.add(k)));
    const headers = Array.from(headersSet);

    const toCsvRow = (fuente, row) => headers.map((h) => {
      if (h === 'fuente') return escapeCsv(fuente);
      return escapeCsv(row?.[h] ?? '');
    }).join(',');

    const csvContent = [
      headers.join(','),
      ...resultadosRows.map((row) => toCsvRow('resultados_filtrados', row)),
      ...normalizadaRows.map((row) => toCsvRow('tabla_normalizada_final', row)),
    ].join('\n');

    downloadCsvText(csvContent, `resultados_y_normalizada_${today}.csv`);
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
          </div>
        </div>
      </header>
      <div className="container mx-auto flex-1 flex flex-col">
        <main className="flex-1 flex flex-col items-center py-5 px-6 md:px-16">
          <div className="max-w-7xl w-full flex flex-col gap-8">
            {/* Back button moved to bottom */}
            <div className="flex justify-between items-center mb-0">
              <div className="flex items-center gap-6">
                <h1 className="text-3xl font-bold text-primary">Análisis y Estadísticas Generales</h1>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                >
                  <span className="material-symbols-outlined">download</span>
                  <span>Descargar CSV</span>
                </button>
                <button
                  onClick={() => window.history.back()}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-primary rounded-xl font-semibold hover:bg-slate-300 transition-all"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  <span>Volver</span>
                </button>
              </div>
            </div>

            {/* KPI cards on left, filters on right */}
            <div className="flex items-start justify-between mb-0 overflow-x-auto py-1">
              <div className="flex gap-4">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-2 shadow-sm w-36 h-24 flex flex-col justify-between">
                  <div>
                    <p className="text-xxs text-slate-600 font-medium mb-0.5">Total</p>
                    <p className="text-lg font-bold text-primary">{totalResultados.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xxs text-slate-500">Regs</p>
                    <div className="bg-primary/10 rounded-full p-0.5">
                      <span className="material-symbols-outlined text-base text-primary">database</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 rounded-xl p-2 shadow-sm w-36 h-24 flex flex-col justify-between">
                  <div>
                    <p className="text-xxs text-slate-600 font-medium mb-0.5">Filtr.</p>
                    <p className="text-lg font-bold text-accent">{filtered.length.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xxs text-slate-500">
                      {filtered.length === resultados.length ? 'Todos' : `${((filtered.length/resultados.length)*100).toFixed(1)}%`}
                    </p>
                    <div className="bg-accent/10 rounded-full p-0.5">
                      <span className="material-symbols-outlined text-base text-accent">filter_alt</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SOLO 3 FILTROS VISIBLES */}
              <div className="flex flex-row gap-3">
                {['facultad', 'grupo', 'programa'].map(key => (
                  <div key={key} className="w-[120px]">
                    <label className="block text-[9px] font-medium mb-1 truncate text-center">
                      {displayLabel(key)}
                    </label>
                    <select
                      className="w-full border rounded px-2 py-0.5 text-[10px] h-6 text-center appearance-none"
                      value={filters[key]}
                      onChange={e => setFilters(prev => ({ ...prev, [key]: e.target.value }))}
                      style={{textAlignLast: 'center'}}
                    >
                      <option value="">Todos</option>
                      {filterOptions[key]?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {loading && <p className="text-center text-lg">Cargando datos…</p>}
            {error && <p className="text-center text-red-600">Error: {error}</p>}

            {/* Diagrams side by side, smaller */}
            {!loading && !error && (topTipos.length > 0 || years.length > 0) && (
              <div className="flex flex-row gap-6 mb-0 w-full justify-between items-start flex-wrap">
                {/* parent/child drillable bar chart */}
                {topTipos.length > 0 && (
                  <div className="flex-1 min-w-[360px] h-96">
                    <Bar
                      ref={chartRef}
                      data={{
                        labels: drillMode
                          ? [
                              tipologiaToSigla(parentSelected),
                              ...childColumns.map(c => c.nodo)
                            ]
                          : topTipos.map(([t]) => tipologiaToSigla(t)),
                        datasets: [
                          {
                            label: drillMode ? 'Cantidad por nodo' : 'Cantidad',
                            data: drillMode
                              ? [computeParentCount(), ...childColumns.map(c => c.cantidad)]
                              : topTipos.map(([, c]) => c),
                            backgroundColor: drillMode
                              ? [pickColor(2), ...generateColors(childColumns.length)]
                              : pickColor(0) + 'CC'
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: drillMode
                              ? Math.max(computeParentCount(), ...childColumns.map(c => c.cantidad)) * 1.1111
                              : Math.max(...topTipos.map(([, c]) => c)) * 1.1111
                          }
                        },
                        plugins: {
                          legend: { display: false },
                          title: {
                            display: true,
                            text: drillMode
                              ? `Desglose de ${parentSelected}`
                              : 'Cantidad de Productos por Investigador según la Tipología',
                            font: {
                              size: 14
                            }
                          },
                          datalabels: {
                            anchor: 'end',
                            align: 'top',
                            offset: 12,
                            formatter: value => value,
                            font: { weight: 'bold' }
                          },
                          tooltip: {
                            callbacks: {
                              title: (items) => {
                                const idx = items[0].dataIndex;
                                if (drillMode) {
                                  if (idx === 0) return parentSelected;
                                  return childColumns[idx - 1]?.nodo || items[0].label;
                                }
                                return topTipos[idx] ? topTipos[idx][0] : items[0].label;
                              }
                            }
                          }
                        }
                      }}
                      onClick={(evt) => {
                        const chart = chartRef.current;
                        if (!chart) return;
                        const active = chart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
                        if (active.length > 0) {
                          const idx = active[0].index;
                          let fullLabel;
                          if (!drillMode) {
                            fullLabel = topTipos[idx] ? topTipos[idx][0] : chart.data.labels[idx];
                          } else {
                            fullLabel = idx === 0 ? parentSelected : childColumns[idx - 1]?.nodo;
                          }
                          if (!drillMode) {
                            setParentSelected(fullLabel);
                            setDrillMode(true);
                          } else {
                            if (idx === 0) {
                              setDrillMode(false);
                              setParentSelected('');
                            }
                          }
                        }
                      }}
                      height={384}
                    />
                  </div>
                )}

                {/* año chart */}
                {years.length > 0 && (
                  <div className="flex-1 min-w-[360px] h-96">
                    <Bar
                      data={{
                        labels: years,
                        datasets: [
                          {
                            label: 'Cantidad por año',
                            data: years.map(y=> yearCounts[y]),
                            backgroundColor: pickColor(1) + 'CC'
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: Math.max(...years.map(y => yearCounts[y])) * 1.1111
                          }
                        },
                        plugins: {
                          legend: { display: false },
                          title: { display: true, text: 'Cantidad de Productos por Año' },
                          datalabels: {
                            anchor: 'end',
                            align: 'top',
                            offset: 12,
                            formatter: value => value,
                            font: { weight: 'bold' }
                          }
                        }
                      }}
                      height={384}
                    />
                  </div>
                )}
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <p className="text-center text-gray-600 text-lg">No hay datos disponibles en resultados</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}