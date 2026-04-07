import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import AuraLogo from '../../components/AuraLogo';
import TwoFASettings from '../../components/TwoFASettings';

export default function Ajustes() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user || JSON.parse(localStorage.getItem('aura_user') || 'null');
  const isAdmin = String(user?.role || '').trim().toLowerCase() === 'admin';

  if (!user) {
    navigate('/');
    return null;
  }

  const [show2FASettings, setShow2FASettings] = React.useState(false);

  // Placeholder states for other settings
  const [notifications, setNotifications] = React.useState(true);
  const [language, setLanguage] = React.useState('es');

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden font-manrope bg-[var(--color-bg)]">
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
            <button className="flex items-center justify-center rounded-full size-10 bg-slate-100 text-primary hover:bg-slate-200 transition-all">
              <span className="material-symbols-outlined">notifications</span>
            </button>
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
              <button className="w-full p-5 flex items-center justify-between hover:bg-[var(--color-secondary)]/10 transition-colors active:scale-[0.98]">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[var(--color-primary)]/10 rounded-xl text-[var(--color-primary)]">
                    <span className="material-symbols-outlined">password</span>
                  </div>
                  <p className="font-semibold text-[var(--color-primary)]">Cambiar Contraseña</p>
                </div>
                <span className="material-symbols-outlined text-[var(--color-secondary)]">chevron_right</span>
              </button>
            </div>
          </section>
          {/* Preferences Section */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]/80 px-1 mb-1">Preferencias</h3>
            <div className="bg-white/80 rounded-2xl divide-y divide-[var(--color-accent)] overflow-hidden shadow-lg border border-[var(--color-accent)]/30">
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[var(--color-primary)]/10 rounded-xl text-[var(--color-primary)]">
                    <span className="material-symbols-outlined">notifications</span>
                  </div>
                  <p className="font-semibold text-[var(--color-primary)]">Notificaciones</p>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input className="sr-only peer" type="checkbox" checked={notifications} onChange={() => setNotifications(n => !n)} />
                  <div className="w-11 h-6 bg-[var(--color-secondary)]/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-secondary)]"></div>
                </div>
              </div>
              <button className="w-full p-5 flex items-center justify-between hover:bg-[var(--color-secondary)]/10 transition-colors active:scale-[0.98]">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[var(--color-primary)]/10 rounded-xl text-[var(--color-primary)]">
                    <span className="material-symbols-outlined">language</span>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-[var(--color-primary)]">Idioma</p>
                    <p className="text-xs text-[var(--color-secondary)] font-bold">Español</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[var(--color-secondary)]">translate</span>
              </button>
            </div>
          </section>
          {/* Sessions Section */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]/80 px-1 mb-1">Sesiones</h3>
            <div className="bg-white/80 rounded-2xl overflow-hidden shadow-lg border border-[var(--color-accent)]/30">
              <button className="w-full p-5 flex items-center justify-between hover:bg-[var(--color-secondary)]/10 transition-colors active:scale-[0.98]">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[var(--color-primary)]/10 rounded-xl text-[var(--color-primary)]">
                    <span className="material-symbols-outlined">devices</span>
                  </div>
                  <p className="font-semibold text-[var(--color-primary)]">Sesiones Activas</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="material-symbols-outlined text-[var(--color-secondary)]">chevron_right</span>
                </div>
              </button>
            </div>
          </section>
        </div>
        {/* Logout Footer */}
        <div className="pt-8 w-full max-w-lg">
          <button onClick={() => { localStorage.removeItem('aura_user'); navigate('/'); }} className="w-full py-4 flex items-center justify-center gap-3 rounded-2xl bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] font-bold border border-[var(--color-secondary)]/20 hover:bg-[var(--color-secondary)]/20 transition-all active:scale-[0.97] shadow">
            <span className="material-symbols-outlined">logout</span>
            Cerrar Sesión
          </button>
          <p className="text-center text-[11px] text-[var(--color-primary)]/40 mt-8 font-medium tracking-wide">AURA RESEARCH UNAC v2.4.0 • 2026</p>
        </div>
      </main>
    </div>
  );
}
