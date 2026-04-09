import React from 'react';
import { useLocation, Navigate, Link, useNavigate } from 'react-router-dom';
import '../../styles/pages/home.css';
import AuraLogo from '../../components/AuraLogo';
import TwoFASettings from '../../components/TwoFASettings';
import { getRolePermissions, homePathForRole, roleLabel } from '../../utils/rolePermissions';

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;
  const permissions = getRolePermissions(user?.role);
  const homePath = homePathForRole(user?.role);
  const currentRoleLabel = roleLabel(user?.role);

  const [show2FA, setShow2FA] = React.useState(false);

  if (!user) {
    // if accessed directly without login redirect to login
    return <Navigate to="/" replace />;
  }

  function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
  const userName = capitalizeFirst((user?.email || 'Usuario').split('@')[0]);

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
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
            className="text-primary text-sm font-bold border-b-2 border-accent pb-1"
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
          {permissions.canViewUsers && (
            <Link
              className="text-slate-500 hover:text-primary text-sm font-semibold transition-colors"
              to="/usuarios"
              state={{ user }}
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
            <Link
              to="/ajustes"
              state={{ user }}
              className="flex items-center justify-center rounded-full size-10 bg-slate-100 text-primary hover:bg-slate-200 transition-all"
              title="Ajustes"
            >
              <span className="material-symbols-outlined">settings</span>
            </Link>
          </div>
          <div className="h-10 w-[1px] bg-slate-200 mx-2"></div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-primary">{userName}</p>
            </div>
            <div className="bg-primary/10 rounded-full border border-primary/20 flex items-center justify-center w-10 h-10">
              <span className="material-symbols-outlined text-primary text-2xl">person</span>
            </div>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem('aura_user');
                } catch (_) {
                  // ignore storage errors
                }
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
      <div className="container mx-auto flex-1 flex flex-col">
        <main className="flex-1 flex flex-col items-center pt-2 px-4 sm:px-6 md:px-16">
          <div className="max-w-6xl w-full flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col gap-3">
                <h1 className="text-primary text-3xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight">
                  <br className="hidden md:block" />¡{userName} Bienvenido al <span className="text-primary">Sistema analitico de investigadores de la UNAC</span> !
                </h1>
                <div className="inline-flex w-fit items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                  Rol activo: {currentRoleLabel}
                </div>
                <p className="text-slate-600 text-lg max-w-2xl leading-relaxed">
                  <span className="align-left-fix">Gestión y análisis de productos de investigación de la Corporación Universitaria Adventista. Visualiza el impacto de la producción científica en tiempo real.</span>
                </p>
              </div>
            </div>
            {/* Botón de doble factor eliminado, ahora está en la tuerquita */}
            <div className={`grid grid-cols-1 ${permissions.canViewUsers ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-8 mb-16`}>
              <div className="action-card group relative flex flex-col overflow-hidden rounded-3xl shadow-soft w-full max-w-[22rem] mx-auto">
                <div className="absolute top-0 right-0 p-4 opacity-5 transition-transform group-hover:scale-110 group-hover:rotate-12">
                  <span className="material-symbols-outlined text-[60px] text-primary">group_add</span>
                </div>
                <div className="p-6 md:p-8 flex flex-col h-full relative z-10">
                  <div className="size-14 rounded-2xl bg-[#F5A800] flex items-center justify-center text-white mb-6 shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-3xl">person_add</span>
                  </div>
                  <h3 className="text-xl font-bold text-primary mb-3 tracking-tight">
                    Directorio de Investigadores
                  </h3>
                  <p className="text-slate-600 mb-8 text-sm">
                    Accede al directorio completo de investigadores afiliados a la UNAC, con detalles de su producción científica.
                  </p>
                  <div className="mt-auto">
                    <Link
                      to="/DirectorioInvestigadores"
                      state={{ user }}
                      className="flex items-center gap-2 text-primary font-bold group-hover:gap-4 transition-all uppercase text-sm tracking-widest"
                      style={{ margin: '5px' }}>
                      Ingresar
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </Link>
                  </div>
                </div>
                <div className="h-2 w-full bg-[#F5A800] mt-auto"></div>
              </div>
              {/* Card for Analisis categories */}
              <div className="action-card group relative flex flex-col overflow-hidden rounded-3xl shadow-soft w-full max-w-[22rem] mx-auto">
                <div className="absolute top-0 right-0 p-4 opacity-5 transition-transform group-hover:scale-110 group-hover:rotate-12">
                  <span className="material-symbols-outlined text-[60px] text-primary">analytics</span>
                </div>
                <div className="p-6 md:p-8 flex flex-col h-full relative z-10">
                  <div className="size-14 rounded-2xl bg-[#F5A800] flex items-center justify-center text-white mb-6 shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-3xl" style={{ color: '#FFF' }}>insights</span>
                  </div>
                  <h3 className="text-xl font-bold text-primary mb-3 tracking-tight">
                    Análisis
                  </h3>
                  <p className="text-slate-600 mb-8 text-sm">
                    Navega por las tipologías de análisis.
                  </p>
                  <div className="mt-auto">
                    <Link
                      to="/analisis"
                      state={{ user }}
                      className="flex items-center gap-2 text-primary font-bold group-hover:gap-4 transition-all uppercase text-sm tracking-widest"
                      style={{ margin: '5px' }}>
                      Analizar
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </Link>
                  </div>
                </div>
                <div className="h-2 w-full bg-[#F5A800] mt-auto"></div>
              </div>
              {permissions.canViewUsers && (
                <div className="action-card group relative flex flex-col overflow-hidden rounded-3xl shadow-soft w-full max-w-[22rem] mx-auto">
                  <div className="absolute top-0 right-0 p-4 opacity-5 transition-transform group-hover:scale-110 group-hover:rotate-12">
                    <span className="material-symbols-outlined text-[60px] text-primary">supervisor_account</span>
                  </div>
                  <div className="p-6 md:p-8 flex flex-col h-full relative z-10">
                    <div className="size-14 rounded-2xl bg-[#F5A800] flex items-center justify-center text-white mb-6 shadow-lg shadow-primary/20">
                      <span className="material-symbols-outlined text-3xl">supervisor_account</span>
                    </div>
                    <h3 className="text-xl font-bold text-primary mb-3 tracking-tight">
                      Usuarios
                    </h3>
                    <p className="text-slate-600 mb-8 text-sm">
                      Gestiona usuarios, roles y acceso al sistema.
                    </p>
                    <div className="mt-auto">
                      <Link
                        to="/usuarios"
                        state={{ user }}
                        className="flex items-center gap-2 text-primary font-bold group-hover:gap-4 transition-all uppercase text-sm tracking-widest"
                        style={{ margin: '5px' }}
                      >
                        Administrar
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-[#F5A800] mt-auto"></div>
                </div>
              )}
            </div>
            {permissions.canViewUsers && (
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <h3 className="text-sm font-bold text-primary">Permisos de tu rol</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {permissions.canManageUsers
                    ? 'Tienes acceso de administracion de usuarios y configuracion avanzada.'
                    : 'Tienes acceso de consulta. La gestion de usuarios esta reservada para administradores.'}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
      {show2FA && (
        <TwoFASettings user={user} onClose={() => setShow2FA(false)} />
      )}
      <footer className="mt-auto py-2 border-t border-slate-200 bg-white text-center">
        <p className="text-xs text-neutral-muted font-medium leading-tight">
          © 2026 Corporacion Universitaria Adventista - Facultad de Ingeniería 
        </p>
      </footer>
    </div>
  );
}

