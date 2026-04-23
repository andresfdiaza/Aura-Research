import React from 'react';
import { useLocation, useNavigate, Link, Navigate } from 'react-router-dom';
import AuraLogo from '../../components/AuraLogo';
import TwoFASettings from '../../components/TwoFASettings';
import { API_BASE } from '../../config';
import { authHeaders } from '../../utils/rolePermissions';

export default function Ajustes() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;
  const normalizedRole = String(user?.role || '').trim().toLowerCase() === 'user'
    ? 'investigador'
    : String(user?.role || '').trim().toLowerCase();
  const isAdmin = normalizedRole === 'admin';
  const canDownloadGrouplab = normalizedRole === 'coordinador' || normalizedRole === 'director';

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const [show2FASettings, setShow2FASettings] = React.useState(false);
  const [showChangePassword, setShowChangePassword] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [passwordError, setPasswordError] = React.useState('');
  const [passwordSuccess, setPasswordSuccess] = React.useState('');
  const [savingPassword, setSavingPassword] = React.useState(false);

  const resetPasswordForm = React.useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setSavingPassword(false);
  }, []);

  const openChangePasswordModal = React.useCallback(() => {
    setPasswordSuccess('');
    resetPasswordForm();
    setShowChangePassword(true);
  }, [resetPasswordForm]);

  const closeChangePasswordModal = React.useCallback(() => {
    resetPasswordForm();
    setShowChangePassword(false);
  }, [resetPasswordForm]);

  const handleChangePassword = React.useCallback(
    async (event) => {
      event.preventDefault();
      setPasswordError('');
      setPasswordSuccess('');

      if (!currentPassword || !newPassword || !confirmPassword) {
        setPasswordError('Completa todos los campos.');
        return;
      }

      if (newPassword.length < 8) {
        setPasswordError('La nueva contraseña debe tener al menos 8 caracteres.');
        return;
      }

      if (newPassword !== confirmPassword) {
        setPasswordError('La confirmación no coincide con la nueva contraseña.');
        return;
      }

      if (currentPassword === newPassword) {
        setPasswordError('La nueva contraseña debe ser diferente a la actual.');
        return;
      }

      setSavingPassword(true);
      try {
        const response = await fetch(`${API_BASE}/users/change-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders(user),
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          setPasswordError(payload.message || 'No se pudo cambiar la contraseña.');
          return;
        }

        setPasswordSuccess(payload.message || 'Contraseña actualizada correctamente.');
        setShowChangePassword(false);
        resetPasswordForm();
      } catch (_error) {
        setPasswordError('Error de conexión al cambiar la contraseña.');
      } finally {
        setSavingPassword(false);
      }
    },
    [API_BASE, confirmPassword, currentPassword, newPassword, resetPasswordForm, user]
  );

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden font-manrope bg-[var(--color-bg)]">
      <header className="flex flex-wrap items-center justify-between gap-y-3 border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 sm:px-6 md:px-16 py-4 sticky top-0 z-50">
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
            to="/homeadmin"
            state={{ user }}
            className="text-primary text-sm font-bold border-b-2 border-accent pb-1"
          >
            Inicio
          </Link>
          <Link
            to="/DirectorioInvestigadores"
            state={{ user }}
            className="text-slate-500 hover:text-primary text-sm font-semibold transition-colors"
          >
            Investigadores
          </Link>
          <Link
            to="/analisis"
            state={{ user }}
            className="text-slate-500 hover:text-primary text-sm font-semibold transition-colors"
          >
            Análisis
          </Link>
          {isAdmin && (
            <Link
              to="/usuarios"
              state={{ user }}
              className="text-slate-500 hover:text-primary text-sm font-semibold transition-colors"
            >
              Usuarios
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button disabled className="flex items-center justify-center rounded-full size-10 bg-slate-100 text-primary cursor-default" title="Ajustes">
              <span className="material-symbols-outlined">settings</span>
            </button>
          </div>
          <div className="h-10 w-[1px] bg-slate-200 mx-2"></div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-primary">{user.nombre_completo || user.email}</p>
            </div>
            <div className="bg-primary/10 rounded-full border border-primary/20 flex items-center justify-center w-10 h-10 overflow-hidden">
              {user.foto ? (
                <img src={user.foto} alt="Profile" className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="material-symbols-outlined text-primary text-2xl">person</span>
              )}
            </div>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem('aura_user');
                } catch (_) {}
                navigate('/');
              }}
              className="flex items-center gap-1 px-3 py-2 ml-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-all text-sm font-semibold"
              title="Cerrar sesión"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>
      <main className="pt-24 px-2 w-full flex flex-col items-center">
        <div className="w-full max-w-lg space-y-8">
          {/* User Card */}
          <section className="relative overflow-visible p-0 rounded-3xl flex flex-col items-center">
            <div className="-mt-8 mb-2 w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-[var(--color-bg)]">
              <img alt={user.nombre_completo || user.email} className="w-full h-full object-cover" src={user.foto || 'https://lh3.googleusercontent.com/a/default-user'} />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-extrabold text-[var(--color-primary)] tracking-tight leading-tight mb-1">{user.nombre_completo || user.email}</h2>
              <p className="text-[var(--color-secondary)] text-sm font-medium mb-1">{user.email}</p>
              <span className="inline-flex px-3 py-1 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-full text-xs font-bold uppercase tracking-widest shadow-sm">{user.role}</span>
            </div>
          </section>
          {/* Security Section */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]/80 px-1 mb-1">Seguridad y Acceso</h3>
            <div className="bg-white/80 rounded-2xl divide-y divide-[var(--color-accent)] overflow-hidden shadow-lg border border-[var(--color-accent)]/30">
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[var(--color-primary)]/10 rounded-xl text-[var(--color-primary)]">
                    <span className="material-symbols-outlined">lock</span>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--color-primary)]">Autenticación de Dos Factores (2FA)</p>
                    <p className="text-xs text-[var(--color-secondary)]">Añade una capa extra de seguridad</p>
                  </div>
                </div>
                <button className="relative inline-flex items-center cursor-pointer hover:bg-[var(--color-secondary)]/20 p-2 rounded-lg transition" onClick={() => setShow2FASettings(true)}>
                  <span className="material-symbols-outlined text-[var(--color-secondary)]">settings</span>
                </button>
                {show2FASettings && (
                  <TwoFASettings user={user} onClose={() => setShow2FASettings(false)} />
                )}
              </div>
              <button
                onClick={openChangePasswordModal}
                className="w-full p-5 flex items-center justify-between hover:bg-[var(--color-secondary)]/10 transition-colors active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[var(--color-primary)]/10 rounded-xl text-[var(--color-primary)]">
                    <span className="material-symbols-outlined">password</span>
                  </div>
                  <p className="font-semibold text-[var(--color-primary)]">Cambiar Contraseña</p>
                </div>
                <span className="material-symbols-outlined text-[var(--color-secondary)]">chevron_right</span>
              </button>
            </div>
            {passwordSuccess && (
              <p className="px-2 text-sm font-semibold text-emerald-700">{passwordSuccess}</p>
            )}
          </section>
        </div>
        {/* CSV Download Section */}
        <section className="mt-8 w-full max-w-lg">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]/80 px-1 mb-1">Descarga de Datos</h3>
          <div className="bg-white/80 rounded-2xl p-5 shadow-lg border border-[var(--color-accent)]/30 flex flex-col gap-4">
            <button
              className="flex items-center gap-2 px-4 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition"
              onClick={async () => {
                try {
                  const res = await fetch(`${API_BASE}/export/cvlac`, {
                    headers: authHeaders(user)
                  });
                  if (!res.ok) {
                    alert('No se pudo descargar el CSV de CVLAC');
                    return;
                  }
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'cvlac.csv';
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  alert('Error al descargar el CSV de CVLAC');
                }
              }}
            >
              <span className="material-symbols-outlined">download</span>
              Descargar CSV de CVLAC
            </button>
            {canDownloadGrouplab && (
              <button
                className="flex items-center gap-2 px-4 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition"
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_BASE}/export/grouplab`, {
                      headers: authHeaders(user)
                    });
                    if (!res.ok) {
                      alert('No se pudo descargar el CSV de Grouplab');
                      return;
                    }
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'grouplab.csv';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    alert('Error al descargar el CSV de Grouplab');
                  }
                }}
              >
                <span className="material-symbols-outlined">download</span>
                Descargar CSV de Grouplab
              </button>
            )}
          </div>
        </section>
        {/* Logout Footer */}
        <div className="pt-8 w-full max-w-lg">
          <button onClick={() => { localStorage.removeItem('aura_user'); navigate('/'); }} className="w-full py-4 flex items-center justify-center gap-3 rounded-2xl bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] font-bold border border-[var(--color-secondary)]/20 hover:bg-[var(--color-secondary)]/20 transition-all active:scale-[0.97] shadow">
            <span className="material-symbols-outlined">logout</span>
            Cerrar Sesión
          </button>
          <p className="text-center text-[11px] text-[var(--color-primary)]/40 mt-8 font-medium tracking-wide">AURA RESEARCH UNAC v2.4.0 • 2026</p>
        </div>
      </main>
      {showChangePassword && (
        <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[1px] flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[var(--color-accent)]/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-extrabold text-[var(--color-primary)]">Cambiar contraseña</h4>
              <button
                onClick={closeChangePasswordModal}
                className="p-1 rounded-md text-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/10"
                title="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleChangePassword}>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-primary)] mb-1">Contraseña actual</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-primary)] mb-1">Nueva contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-primary)] mb-1">Confirmar nueva contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40"
                  autoComplete="new-password"
                />
              </div>

              {passwordError && (
                <p className="text-sm font-semibold text-red-600">{passwordError}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeChangePasswordModal}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  {savingPassword ? 'Guardando...' : 'Guardar contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
