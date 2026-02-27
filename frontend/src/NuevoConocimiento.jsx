import React from "react";
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { API_BASE } from './config';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, ChartDataLabels);

export default function NuevoConocimiento() {
  const [resultados, setResultados] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [filters, setFilters] = React.useState({
    facultad: '',
    programa: '',
    investigador: ''
  });

  // Obtener datos del backend según filtros (trabaja con la vista)
  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (filters.facultad) qs.append('facultad', filters.facultad);
        if (filters.programa) qs.append('programa', filters.programa);
        if (filters.investigador) qs.append('investigador', filters.investigador);
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

  // Opciones de filtros dinámicas (sin 'Año')
  const filterOptions = React.useMemo(() => {
    const opts = { facultad: [], programa: [], investigador: [] };
    resultados.forEach(r => {
      if (r.facultad && !opts.facultad.includes(r.facultad)) opts.facultad.push(r.facultad);
      if (r.programa && !opts.programa.includes(r.programa)) opts.programa.push(r.programa);
      if (r.nombre && !opts.investigador.includes(r.nombre)) opts.investigador.push(r.nombre);
    });
    Object.values(opts).forEach(arr => arr.sort());
    return opts;
  }, [resultados]);

  // Filtrar resultados solo para tipologia 'Nuevo Conocimiento' (usando nodo_padre de la vista)
  const filtered = React.useMemo(() => {
    let result = resultados.filter(r => {
      const tipologia = (r.nodo_padre || r.tipologia_productos || '').toString().trim().toLowerCase();
      return tipologia === 'nuevo conocimiento';
    });
    
    // Aplicar otros filtros (sin año)
    result = result.filter(r => {
      if (filters.facultad && r.facultad !== filters.facultad) return false;
      if (filters.programa && r.programa !== filters.programa) return false;
      if (
        filters.investigador &&
        !r.nombre?.toLowerCase().includes(filters.investigador.toLowerCase())
      )
        return false;
      return true;
    });
    
    console.log('Resultados totales:', resultados.length);
    console.log('Filtrados (Nuevo Conocimiento):', result.length);
    if (resultados.length > 0) {
      console.log('Sample data:', resultados[0]);
      console.log('Valores nodo_padre únicos:', [...new Set(resultados.map(r => r.nodo_padre || r.tipologia_productos))]);
    }
    return result;
  }, [resultados, filters]);

  // Agrupar por nodo hijo usando tipo_proyecto
  const nodosHijo = React.useMemo(() => {
    const grupos = {};
    filtered.forEach(r => {
      const nodo = r.tipo_proyecto || 'Sin Nodo';
      if (!grupos[nodo]) grupos[nodo] = [];
      grupos[nodo].push(r);
    });
    return grupos;
  }, [filtered]);

  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;
  const homePath = user?.role === 'admin' ? '/homeadmin' : '/home';
  const userName = user?.email?.split('@')[0] || 'Usuario';

  // state to show enlarged chart when clicked
  const [expandedChart, setExpandedChart] = React.useState(null);

  const labelMap = {
    facultad: 'Facultad',
    programa: 'Programa',
    investigador: 'Investigador',
    titulo_proyecto: 'Título del proyecto',
    anio: 'Año'
  };
  const displayLabel = (k) => labelMap[k] || (k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));

  const palette = ['#2A5783', '#F5A800']; // azul izquierda, amarillo derecha institucional

  const handleDownloadCSV = () => {
    if (!filtered || filtered.length === 0) {
      alert('No hay datos para descargar');
      return;
    }
    const headers = Object.keys(filtered[0]);
    const csvContent = [
      headers.map(h => displayLabel(h)).join(','),
      ...filtered.map(row => headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g,'""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nuevo_conocimiento_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const openTableInNewTab = () => {
    if (!filtered || filtered.length === 0) {
      alert('No hay datos para mostrar en la tabla');
      return;
    }
    const headers = Object.keys(filtered[0]);
    const styles = `table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background: #f3f4f6; color: #0f172a; font-weight: 700; } tr:nth-child(even) { background: #fafafa; }`;
    const thead = `<tr>${headers.map(h => `<th>${displayLabel(h)}</th>`).join('')}</tr>`;
    const rows = filtered.map(r => `<tr>${headers.map(h => `<td>${(r[h] ?? '').toString().replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>`).join('')}</tr>`).join('');
    const html = `<html><head><title>Tabla de resultados</title><meta charset="utf-8"/><style>${styles}</style></head><body><h2>Tabla de resultados</h2><div style="overflow:auto; max-width:100%;"><table>${thead}${rows}</table></div></body></html>`;
    const w = window.open('', '_blank');
    if (!w) { alert('No se pudo abrir la pestaña. Revisa el bloqueador de popups.'); return; }
    w.document.write(html);
    w.document.close();
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
        <main className="flex-1 flex flex-col items-center py-6 px-6 md:px-16">
        <div className="max-w-7xl w-full flex flex-col gap-8">
          <div className="flex justify-between items-center mb-0 w-full">
            <h1 className="text-3xl font-bold text-primary">Nuevo Conocimiento</h1>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-0 w-full max-w-7xl">
        {['facultad', 'programa', 'investigador'].map(key => (
          <div key={key}>
            <label className="block text-sm font-semibold mb-1 capitalize text-xs">
              {key === 'facultad' ? 'Facultad' : key === 'programa' ? 'Programa' : key === 'investigador' ? 'Investigador' : key}
            </label>
            <select
              className="w-full border rounded px-2 py-1 text-sm"
              value={filters[key]}
              onChange={e => setFilters(prev => ({ ...prev, [key]: e.target.value }))}
            >
              <option value="">Todos</option>
              {filterOptions[key]?.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {loading && <p className="text-center text-lg">Cargando datos…</p>}
      {error && <p className="text-center text-red-600">Error: {error}</p>}
      {!loading && !error && resultados.length === 0 && (
        <p className="text-center text-gray-600 text-lg">No hay datos disponibles. Revisa la consola.</p>
      )}
      {!loading && !error && resultados.length > 0 && Object.keys(nodosHijo).length === 0 && (
        <p className="text-center text-gray-600 text-lg">No hay registros de "Nuevo Conocimiento". Total datos: {resultados.length}</p>
      )}
      {!loading && !error && Object.keys(nodosHijo).length > 0 && (
        <>
          {/* modal for expanded chart */}
          {expandedChart && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setExpandedChart(null)}>
              <div className="bg-white p-6 rounded shadow-lg max-w-xl w-full" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4 text-primary">{expandedChart.nodo}</h3>
                <Bar
                  data={{
                    labels: expandedChart.labels,
                    datasets: [
                      {
                        label: `Cantidad (${expandedChart.nodo})`,
                        data: expandedChart.valores,
                        backgroundColor: expandedChart.color || palette[0]
                      }
                    ]
                  }}
                  height={300}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: false },
                      tooltip: { enabled: true },
                      datalabels: {
                        anchor: 'end',
                        align: 'top',
                        offset: 4,
                        formatter: value => value,
                        font: { weight: 'bold' }
                      }
                    },
                    scales: {
                      x: { title: { display: false, text: '' } },
                      y: { title: { display: true, text: 'Cantidad' }, beginAtZero: true, suggestedMax: expandedChart.yMax * 1.1 },
                    }
                  }}
                />
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => setExpandedChart(null)}
                    className="px-4 py-2 bg-primary text-white rounded-lg"
                  >Cerrar</button>
                </div>
              </div>
            </div>
          )}

          <div className="w-full max-w-7xl mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(nodosHijo).map(([nodo, items], idx) => {
            // Agrupar por año para el diagrama
            const anios = {};
            items.forEach(i => {
              const anio = i.anio || 'Sin año';
              anios[anio] = (anios[anio] || 0) + 1;
            });
            const labels = Object.keys(anios);
            const valores = Object.values(anios);
            const col = idx % 2;
            const chartData = {
              labels,
              datasets: [
                {
                  label: `Cantidad (${nodo})`,
                  data: valores,
                  backgroundColor: palette[col]
                },
              ],
            };
            // calculate a ceiling so bar never reaches the top (avoid label overlap with title)
            const yMax = valores.length ? Math.max(...valores) : 0;
            return (
              <div
                key={nodo}
                className="relative bg-slate-50 p-2 rounded shadow cursor-pointer hover:shadow-lg transition"
                onClick={() => setExpandedChart({ nodo, labels, valores, yMax, color: palette[idx % 2] })}
              >
                <div className="absolute top-2 right-2 bg-primary text-white px-2 py-0.5 rounded-full text-xs font-bold">{items.length}</div>
                <h2 className="text-base font-bold mb-2 text-primary break-words pr-12">{nodo}</h2>
                <Bar data={chartData} height={100} options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true },
                    datalabels: {
                      anchor: 'end',
                      align: 'top',
                      offset: 4,
                      formatter: value => value,
                      font: { weight: 'bold' }
                    }
                  },
                  scales: {
                    x: { title: { display: false, text: '' } },
                    y: { title: { display: true, text: 'Cantidad' }, beginAtZero: true, suggestedMax: yMax * 1.1 },
                  },
                }} />
              </div>
            );
          })}
        </div>
      </>
      )}
        </div>
        {/* Back button moved to header actions */}
        </main>
      </div>
    </div>
  );
}
