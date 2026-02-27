import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { API_BASE } from './config';
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
  // preselected tipologia can be passed through navigation state
  const initialTipologia = location.state?.tipologia || '';

  const [resultados, setResultados] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  // list of tipología categories shown when user first enters the page
  const categories = [
    'General',
    'Nuevo Conocimiento',
    'Desarrollo Tecnológico e Innovación',
    'Apropiación Social de Conocimiento',
    'Divulgación Pública de la Ciencia',
    'Formación del Recurso Humano',
  ];
  const [selectedCategory, setSelectedCategory] = React.useState(initialTipologia);

  const [filters, setFilters] = React.useState({
    facultad: '',
    programa: '',
    anio: '',
    investigador: '', // value comes from view column `nombre`
    categoria: '',
    cedula: '',
    sexo: '',
    grado: '',
    tipo_proyecto: '',
    tipologia_productos: '',
    titulo_proyecto: '',
    tipologia: initialTipologia // when set via dropdown or bar click
  });
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
  const userName = user?.email?.split('@')[0] || 'Usuario';

  const labelMap = {
    facultad: 'Facultad',
    programa: 'Programa',
    anio: 'Año',
    investigador: 'Investigador',
    tipologia: 'Tipología de Productos',
    categoria: 'Categoría',
    cedula: 'Cédula',
    sexo: 'Sexo',
    grado: 'Grado',
    tipo_proyecto: 'Tipo de proyecto',
    titulo_proyecto: 'Título del proyecto'
  };
  const displayLabel = (k) => labelMap[k] || (k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));

  // derive available options for filters once resultados is loaded
  const filterOptions = React.useMemo(() => {
    const opts = {
      facultad: [], programa: [], anio: [], investigador: [], tipologia: [],
      categoria: [], cedula: [], sexo: [], grado: [], tipo_proyecto: [], tipologia_productos: [], titulo_proyecto: []
    };
    resultados.forEach(r => {
      if (r.facultad && !opts.facultad.includes(r.facultad)) opts.facultad.push(r.facultad);
      if (r.programa && !opts.programa.includes(r.programa)) opts.programa.push(r.programa);
      if (r.anio && !opts.anio.includes(r.anio)) opts.anio.push(r.anio);
      if (r.nombre && !opts.investigador.includes(r.nombre)) opts.investigador.push(r.nombre);
      if (r.categoria && !opts.categoria.includes(r.categoria)) opts.categoria.push(r.categoria);
      if (r.cedula && !opts.cedula.includes(r.cedula)) opts.cedula.push(r.cedula);
      if (r.sexo && !opts.sexo.includes(r.sexo)) opts.sexo.push(r.sexo);
      if (r.grado && !opts.grado.includes(r.grado)) opts.grado.push(r.grado);
      if (r.tipo_proyecto && !opts.tipo_proyecto.includes(r.tipo_proyecto)) opts.tipo_proyecto.push(r.tipo_proyecto);
      if (r.tipologia_productos && !opts.tipologia_productos.includes(r.tipologia_productos)) opts.tipologia_productos.push(r.tipologia_productos);
      if (r.titulo_proyecto && !opts.titulo_proyecto.includes(r.titulo_proyecto)) opts.titulo_proyecto.push(r.titulo_proyecto);
      // Add nodo_padre to tipologia options
      const nodoPadre = (r.nodo_padre || r.tipologia_productos || '').toString().trim();
      if (nodoPadre && !opts.tipologia.includes(nodoPadre)) opts.tipologia.push(nodoPadre);
    });
    // sort options for nicer UI
    Object.values(opts).forEach(arr => arr.sort());
    return opts;
  }, [resultados]);

  // compute filtered dataset
  const filtered = React.useMemo(() => {
    return resultados.filter(r => {
      if (filters.facultad && r.facultad !== filters.facultad) return false;
      if (filters.programa && r.programa !== filters.programa) return false;
      if (filters.anio && r.anio !== filters.anio) return false;
      if (filters.categoria && r.categoria !== filters.categoria) return false;
      if (filters.cedula && r.cedula !== filters.cedula) return false;
      if (filters.sexo && r.sexo !== filters.sexo) return false;
      if (filters.grado && r.grado !== filters.grado) return false;
      if (filters.tipo_proyecto && r.tipo_proyecto !== filters.tipo_proyecto) return false;
      if (filters.tipologia_productos && r.tipologia_productos !== filters.tipologia_productos) return false;
      if (filters.titulo_proyecto && r.titulo_proyecto !== filters.titulo_proyecto) return false;
      if (
        filters.investigador &&
        !r.nombre?.toLowerCase().includes(filters.investigador.toLowerCase())
      )
        return false;
      // Filter by tipologia using nodo_padre or tipologia_productos
      if (filters.tipologia) {
        const nodoPadre = (r.nodo_padre || r.tipologia_productos || '').toString().trim();
        if (nodoPadre !== filters.tipologia) return false;
      }
      return true;
    });
  }, [resultados, filters]);

  // chart rows fetched from server
  const [topTipos, setTopTipos] = React.useState([]);
  // drill state for padre-hijo chart
  const [drillMode, setDrillMode] = React.useState(false);
  const [parentSelected, setParentSelected] = React.useState('');
  const [childColumns, setChildColumns] = React.useState([]);
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

  // whenever filters change trigger new aggregation request for top tipologias
  React.useEffect(() => {
    const loadAgg = async () => {
      try {
        const qs = new URLSearchParams();
        if (filters.facultad) qs.append('facultad', filters.facultad);
        if (filters.programa) qs.append('programa', filters.programa);
        if (filters.anio) qs.append('anio', filters.anio);
        if (filters.categoria) qs.append('categoria', filters.categoria);
        if (filters.cedula) qs.append('cedula', filters.cedula);
        if (filters.sexo) qs.append('sexo', filters.sexo);
        if (filters.grado) qs.append('grado', filters.grado);
        if (filters.tipo_proyecto) qs.append('tipo', filters.tipo_proyecto);
        if (filters.tipologia_productos) qs.append('tipologia', filters.tipologia_productos);
        if (filters.titulo_proyecto) qs.append('titulo_proyecto', filters.titulo_proyecto);
        // Enviar el filtro como investigador (valor desde nombre)
        if (filters.investigador) qs.append('investigador', filters.investigador);
        const res = await fetch(`${API_BASE}/tipologia-cantidades?` + qs.toString());
        if (!res.ok) throw new Error('Error fetching agregados');
        const data = await res.json();
        setTopTipos(data.map(r => [r.tipologia, r.cantidad]));
      } catch (err) {
        console.error(err);
      }
    };
    loadAgg();
  }, [filters]);

  // when parent changes in drill mode fetch children columns
  React.useEffect(() => {
    if (!drillMode || !parentSelected) return;
    const loadChildren = async () => {
      try {
        const qs = new URLSearchParams();
        if (filters.facultad) qs.append('facultad', filters.facultad);
        if (filters.programa) qs.append('programa', filters.programa);
        if (filters.anio) qs.append('anio', filters.anio);
        if (filters.categoria) qs.append('categoria', filters.categoria);
        if (filters.cedula) qs.append('cedula', filters.cedula);
        if (filters.sexo) qs.append('sexo', filters.sexo);
        if (filters.grado) qs.append('grado', filters.grado);
        if (filters.tipo_proyecto) qs.append('tipo', filters.tipo_proyecto);
        if (filters.tipologia_productos) qs.append('tipologia', filters.tipologia_productos);
        if (filters.titulo_proyecto) qs.append('titulo_proyecto', filters.titulo_proyecto);
        // Enviar el filtro como investigador (valor desde nombre)
        if (filters.investigador) qs.append('investigador', filters.investigador);
        qs.append('tipologia', parentSelected);
        const res = await fetch(`${API_BASE}/nodo-hijo-cantidades?` + qs.toString());
        if (!res.ok) throw new Error('Error fetching nodo hijo agregados');
        const data = await res.json();
        setChildColumns(data.map(r => ({ nodo: r.nodo, cantidad: r.cantidad }))); 
      } catch (err) {
        console.error(err);
      }
    };
    loadChildren();
  }, [drillMode, parentSelected, filters]);

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/resultados`);
        if (!res.ok) throw new Error('Error fetching resultados');
        const data = await res.json();
        setResultados(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // fetch distribution of nodo hijo according to current filters (tipologia optional)

  const handleDownloadCSV = () => {
    if (filtered.length === 0) {
      alert('No hay datos para descargar');
      return;
    }
    const headers = Object.keys(filtered[0]);
    const csvContent = [
      headers.join(','),
      ...filtered.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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
                onClick={openTableInNewTab}
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-primary rounded-xl font-semibold hover:bg-slate-300 transition-all"
              >
                <span className="material-symbols-outlined">table_view</span>
                <span>Ver tabla</span>
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
                  <p className="text-lg font-bold text-primary">{resultados.length.toLocaleString()}</p>
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
                  <p className="text-xxs text-slate-500">{filtered.length === resultados.length ? 'Todos' : `${((filtered.length/resultados.length)*100).toFixed(1)}%`}</p>
                  <div className="bg-accent/10 rounded-full p-0.5">
                    <span className="material-symbols-outlined text-base text-accent">filter_alt</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-row gap-3">
              {['facultad', 'programa', 'anio', 'investigador', 'tipologia'].map(key => (
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
                  {/* Chart with tooltips for labels */}
                  <Bar
                    ref={chartRef}
                    data={{
                      labels: drillMode
                        ? [
                            // Parent bar: show initials if long
                            parentSelected.length > 18
                              ? parentSelected.split(' ').map(w => w[0].toUpperCase()).join('')
                              : parentSelected.length > 10
                                ? parentSelected.slice(0, 10) + '...'
                                : parentSelected,
                            ...childColumns.map(c =>
                              c.nodo.length > 18
                                ? c.nodo.split(' ').map(w => w[0].toUpperCase()).join('')
                                : c.nodo.length > 10
                                  ? c.nodo.slice(0, 10) + '...'
                                  : c.nodo
                            )
                          ]
                        : topTipos.map(([t]) => {
                            if (t.length > 18) return t.split(' ').map(w => w[0].toUpperCase()).join('');
                            else if (t.length > 10) return t.slice(0, 10) + '...';
                            else return t;
                          }),
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
                          // put values outside the bar instead of inside
                          anchor: 'end',
                          align: 'top',
                          offset: 4,
                          formatter: value => value,
                          font: { weight: 'bold' }
                        },
                        tooltip: {
                          callbacks: {
                            title: (items) => {
                              const idx = items[0].dataIndex;
                              // Drill mode: show full name for parent and children
                              if (drillMode) {
                                if (idx === 0) return parentSelected;
                                return childColumns[idx - 1]?.nodo || items[0].label;
                              }
                              // Normal mode: show full name from topTipos
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
                        // Always use full name for click
                        let fullLabel;
                        if (!drillMode) {
                          fullLabel = topTipos[idx] ? topTipos[idx][0] : chart.data.labels[idx];
                        } else {
                          fullLabel = idx === 0 ? parentSelected : childColumns[idx - 1]?.nodo;
                        }
                        if (!drillMode) {
                          setParentSelected(fullLabel);
                          setDrillMode(true);
                          // Also set the tipologia filter when clicking a category
                          setFilters(prev => ({ ...prev, tipologia: fullLabel }));
                        } else {
                          if (idx === 0) {
                            setDrillMode(false);
                            setParentSelected('');
                            // Clear the tipologia filter when going back
                            setFilters(prev => ({ ...prev, tipologia: '' }));
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
                          backgroundColor: pickColor(1) + 'CC' // second palette color for year bars
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Cantidad de Productos por Año' },
                        datalabels: {
                          anchor: 'end',
                          align: 'top',
                          offset: 4,
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

          {/* Back button moved to header (next to CSV/Table) */}

        </div>
      </main>
      </div>
    </div>
  );
}
