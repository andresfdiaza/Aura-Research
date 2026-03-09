import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { SERVER_BASE } from './config';

export default function Investigadores() {
  const location = useLocation();
  const homePath = location.state?.user?.role === 'admin' ? '/homeadmin' : '/home';  const user = location.state?.user;
  const [investigadores, setInvestigadores] = React.useState([]);
  const [editingId, setEditingId] = React.useState(null);
  const [editingData, setEditingData] = React.useState({});
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [formLoading, setFormLoading] = React.useState(false);
  const [formError, setFormError] = React.useState(null);
  const [formSuccess, setFormSuccess] = React.useState(false);
  const navigate = useNavigate();
  const userName = user?.email?.split('@')[0] || 'Usuario';

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${SERVER_BASE}/api/investigadores`);
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditingData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProgramaChange = (e) => {
    const { value, checked } = e.target;
    setEditingData((prev) => ({
      ...prev,
      programas: checked
        ? [...(prev.programas || []), value]
        : (prev.programas || []).filter((p) => p !== value)
    }));
  };

  const handleEditClick = (inv) => {
    setEditingId(inv.id_investigador);
    // Convertir programa_academico (string con comas) a array
    const programasArray = inv.programa_academico 
      ? inv.programa_academico.split(',').map(p => p.trim()).filter(Boolean)
      : [];
    setEditingData({
      nombre_completo: inv.nombre_completo || '',
      cedula: inv.cedula || '',
      link_cvlac: inv.link_cvlac || '',
      facultad: inv.facultad || '',
      programas: programasArray,
      correo: inv.correo || '',
      google_scholar: inv.google_scholar || '',
      orcid: inv.orcid || '',
    });
    setShowEditModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    setFormSuccess(false);

    try {
      const res = await fetch(`${SERVER_BASE}/investigadores/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error actualizando investigador');
      }

      // Recargar todos los investigadores para obtener la vista actualizada
      const resAll = await fetch(`${SERVER_BASE}/api/investigadores`);
      if (resAll.ok) {
        const allData = await resAll.json();
        setInvestigadores(allData);
      }
      
      setFormSuccess(true);
      setTimeout(() => {
        setShowEditModal(false);
        setFormSuccess(false);
        setEditingId(null);
        setEditingData({});
      }, 2000);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
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
                  <th className="px-4 py-2 text-center">ID Investigador</th>
                  <th className="px-4 py-2 text-center">Nombre</th>
                  <th className="px-4 py-2 text-center">Cédula</th>
                  <th className="px-4 py-2 text-center">Programas</th>
                  <th className="px-4 py-2 text-center">Correo</th>
                  <th className="px-4 py-2 text-center">Acciones</th>
                </tr>
            </thead>
            <tbody>
              {investigadores.map((inv) => (
                <tr key={inv.id_investigador} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-2 text-center">{inv.id_investigador}</td>
                  <td className="px-4 py-2 text-center">{inv.nombre_completo}</td>
                  <td className="px-4 py-2 text-center">{inv.cedula || '-'}</td>
                  <td className="px-4 py-2 text-center text-xs">{inv.programa_academico || 'Sin asignar'}</td>
                  <td className="px-4 py-2 text-center">{inv.correo || '-'}</td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary/90 transition-all"
                        onClick={() => handleEditClick(inv)}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-all"
                        onClick={async () => {
                          if (!confirm('¿Eliminar este investigador?')) return;
                          try {
                            const res = await fetch(`${SERVER_BASE}/investigadores/${inv.id_investigador}`, { method: 'DELETE' });
                            if (!res.ok) throw new Error('Delete failed');
                            setInvestigadores((prev) => prev.filter(p => p.id_investigador !== inv.id_investigador));
                          } catch (err) {
                            alert('Error eliminando: ' + err.message);
                          }
                        }}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
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

      {/* Modal para Editar Investigador */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 shadow-xl rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-[800px] overflow-hidden relative">
            <button
              className="absolute top-2 left-2 text-primary hover:bg-primary/10 rounded-full p-2 text-xl flex items-center"
              onClick={() => setShowEditModal(false)}
              aria-label="Volver"
            >
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
            <button
              className="absolute top-2 right-2 text-slate-400 hover:text-primary text-xl"
              onClick={() => setShowEditModal(false)}
              aria-label="Cerrar"
            >
              
            </button>
            {/* Card Header / Hero Area */}
            <div className="relative h-32 bg-primary overflow-hidden flex items-center px-8">
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm text-white border border-white/20">
                  <span className="material-symbols-outlined text-3xl">edit</span>
                </div>
                <div>
                  <h1 className="text-white text-2xl font-bold">Editar Investigador</h1>
                  <p className="text-white/80 text-sm">Actualizar información del investigador</p>
                </div>
              </div>
            </div>
            {/* Form Content */}
            <form className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
              {formSuccess && (
                <div className="col-span-1 md:col-span-2 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                  ✓ Investigador actualizado exitosamente
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
                  <input className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="Ej: Juan Sebastián Pérez García" type="text" name="nombre_completo" value={editingData.nombre_completo} onChange={handleInputChange} required />
                </div>
              </div>
              {/* Cédula de Ciudadanía */}
              <div className="col-span-1">
                <label className="block mb-2 text-slate-700 dark:text-slate-300 text-sm font-semibold">Cédula de Ciudadanía</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">badge</span>
                  <input className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="Número de identificación" type="text" name="cedula" value={editingData.cedula} onChange={handleInputChange} />
                </div>
              </div>
              {/* Link CVLAC */}
              <div className="col-span-1">
                <label className="block mb-2 text-slate-700 dark:text-slate-300 text-sm font-semibold">Link de CVLAC</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">link</span>
                  <input className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="https://scienti.minciencias.gov.co/cvlac/..." type="url" name="link_cvlac" value={editingData.link_cvlac} onChange={handleInputChange} />
                </div>
              </div>
              {/* Correo Electrónico */}
              <div className="col-span-1">
                <label className="block mb-2 text-slate-700 dark:text-slate-300 text-sm font-semibold">Correo Electrónico</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                  <input className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="correo@ejemplo.com" type="email" name="correo" value={editingData.correo} onChange={handleInputChange} />
                </div>
              </div>
              {/* Link Google Scholar */}
              <div className="col-span-1">
                <label className="block mb-2 text-slate-700 dark:text-slate-300 text-sm font-semibold">Link de Google Scholar</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">school</span>
                  <input className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="https://scholar.google.com/..." type="url" name="google_scholar" value={editingData.google_scholar} onChange={handleInputChange} />
                </div>
              </div>
              {/* Link ORCID */}
              <div className="col-span-1">
                <label className="block mb-2 text-slate-700 dark:text-slate-300 text-sm font-semibold">Link de ORCID</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">fingerprint</span>
                  <input className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="https://orcid.org/0000-0000-0000-0000" type="url" name="orcid" value={editingData.orcid} onChange={handleInputChange} />
                </div>
              </div>
              {/* Facultad */}
              <div className="col-span-1">
                <label className="block mb-2 text-slate-700 dark:text-slate-300 text-sm font-semibold">Facultad</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">account_balance</span>
                  <select className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none" name="facultad" value={editingData.facultad} onChange={handleInputChange}>
                    <option value="">Seleccione Facultad</option>
                    <option value="Facultad de Ingeniería">Facultad de Ingeniería</option>
                    <option value="Facultad de Ciencias de la Salud">Facultad de Ciencias de la Salud</option>
                    <option value="Facultad de Economía">Facultad de Economía</option>
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
                    <input type="checkbox" value="Ingeniería de Sistemas" checked={(editingData.programas || []).includes('Ingeniería de Sistemas')} onChange={handleProgramaChange} className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary" />
                    <span className="text-slate-900 dark:text-slate-100">Ingeniería de Sistemas</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" value="Ingeniería Industrial" checked={(editingData.programas || []).includes('Ingeniería Industrial')} onChange={handleProgramaChange} className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary" />
                    <span className="text-slate-900 dark:text-slate-100">Ingeniería Industrial</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" value="Especialización en Inteligencia de Negocios y Big Data" checked={(editingData.programas || []).includes('Especialización en Inteligencia de Negocios y Big Data')} onChange={handleProgramaChange} className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary" />
                    <span className="text-slate-900 dark:text-slate-100">Especialización en Inteligencia de Negocios y Big Data</span>
                  </label>
                  {(editingData.programas || []).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-600 dark:text-slate-400">Seleccionados: {(editingData.programas || []).length}</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Form Actions */}
              <div className="col-span-1 md:col-span-2 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-end gap-4">
                <button className="px-6 py-3 rounded-lg font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" type="button" onClick={() => setShowEditModal(false)}>
                  Cancelar
                </button>
                <button className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2" type="submit" disabled={formLoading}>
                  <span className="material-symbols-outlined text-xl">{formLoading ? 'hourglass_top' : 'save'}</span>
                  {formLoading ? 'Guardando...' : 'Actualizar Investigador'}
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
