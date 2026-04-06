
import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import AuraLogo from '../../components/AuraLogo';
import TwoFASettings from '../../components/TwoFASettings';
import { API_BASE, SERVER_BASE } from '../../config';

export default function Usuarios() {
    // Mapeo de roles a colores y nombres legibles
    const roleStyles = {
      admin: 'bg-green-100 text-green-700',
      director: 'bg-purple-100 text-purple-700',
      coordinador: 'bg-blue-100 text-blue-700',
      investigador: 'bg-yellow-100 text-yellow-700',
    };
    const roleLabels = {
      admin: 'Administrador',
      director: 'Director estratégico',
      coordinador: 'Coordinador',
      investigador: 'Investigador',
    };
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;
  const homePath = user?.role === 'admin' ? '/homeadmin' : '/home';
  const [show2FASettings, setShow2FASettings] = React.useState(false);

  const [usuarios, setUsuarios] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [addForm, setAddForm] = React.useState({ email: '', password: '', role: 'user' });
  const [addLoading, setAddLoading] = React.useState(false);
  const [addError, setAddError] = React.useState(null);
  const [addSuccess, setAddSuccess] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editForm, setEditForm] = React.useState({ id: '', email: '', role: 'user' });
  const [editLoading, setEditLoading] = React.useState(false);
  const [editError, setEditError] = React.useState(null);
  const [editSuccess, setEditSuccess] = React.useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = React.useState(null);
  const handleEditClick = (user) => {
    setEditForm({ id: user.id, email: user.email, role: user.role });
    setEditError(null);
    setEditSuccess(false);
    setShowEditModal(true);
  };

  const handleDeleteUser = async (id, email) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el usuario "${email}"? Esta acción no se puede deshacer.`)) return;
    setDeleteLoadingId(id);
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al eliminar usuario');
      fetchUsuarios();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleEditInput = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    setEditSuccess(false);
    try {
      const res = await fetch(`${API_BASE}/users/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: editForm.email, role: editForm.role }),
      });
      let data = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error('Respuesta inesperada del servidor');
      }
      if (!res.ok) throw new Error(data.message || 'Error al editar usuario');
      setEditSuccess(true);
      fetchUsuarios();
      setTimeout(() => setShowEditModal(false), 1200);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const fetchUsuarios = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/users`);
      if (!res.ok) throw new Error('Error al cargar usuarios');
      const data = await res.json();
      setUsuarios(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const handleAddInput = (e) => {
    const { name, value } = e.target;
    setAddForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);
    setAddSuccess(false);
    try {
      const res = await fetch(`${SERVER_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      let data = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error('Respuesta inesperada del servidor');
      }
      if (!res.ok) throw new Error(data.message || 'Error al crear usuario');
      setAddSuccess(true);
      setAddForm({ email: '', password: '', role: 'user' });
      fetchUsuarios();
      setTimeout(() => setShowAddModal(false), 1200);
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-slate-50">
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
          <Link className="text-slate-500 hover:text-primary text-sm font-semibold transition-colors" to={homePath} state={{ user }}>Inicio</Link>
          <Link className="text-slate-500 hover:text-primary text-sm font-semibold transition-colors" to="/DirectorioInvestigadores" state={{ user }}>Investigadores</Link>
          <Link className="text-slate-500 hover:text-primary text-sm font-semibold transition-colors" to="/analisis" state={{ user }}>Análisis</Link>
          <span className="text-primary text-sm font-bold">Usuarios</span>
        </nav>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button className="flex items-center justify-center rounded-full size-10 bg-slate-100 text-primary hover:bg-slate-200 transition-all">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button
              className="flex items-center justify-center rounded-full size-10 bg-slate-100 text-primary hover:bg-slate-200 transition-all"
              onClick={() => setShow2FASettings(true)}
              title="Configurar 2FA"
            >
              <span className="material-symbols-outlined">settings</span>
            </button>
            {show2FASettings && (
              <TwoFASettings user={user} onClose={() => setShow2FASettings(false)} />
            )}
          </div>
          <div className="h-10 w-[1px] bg-slate-200 mx-2"></div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-primary">{user?.email?.split('@')[0]}</p>
            </div>
            <div className="bg-primary/10 rounded-full border border-primary/20 flex items-center justify-center w-10 h-10">
              <span className="material-symbols-outlined text-primary text-2xl">person</span>
            </div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1 px-3 py-2 ml-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-all text-sm font-semibold"
              title="Cerrar sesión"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold text-primary">Gestión de Usuarios</h1>
          <button
            className="px-5 py-2 bg-primary text-white rounded-lg font-semibold shadow-md hover:bg-primary/90 transition-all flex items-center gap-2"
            onClick={() => setShowAddModal(true)}
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            Nuevo Usuario
          </button>
              {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8 relative">
                    <button
                      className="absolute top-2 right-2 text-primary hover:bg-primary/10 rounded-full p-2 text-xl flex items-center"
                      onClick={() => setShowAddModal(false)}
                      title="Cerrar"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                    <h2 className="text-xl font-bold mb-4 text-primary">Crear nuevo usuario</h2>
                    <form onSubmit={handleAddUser} className="flex flex-col gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-1">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={addForm.email}
                          onChange={handleAddInput}
                          className="w-full border rounded px-3 py-2 focus:outline-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Contraseña</label>
                        <input
                          type="password"
                          name="password"
                          value={addForm.password}
                          onChange={handleAddInput}
                          className="w-full border rounded px-3 py-2 focus:outline-primary"
                          required
                          minLength={6}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Rol</label>
                        <select
                          name="role"
                          value={addForm.role}
                          onChange={handleAddInput}
                          className="w-full border rounded px-3 py-2 focus:outline-primary"
                        >
                          <option value="admin">Administrador</option>
                          <option value="director">Director estratégico</option>
                          <option value="coordinador">Coordinador</option>
                          <option value="investigador">Investigador</option>
                        </select>
                      </div>
                      {addError && <div className="text-red-500 text-sm font-semibold">{addError}</div>}
                      {addSuccess && <div className="text-green-600 text-sm font-semibold">Usuario creado correctamente</div>}
                      <button
                        type="submit"
                        className="w-full py-2 bg-primary text-white rounded font-bold hover:bg-primary/90 transition-all disabled:opacity-60"
                        disabled={addLoading}
                      >
                        {addLoading ? 'Creando...' : 'Crear usuario'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
        </div>
        <div className="bg-white rounded-xl shadow p-6 overflow-x-auto">
          {loading ? (
            <div className="text-center py-8 text-slate-400 font-semibold">Cargando usuarios...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500 font-semibold">{error}</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 table-fixed">
              <colgroup>
                <col style={{ width: '80px' }} />
                <col style={{ width: '260px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '140px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider align-middle">ID</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider align-middle">Email</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider align-middle">Rol</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider align-middle">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-center font-mono text-slate-500 align-middle">{u.id}</td>
                    <td className="px-4 py-3 text-center align-middle">{u.email}</td>
                    <td className="px-4 py-3 text-center align-middle">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${roleStyles[u.role] || 'bg-slate-100 text-slate-700'}`}>{roleLabels[u.role] || u.role}</span>
                    </td>
                    <td className="px-4 py-3 text-center align-middle flex flex-col gap-2 items-center justify-center md:flex-row md:gap-1">
                      <button
                        className="w-9 h-9 flex items-center justify-center bg-accent text-white rounded-lg shadow hover:bg-accent/90 transition-all"
                        onClick={() => handleEditClick(u)}
                        title="Editar usuario"
                        aria-label="Editar usuario"
                      >
                        <span className="material-symbols-outlined text-lg align-middle">edit</span>
                      </button>
                      <button
                        className="w-9 h-9 flex items-center justify-center bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition-all disabled:opacity-60"
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        disabled={deleteLoadingId === u.id}
                        title="Eliminar usuario"
                        aria-label="Eliminar usuario"
                      >
                        {deleteLoadingId === u.id ? (
                          <span className="material-symbols-outlined animate-spin text-lg align-middle">autorenew</span>
                        ) : (
                          <span className="material-symbols-outlined text-lg align-middle">delete</span>
                        )}
                      </button>
                    </td>
                        {showEditModal && (
                          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8 relative">
                              <button
                                className="absolute top-2 right-2 text-primary hover:bg-primary/10 rounded-full p-2 text-xl flex items-center"
                                onClick={() => setShowEditModal(false)}
                                title="Cerrar"
                              >
                                <span className="material-symbols-outlined">close</span>
                              </button>
                              <h2 className="text-xl font-bold mb-4 text-primary">Editar usuario</h2>
                              <form onSubmit={handleEditUser} className="flex flex-col gap-4">
                                <div>
                                  <label className="block text-sm font-semibold mb-1">Email</label>
                                  <input
                                    type="email"
                                    name="email"
                                    value={editForm.email}
                                    onChange={handleEditInput}
                                    className="w-full border rounded px-3 py-2 focus:outline-primary"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold mb-1">Rol</label>
                                  <select
                                    name="role"
                                    value={editForm.role}
                                    onChange={handleEditInput}
                                    className="w-full border rounded px-3 py-2 focus:outline-primary"
                                  >
                                    <option value="admin">Administrador</option>
                                    <option value="director">Director estratégico</option>
                                    <option value="coordinador">Coordinador</option>
                                    <option value="investigador">Investigador</option>
                                  </select>
                                </div>
                                {editError && <div className="text-red-500 text-sm font-semibold">{editError}</div>}
                                {editSuccess && <div className="text-green-600 text-sm font-semibold">Usuario actualizado correctamente</div>}
                                <button
                                  type="submit"
                                  className="w-full py-2 bg-primary text-white rounded font-bold hover:bg-primary/90 transition-all disabled:opacity-60"
                                  disabled={editLoading}
                                >
                                  {editLoading ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                              </form>
                            </div>
                          </div>
                        )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
