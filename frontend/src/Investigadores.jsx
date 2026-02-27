import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { SERVER_BASE } from './config';

export default function Investigadores() {
  const location = useLocation();
  const homePath = location.state?.user?.role === 'admin' ? '/homeadmin' : '/home';  const user = location.state?.user;
  const [investigadores, setInvestigadores] = React.useState([]);
  const [editingId, setEditingId] = React.useState(null);
  const [editingData, setEditingData] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const navigate = useNavigate();
  const userName = user?.email?.split('@')[0] || 'Usuario';

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${SERVER_BASE}/investigadores`);
        if (!res.ok) throw new Error('Error fetching investigadores');
        const data = await res.json();
        setInvestigadores(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleVolver = () => {
    navigate(-1);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 md:px-16 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-10 rounded-lg bg-primary text-white">
            <span className="material-symbols-outlined text-2xl">rocket_launch</span>
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
          <a className="text-slate-500 hover:text-primary text-sm font-semibold transition-colors" href="#">
            Proyectos
          </a>
          <a className="text-slate-500 hover:text-primary text-sm font-semibold transition-colors" href="#">
            Reportes
          </a>
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
        <main className="flex-1 flex flex-col items-center py-12 px-6 md:px-16">
        <div className="max-w-6xl w-full flex flex-col gap-12">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Directorio de Investigadores</h1>
        <button
          onClick={handleVolver}
          className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-primary rounded-lg font-semibold hover:bg-slate-300 transition-all"
        >
          <span className="material-symbols-outlined align-middle">arrow_back</span>
          <span>Volver</span>
        </button>
      </div>
      {loading && <p>Cargando investigadores…</p>}
      {error && <p className="text-red-600">Error: {error}</p>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full table-auto bg-white rounded shadow">
            <thead>
              <tr className="bg-slate-100">
                  <th className="px-4 py-2 text-center">Nombre</th>
                  <th className="px-4 py-2 text-center">Cédula</th>
                  <th className="px-4 py-2 text-center">Facultad</th>
                  <th className="px-4 py-2 text-center">Programa</th>
                  <th className="px-4 py-2 text-center">Acciones</th>
                </tr>
            </thead>
            <tbody>
              {investigadores.map((inv) => (
                <tr key={inv.id} className="border-t">
                    <td className="px-4 py-2 text-center">
                    {editingId === inv.id ? (
                      <input
                        className="border px-2 py-1 w-full"
                        value={editingData.nombre_completo || ''}
                        onChange={(e) => setEditingData({...editingData, nombre_completo: e.target.value})}
                      />
                    ) : (
                      inv.nombre_completo
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {editingId === inv.id ? (
                      <input
                        className="border px-2 py-1 w-full"
                        value={editingData.cedula || ''}
                        onChange={(e) => setEditingData({...editingData, cedula: e.target.value})}
                      />
                    ) : (
                      inv.cedula || '-'
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {editingId === inv.id ? (
                      <input
                        className="border px-2 py-1 w-full"
                        value={editingData.facultad || ''}
                        onChange={(e) => setEditingData({...editingData, facultad: e.target.value})}
                      />
                    ) : (
                      inv.facultad || '-'
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {editingId === inv.id ? (
                      <input
                        className="border px-2 py-1 w-full"
                        value={editingData.programa_academico || ''}
                        onChange={(e) => setEditingData({...editingData, programa_academico: e.target.value})}
                      />
                    ) : (
                      inv.programa_academico || '-'
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {editingId === inv.id ? (
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                          onClick={async () => {
                            try {
                              const res = await fetch(`${SERVER_BASE}/investigadores/${inv.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(editingData),
                              });
                              if (!res.ok) throw new Error('Update failed');
                              const updated = await res.json();
                              setInvestigadores((prev) => prev.map(p => p.id === updated.id ? updated : p));
                              setEditingId(null);
                              setEditingData({});
                            } catch (err) {
                              alert('Error actualizando: ' + err.message);
                            }
                          }}
                        >
                          Guardar
                        </button>
                        <button
                          className="px-3 py-1 bg-gray-300 rounded text-sm"
                          onClick={() => { setEditingId(null); setEditingData({}); }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center">
                        <button
                          className="px-3 py-1 bg-yellow-300 rounded text-sm"
                          onClick={() => {
                            setEditingId(inv.id);
                            setEditingData({
                              nombre_completo: inv.nombre_completo || '',
                              cedula: inv.cedula || '',
                              facultad: inv.facultad || '',
                              programa_academico: inv.programa_academico || '',
                            });
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                          onClick={async () => {
                            if (!confirm('¿Eliminar este investigador?')) return;
                            try {
                              const res = await fetch(`${SERVER_BASE}/investigadores/${inv.id}`, { method: 'DELETE' });
                              if (!res.ok) throw new Error('Delete failed');
                              setInvestigadores((prev) => prev.filter(p => p.id !== inv.id));
                            } catch (err) {
                              alert('Error eliminando: ' + err.message);
                            }
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        </div>
      </main>
      </div>
    </div>
  );
}
