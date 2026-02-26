import React from "react";
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function NuevoConocimiento() {
  const [resultados, setResultados] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [filters, setFilters] = React.useState({
    facultad: '',
    programa: '',
    anio: '',
    investigador: '',
    categoria: '',
    cedula: '',
    sexo: '',
    grado: '',
    tipo_proyecto: '',
    tipologia_productos: '',
    titulo_proyecto: ''
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
        if (filters.anio) qs.append('anio', filters.anio);
        if (filters.categoria) qs.append('categoria', filters.categoria);
        if (filters.cedula) qs.append('cedula', filters.cedula);
        if (filters.sexo) qs.append('sexo', filters.sexo);
        if (filters.grado) qs.append('grado', filters.grado);
        if (filters.tipo_proyecto) qs.append('tipo', filters.tipo_proyecto);
        if (filters.tipologia_productos) qs.append('tipologia', filters.tipologia_productos);
        if (filters.titulo_proyecto) qs.append('titulo_proyecto', filters.titulo_proyecto);
        if (filters.investigador) qs.append('investigador', filters.investigador);
        const url = 'http://localhost:4000/api/resultados' + (qs.toString() ? ('?' + qs.toString()) : '');
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
    const opts = { facultad: [], programa: [], anio: [], investigador: [], categoria: [], cedula: [], sexo: [], grado: [], tipo_proyecto: [], tipologia_productos: [], titulo_proyecto: [] };
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
    });
    Object.values(opts).forEach(arr => arr.sort());
    return opts;
  }, [resultados]);

  // Filtrar resultados solo para tipologia 'Nuevo Conocimiento'
  const filtered = React.useMemo(() => {
    return resultados.filter(r => {
      if (r.tipologia_productos !== 'Nuevo Conocimiento') return false;
      if (filters.facultad && r.facultad !== filters.facultad) return false;
      if (filters.programa && r.programa !== filters.programa) return false;
      if (filters.anio && r.anio !== filters.anio) return false;
      if (
        filters.investigador &&
        !r.nombre?.toLowerCase().includes(filters.investigador.toLowerCase())
      )
        return false;
      return true;
    });
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

  return (
    <div className="flex flex-col items-center min-h-screen bg-white">
      <h1 className="text-3xl font-bold text-primary mb-6">Nuevo Conocimiento</h1>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 w-full max-w-7xl">
        {['facultad', 'programa', 'anio', 'investigador', 'categoria', 'cedula'].map(key => (
          <div key={key}>
            <label className="block text-sm font-semibold mb-1 capitalize text-xs">
              {key === 'facultad' ? 'Facultad' : key === 'programa' ? 'Programa' : key === 'anio' ? 'Año' : key === 'investigador' ? 'Investigador' : key.replace(/_/g, ' ')}
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 w-full max-w-7xl">
        {['sexo', 'grado', 'tipo_proyecto', 'tipologia_productos', 'titulo_proyecto'].map(key => (
          <div key={key}>
            <label className="block text-sm font-semibold mb-1 capitalize text-xs">
              {key.replace(/_/g, ' ')}
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
      {!loading && !error && Object.keys(nodosHijo).length > 0 && (
        <div className="w-full max-w-4xl mb-8">
          {Object.entries(nodosHijo).map(([nodo, items]) => {
            // Agrupar por año para el diagrama
            const anios = {};
            items.forEach(i => {
              const anio = i.anio || 'Sin año';
              anios[anio] = (anios[anio] || 0) + 1;
            });
            const chartData = {
              labels: Object.keys(anios),
              datasets: [
                {
                  label: `Cantidad (${nodo})`,
                  data: Object.values(anios),
                  backgroundColor: '#3b82f6',
                },
              ],
            };
            return (
              <div key={nodo} className="mb-8 bg-slate-50 p-4 rounded shadow">
                <h2 className="text-xl font-bold mb-2 text-primary">{nodo}</h2>
                <Bar data={chartData} options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true },
                  },
                  scales: {
                    x: { title: { display: true, text: 'Año' } },
                    y: { title: { display: true, text: 'Cantidad' }, beginAtZero: true },
                  },
                }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
