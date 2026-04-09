import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import AuraLogo from '../../components/AuraLogo';
import TwoFASettings from '../../components/TwoFASettings';
import { API_BASE } from '../../config';
import { authHeaders, getRolePermissions, homePathForRole } from '../../utils/rolePermissions';

export default function Usuarios() {
  const roleStyles = {
    admin: 'bg-green-100 text-green-700',
    director: 'bg-purple-100 text-purple-700',
    coordinador: 'bg-blue-100 text-blue-700',
    investigador: 'bg-yellow-100 text-yellow-700',
  };

  const roleLabels = {
    admin: 'Administrador',
    director: 'Director estrategico',
    coordinador: 'Coordinador',
    investigador: 'Investigador',
  };

  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;
  const permissions = getRolePermissions(user?.role);
  const currentRole = String(user?.role || '').toLowerCase();
  const isDirectorCreator = currentRole === 'director';
  const canViewUsers = permissions.canViewUsers;
  const canCreateUsers = permissions.canCreateUsers;
  const canEditUsers = permissions.canEditUsers;
  const canDeleteUsers = permissions.canDeleteUsers;
  const canResetUser2FA = permissions.canResetUser2FA;
  if (!user || !canViewUsers) {
    return <div className="flex flex-col items-center justify-center min-h-screen"><h2 className="text-2xl font-bold text-red-600">Acceso restringido: no tienes permisos para ver usuarios</h2></div>;
  }
  const homePath = homePathForRole(user?.role);

  const [show2FASettings, setShow2FASettings] = React.useState(false);
  const [usuarios, setUsuarios] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const [showAddModal, setShowAddModal] = React.useState(false);
  const [addForm, setAddForm] = React.useState({
    email: '',
    password: '',
    role: 'investigador',
    scope: {
      universidadIds: [],
      facultadIds: [],
      grupoIds: [],
      investigadorId: '',
    },
  });
  const [addLoading, setAddLoading] = React.useState(false);
  const [addError, setAddError] = React.useState(null);
  const [addSuccess, setAddSuccess] = React.useState(false);

  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editForm, setEditForm] = React.useState({ id: '', email: '', role: 'investigador' });
  const [editLoading, setEditLoading] = React.useState(false);
  const [editError, setEditError] = React.useState(null);
  const [editSuccess, setEditSuccess] = React.useState(false);

  const [showReset2FAModal, setShowReset2FAModal] = React.useState(false);
  const [reset2FAEmail, setReset2FAEmail] = React.useState('');
  const [reset2FALoading, setReset2FALoading] = React.useState(false);
  const [reset2FAError, setReset2FAError] = React.useState(null);
  const [reset2FASuccess, setReset2FASuccess] = React.useState(false);

  const [deleteLoadingId, setDeleteLoadingId] = React.useState(null);
  const [universidadesCatalogo, setUniversidadesCatalogo] = React.useState([]);
  const [newUniversidadForm, setNewUniversidadForm] = React.useState({ nombre_universidad: '', codigo: '' });
  const [addUniversidadLoading, setAddUniversidadLoading] = React.useState(false);
  const [addUniversidadError, setAddUniversidadError] = React.useState(null);
  const [facultadesCatalogo, setFacultadesCatalogo] = React.useState([]);
  const [gruposCatalogo, setGruposCatalogo] = React.useState([]);
  const [investigadoresCatalogo, setInvestigadoresCatalogo] = React.useState([]);
  const [investigadorSearch, setInvestigadorSearch] = React.useState('');

  const investigadorOptions = React.useMemo(() => {
    return investigadoresCatalogo
      .map((inv) => ({
        id: String(inv.id_investigador || ''),
        nombre: String(inv.nombre_completo || '').trim(),
      }))
      .filter((inv) => inv.id && inv.nombre)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [investigadoresCatalogo]);

  const availableRolesToCreate = React.useMemo(() => {
    if (isDirectorCreator) {
      return [
        { value: 'coordinador', label: 'Coordinador' },
        { value: 'investigador', label: 'Investigador' },
      ];
    }
    return [
      { value: 'admin', label: 'Administrador' },
      { value: 'director', label: 'Director estrategico' },
      { value: 'coordinador', label: 'Coordinador' },
      { value: 'investigador', label: 'Investigador' },
    ];
  }, [isDirectorCreator]);

  const parseApiResponse = async (res) => {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    const body = await res.text();
    if (body.includes('<!DOCTYPE') || body.includes('<html')) {
      throw new Error('El servidor respondio HTML en lugar de JSON. Reinicia el backend y verifica la ruta de la API.');
    }
    throw new Error(body || 'Respuesta inesperada del servidor');
  };

  const fetchUsuarios = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/users`, {
        headers: authHeaders(user),
      });
      if (!res.ok) throw new Error('Error al cargar usuarios');
      const data = await res.json();
      setUsuarios(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  React.useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [uniRes, facRes, grpRes, invRes] = await Promise.all([
          fetch(`${API_BASE}/universidades`, { headers: authHeaders(user) }),
          fetch(`${API_BASE}/facultades`, { headers: authHeaders(user) }),
          fetch(`${API_BASE}/grupos`, { headers: authHeaders(user) }),
          fetch(`${API_BASE}/investigadores`, { headers: authHeaders(user) }),
        ]);

        const [uniData, facData, grpData, invData] = await Promise.all([
          uniRes.ok ? uniRes.json() : [],
          facRes.ok ? facRes.json() : [],
          grpRes.ok ? grpRes.json() : [],
          invRes.ok ? invRes.json() : [],
        ]);

        setUniversidadesCatalogo(Array.isArray(uniData) ? uniData : []);
        setFacultadesCatalogo(Array.isArray(facData) ? facData : []);
        setGruposCatalogo(Array.isArray(grpData) ? grpData : []);
        setInvestigadoresCatalogo(Array.isArray(invData) ? invData : []);
      } catch (_err) {
        setUniversidadesCatalogo([]);
        setFacultadesCatalogo([]);
        setGruposCatalogo([]);
        setInvestigadoresCatalogo([]);
      }
    };

    loadCatalogs();
  }, [user]);

  const emptyAddForm = React.useCallback((role = 'investigador') => ({
    email: '',
    password: '',
    role,
    scope: {
      universidadIds: [],
      facultadIds: [],
      grupoIds: [],
      investigadorId: '',
    },
  }), []);

  const handleAddInput = (e) => {
    const { name, value } = e.target;
    setAddForm((prev) => {
      if (name === 'role') {
        setInvestigadorSearch('');
        return {
          ...prev,
          role: value,
          scope: {
            universidadIds: [],
            facultadIds: [],
            grupoIds: [],
            investigadorId: '',
          },
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const selectUniversidadScope = (idUniversidad) => {
    setAddForm((prev) => ({
      ...prev,
      scope: {
        ...prev.scope,
        universidadIds: idUniversidad ? [idUniversidad] : [],
      },
    }));
  };

  const toggleFacultadScope = (idFacultad) => {
    setAddForm((prev) => {
      const exists = prev.scope.facultadIds.includes(idFacultad);
      return {
        ...prev,
        scope: {
          ...prev.scope,
          facultadIds: exists
            ? prev.scope.facultadIds.filter((id) => id !== idFacultad)
            : [...prev.scope.facultadIds, idFacultad],
        },
      };
    });
  };

  const toggleGrupoScope = (idGrupo) => {
    setAddForm((prev) => {
      const exists = prev.scope.grupoIds.includes(idGrupo);
      return {
        ...prev,
        scope: {
          ...prev.scope,
          grupoIds: exists
            ? prev.scope.grupoIds.filter((id) => id !== idGrupo)
            : [...prev.scope.grupoIds, idGrupo],
        },
      };
    });
  };

  const setInvestigadorScope = (investigadorId) => {
    const nextId = investigadorId ? String(investigadorId) : '';
    const selected = investigadorOptions.find((inv) => inv.id === nextId);
    setInvestigadorSearch(selected ? selected.nombre : '');
    setAddForm((prev) => ({
      ...prev,
      scope: {
        ...prev.scope,
        investigadorId: nextId,
      },
    }));
  };

  const handleInvestigadorSearchChange = (value) => {
    setInvestigadorSearch(value);
    const normalized = value.trim().toLowerCase();
    const selected = investigadorOptions.find((inv) => inv.nombre.toLowerCase() === normalized);
    setAddForm((prev) => ({
      ...prev,
      scope: {
        ...prev.scope,
        investigadorId: selected ? selected.id : '',
      },
    }));
  };

  const handleAddUniversidad = async () => {
    if (currentRole !== 'admin') return;

    const nombre_universidad = (newUniversidadForm.nombre_universidad || '').trim();
    const codigo = (newUniversidadForm.codigo || '').trim();

    if (!nombre_universidad) {
      setAddUniversidadError('Debes ingresar el nombre de la universidad.');
      return;
    }

    setAddUniversidadLoading(true);
    setAddUniversidadError(null);
    try {
      const res = await fetch(`${API_BASE}/universidades`, {
        method: 'POST',
        headers: authHeaders(user, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ nombre_universidad, codigo }),
      });

      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.message || 'Error al crear universidad');

      const created = {
        id_universidad: data.id_universidad,
        nombre_universidad: data.nombre_universidad || nombre_universidad,
        codigo: data.codigo || codigo || null,
      };

      setUniversidadesCatalogo((prev) => {
        const next = [...prev, created];
        next.sort((a, b) => String(a.nombre_universidad || '').localeCompare(String(b.nombre_universidad || ''), 'es'));
        return next;
      });
      selectUniversidadScope(created.id_universidad);
      setNewUniversidadForm({ nombre_universidad: '', codigo: '' });
    } catch (err) {
      setAddUniversidadError(err.message);
    } finally {
      setAddUniversidadLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);
    setAddSuccess(false);
    try {
      const scopePayload = {
        universidadIds: addForm.scope.universidadIds,
        facultadIds: addForm.scope.facultadIds,
        grupoIds: addForm.scope.grupoIds,
        investigadorId: addForm.scope.investigadorId,
      };

      if (addForm.role === 'director' && scopePayload.universidadIds.length !== 1) {
        throw new Error('Debes asignar exactamente una universidad al director.');
      }
      if (addForm.role === 'coordinador' && scopePayload.grupoIds.length === 0) {
        throw new Error('Debes asignar al menos un grupo al coordinador.');
      }
      if (addForm.role === 'investigador' && !scopePayload.investigadorId) {
        throw new Error('Debes asignar un investigador al usuario con rol investigador.');
      }

      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: authHeaders(user, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          email: addForm.email,
          password: addForm.password,
          role: addForm.role,
          scope: scopePayload,
        }),
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
      setAddForm(emptyAddForm('investigador'));
      setInvestigadorSearch('');
      fetchUsuarios();
      setTimeout(() => setShowAddModal(false), 1200);
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditClick = (selectedUser) => {
    if (!canEditUsers) return;
    setEditForm({ id: selectedUser.id, email: selectedUser.email, role: selectedUser.role });
    setEditError(null);
    setEditSuccess(false);
    setShowEditModal(true);
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
        headers: authHeaders(user, { 'Content-Type': 'application/json' }),
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

  const handleDeleteUser = async (id, email) => {
    if (!canDeleteUsers) return;
    if (!window.confirm(`Seguro que deseas eliminar el usuario "${email}"? Esta accion no se puede deshacer.`)) return;

    setDeleteLoadingId(id);
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
        headers: authHeaders(user),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.message || 'Error al eliminar usuario');
      fetchUsuarios();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleReset2FA = async (e) => {
    e.preventDefault();
    setReset2FALoading(true);
    setReset2FAError(null);
    setReset2FASuccess(false);

    try {
      const res = await fetch(`${API_BASE}/2fa/reset`, {
        method: 'POST',
        headers: authHeaders(user, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email: reset2FAEmail }),
      });

      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.message || 'Error al reiniciar 2FA');

      setReset2FASuccess(true);
      setTimeout(() => {
        setShowReset2FAModal(false);
        setReset2FAEmail('');
        setReset2FASuccess(false);
        fetchUsuarios();
      }, 1200);
    } catch (err) {
      setReset2FAError(err.message);
    } finally {
      setReset2FALoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-slate-50">
      <header className="flex flex-wrap items-center justify-between gap-y-3 border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 sm:px-6 md:px-16 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div
            className="flex items-center justify-center size-10 rounded-lg bg-primary text-white cursor-pointer"
            onClick={() => navigate(homePath, { state: { user } })}
          >
            <AuraLogo />
          </div>
          <div className="flex flex-col">
            <h2 className="text-primary text-lg font-bold leading-tight tracking-tight">AURA RESEARCH UNAC</h2>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <Link className="text-slate-500 hover:text-primary text-sm font-semibold transition-colors" to={homePath} state={{ user }}>Inicio</Link>
          <Link className="text-slate-500 hover:text-primary text-sm font-semibold transition-colors" to="/DirectorioInvestigadores" state={{ user }}>Investigadores</Link>
          <Link className="text-slate-500 hover:text-primary text-sm font-semibold transition-colors" to="/analisis" state={{ user }}>Analisis</Link>
          <span className="text-primary text-sm font-bold">Usuarios</span>
        </nav>

        <div className="flex w-full sm:w-auto items-center justify-end gap-3 sm:gap-4 flex-wrap">
          <div className="flex gap-2 flex-wrap justify-end">
            <button className="flex items-center justify-center rounded-full w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 text-primary hover:bg-slate-200 transition-all">
              <span className="material-symbols-outlined text-[18px] sm:text-[22px]">notifications</span>
            </button>
            <button
              className="flex items-center justify-center rounded-full w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 text-primary hover:bg-slate-200 transition-all"
              onClick={() => navigate('/ajustes', { state: { user } })}
              title="Ajustes"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[22px]">settings</span>
            </button>
            <button
              className="flex items-center justify-center rounded-full w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 text-primary hover:bg-slate-200 transition-all"
              onClick={() => setShow2FASettings(true)}
              title="Configurar 2FA"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[22px]">key</span>
            </button>
            {show2FASettings && <TwoFASettings user={user} onClose={() => setShow2FASettings(false)} />}
          </div>

          <div className="hidden sm:block h-10 w-[1px] bg-slate-200 mx-2" />

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-primary">{user?.email?.split('@')[0]}</p>
            </div>
            <div className="bg-primary/10 rounded-full border border-primary/20 flex items-center justify-center w-10 h-10">
              <span className="material-symbols-outlined text-primary text-2xl">person</span>
            </div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1 px-3 py-2 ml-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-all text-sm font-semibold"
              title="Cerrar sesion"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-3 sm:p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-primary">Gestion de Usuarios</h1>
            {!canCreateUsers && !canEditUsers && (
              <p className="text-xs sm:text-sm text-slate-500 mt-1">Modo solo lectura para tu rol.</p>
            )}
          </div>
          {(canCreateUsers || canResetUser2FA) && (
          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:flex sm:flex-wrap">
            {canCreateUsers && (
            <button
              className="px-5 py-2 bg-primary text-white rounded-lg font-semibold shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
              onClick={() => setShowAddModal(true)}
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              Nuevo Usuario
            </button>
            )}
            {canResetUser2FA && (
            <button
              className="px-5 py-2 bg-accent text-white rounded-lg font-semibold shadow-md hover:bg-accent/90 transition-all flex items-center justify-center gap-2"
              onClick={() => {
                setReset2FAError(null);
                setReset2FASuccess(false);
                setShowReset2FAModal(true);
              }}
            >
              <span className="material-symbols-outlined text-base">restart_alt</span>
              Reiniciar 2FA
            </button>
            )}
          </div>
          )}
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 sm:p-8 relative mx-4 max-h-[90vh] overflow-y-auto">
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
                  <label className="block text-sm font-semibold mb-1">Contrasena</label>
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
                    {availableRolesToCreate.map((roleItem) => (
                      <option key={roleItem.value} value={roleItem.value}>{roleItem.label}</option>
                    ))}
                  </select>
                </div>

                {addForm.role === 'director' && (
                  <div>
                    <label className="block text-sm font-semibold mb-2">Asignar universidad</label>
                    <div className="max-h-40 overflow-y-auto rounded border p-2 space-y-2">
                      {universidadesCatalogo.map((uni) => {
                        const idUniversidad = uni.id_universidad || uni.id;
                        const checked = addForm.scope.universidadIds.includes(idUniversidad);
                        return (
                          <label key={idUniversidad} className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name="director_universidad"
                              checked={checked}
                              onChange={() => selectUniversidadScope(idUniversidad)}
                            />
                            <span>{uni.nombre_universidad || uni.nombre || 'Universidad sin nombre'}</span>
                          </label>
                        );
                      })}
                      {universidadesCatalogo.length === 0 && (
                        <p className="text-sm text-slate-500">No hay universidades registradas.</p>
                      )}
                    </div>

                    {currentRole === 'admin' && (
                      <div className="mt-3 rounded border p-3 bg-slate-50 space-y-2">
                        <p className="text-xs font-semibold text-slate-700">Crear universidad nueva</p>
                        <input
                          type="text"
                          placeholder="Nombre universidad"
                          value={newUniversidadForm.nombre_universidad}
                          onChange={(e) => setNewUniversidadForm((prev) => ({ ...prev, nombre_universidad: e.target.value }))}
                          className="w-full border rounded px-3 py-2 text-sm focus:outline-primary"
                        />
                        <input
                          type="text"
                          placeholder="Codigo (opcional)"
                          value={newUniversidadForm.codigo}
                          onChange={(e) => setNewUniversidadForm((prev) => ({ ...prev, codigo: e.target.value }))}
                          className="w-full border rounded px-3 py-2 text-sm focus:outline-primary"
                        />
                        {addUniversidadError && (
                          <p className="text-xs text-red-600 font-semibold">{addUniversidadError}</p>
                        )}
                        <button
                          type="button"
                          onClick={handleAddUniversidad}
                          disabled={addUniversidadLoading}
                          className="w-full py-2 bg-slate-700 text-white rounded text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
                        >
                          {addUniversidadLoading ? 'Guardando universidad...' : 'Agregar universidad'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {addForm.role === 'coordinador' && (
                  <div>
                    <label className="block text-sm font-semibold mb-2">Asignar grupo(s)</label>
                    <div className="max-h-40 overflow-y-auto rounded border p-2 space-y-2">
                      {gruposCatalogo.map((grupo) => {
                        const idGrupo = grupo.id;
                        const checked = addForm.scope.grupoIds.includes(idGrupo);
                        return (
                          <label key={idGrupo} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleGrupoScope(idGrupo)}
                            />
                            <span>{grupo.sigla_grupo || grupo.nombre_grupo}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {addForm.role === 'investigador' && (
                  <div>
                    <label className="block text-sm font-semibold mb-1">Asignar investigador</label>
                    <input
                      type="text"
                      value={investigadorSearch}
                      onChange={(e) => handleInvestigadorSearchChange(e.target.value)}
                      list="investigadores-usuarios-options"
                      placeholder="Escribe o pega el nombre del investigador"
                      className="w-full border rounded px-3 py-2 focus:outline-primary"
                      autoComplete="on"
                    />
                    <datalist id="investigadores-usuarios-options">
                      {investigadorOptions.map((inv) => (
                        <option key={inv.id} value={inv.nombre} />
                      ))}
                    </datalist>
                    <p className="mt-1 text-xs text-slate-500">Selecciona un nombre exacto de la lista para asignar el investigador.</p>
                  </div>
                )}
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

        {showReset2FAModal && canResetUser2FA && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 sm:p-8 relative mx-4 max-h-[90vh] overflow-y-auto">
              <button
                className="absolute top-2 right-2 text-primary hover:bg-primary/10 rounded-full p-2 text-xl flex items-center"
                onClick={() => {
                  setShowReset2FAModal(false);
                  setReset2FAEmail('');
                  setReset2FAError(null);
                  setReset2FASuccess(false);
                }}
                title="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <h2 className="text-xl font-bold mb-4 text-primary">Reiniciar 2FA de usuario</h2>
              <form onSubmit={handleReset2FA} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Correo del usuario</label>
                  <input
                    type="email"
                    name="reset2fa_email"
                    value={reset2FAEmail}
                    onChange={(e) => setReset2FAEmail(e.target.value)}
                    className="w-full border rounded px-3 py-2 focus:outline-primary"
                    required
                  />
                </div>
                {reset2FAError && <div className="text-red-500 text-sm font-semibold">{reset2FAError}</div>}
                {reset2FASuccess && <div className="text-green-600 text-sm font-semibold">2FA reiniciado correctamente</div>}
                <button
                  type="submit"
                  className="w-full py-2 bg-accent text-white rounded font-bold hover:bg-accent/90 transition-all disabled:opacity-60"
                  disabled={reset2FALoading}
                >
                  {reset2FALoading ? 'Reiniciando...' : 'Reiniciar 2FA'}
                </button>
              </form>
            </div>
          </div>
        )}

        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 sm:p-8 relative mx-4 max-h-[90vh] overflow-y-auto">
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
                    <option value="director">Director estrategico</option>
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

        <div className="bg-white rounded-xl shadow p-4 sm:p-6">
          {loading ? (
            <div className="text-center py-8 text-slate-400 font-semibold">Cargando usuarios...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500 font-semibold">{error}</div>
          ) : (
            <>
              <div className="md:hidden space-y-3">
                {usuarios.map((u) => (
                  <div key={u.id} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 pr-2 flex items-center">
                        <p className="w-full text-base sm:text-lg font-bold text-slate-800 break-all text-center">{u.email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${roleStyles[u.role] || 'bg-slate-100 text-slate-700'}`}>
                          {roleLabels[u.role] || u.role}
                        </span>
                        {u.twofa_enabled ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold whitespace-nowrap">
                            <span className="material-symbols-outlined text-sm align-middle">verified_user</span>
                            2FA Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold whitespace-nowrap">
                            <span className="material-symbols-outlined text-sm align-middle">block</span>
                            2FA Inactivo
                          </span>
                        )}
                        {(canEditUsers || canDeleteUsers) && (
                        <div className="flex items-center justify-end gap-1.5">
                          {canEditUsers && (
                          <button
                            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-accent text-white rounded-lg shadow hover:bg-accent/90 transition-all"
                            onClick={() => handleEditClick(u)}
                            title="Editar usuario"
                            aria-label="Editar usuario"
                          >
                            <span className="material-symbols-outlined text-base align-middle">edit</span>
                          </button>
                          )}
                          {canDeleteUsers && (
                          <button
                            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition-all disabled:opacity-60"
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            disabled={deleteLoadingId === u.id}
                            title="Eliminar usuario"
                            aria-label="Eliminar usuario"
                          >
                            {deleteLoadingId === u.id ? (
                              <span className="material-symbols-outlined animate-spin text-base align-middle">autorenew</span>
                            ) : (
                              <span className="material-symbols-outlined text-base align-middle">delete</span>
                            )}
                          </button>
                          )}
                        </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
              <colgroup>
                <col style={{ width: '80px' }} />
                <col style={{ width: '260px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '140px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider align-middle">ID</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider align-middle">Email</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider align-middle">2FA</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider align-middle">Rol</th>
                  {(canEditUsers || canDeleteUsers) && (
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider align-middle">Acciones</th>
                  )}
                </tr>
              </thead>
                  <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-center font-mono text-slate-500 align-middle">{u.id}</td>
                    <td className="px-4 py-3 text-center align-middle">{u.email}</td>
                    <td className="px-4 py-3 text-center align-middle">
                      {u.twofa_enabled ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded bg-green-100 text-green-700 text-[10px] sm:text-xs font-bold">
                          <span className="material-symbols-outlined text-sm sm:text-base align-middle">verified_user</span>
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded bg-slate-100 text-slate-500 text-[10px] sm:text-xs font-bold">
                          <span className="material-symbols-outlined text-sm sm:text-base align-middle">block</span>
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center align-middle">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${roleStyles[u.role] || 'bg-slate-100 text-slate-700'}`}>
                        {roleLabels[u.role] || u.role}
                      </span>
                    </td>
                    {(canEditUsers || canDeleteUsers) && (
                    <td className="px-4 py-3 text-center align-middle flex flex-col gap-1.5 items-center justify-center md:flex-row md:gap-1">
                      {canEditUsers && (
                      <button
                        className="w-8 h-8 lg:w-9 lg:h-9 flex items-center justify-center bg-accent text-white rounded-lg shadow hover:bg-accent/90 transition-all"
                        onClick={() => handleEditClick(u)}
                        title="Editar usuario"
                        aria-label="Editar usuario"
                      >
                        <span className="material-symbols-outlined text-lg align-middle">edit</span>
                      </button>
                      )}
                      {canDeleteUsers && (
                      <button
                        className="w-8 h-8 lg:w-9 lg:h-9 flex items-center justify-center bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition-all disabled:opacity-60"
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
                      )}
                    </td>
                    )}
                  </tr>
                ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
