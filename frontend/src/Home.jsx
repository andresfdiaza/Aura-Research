import React from 'react';
import { useLocation, Navigate, Link, useNavigate } from 'react-router-dom';
import './home.css';

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;
  const homePath = user?.role === 'admin' ? '/homeadmin' : '/home';

  if (!user) {
    // if accessed directly without login redirect to login
    return <Navigate to="/" replace />;
  }

  const userName = user.email.split('@')[0];

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
      <div className="container mx-auto flex-1 flex flex-col">
        <main className="flex-1 flex flex-col items-center pt-2 px-6 md:px-16">
        <div className="max-w-6xl w-full flex flex-col gap-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex flex-col gap-3">
              <h1 className="text-primary text-4xl md:text-5xl font-black leading-tight tracking-tight">
                <br className="hidden md:block" />¡{userName} Bienvenido al <span className="text-primary">Sistema analitico de investigadores de la UNAC</span> !
              </h1>
              <p className="text-slate-600 text-lg max-w-2xl leading-relaxed">
                Gestión y análisis de productos de investigación de la Corporación Universitaria Adventista. Visualiza el
                impacto de la producción científica en tiempo real.
              </p>
            </div>

          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="action-card group relative flex flex-col overflow-hidden rounded-3xl shadow-soft max-w-sm mx-auto">
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
                  >
                    Ingresar
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </Link>
                </div>
              </div>
              <div className="h-2 w-full bg-[#F5A800] mt-auto"></div>
            </div>
            {/* Card for Analisis categories */}
            <div className="action-card group relative flex flex-col overflow-hidden rounded-3xl shadow-soft max-w-sm mx-auto">
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
                  >
                    Analizar
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </Link>
                </div>
              </div>
              <div className="h-2 w-full bg-[#F5A800] mt-auto"></div>
            </div>
          </div>
         
        </div>
      </main>
      </div>
      <footer className="mt-auto py-8 border-t border-slate-200 bg-white text-center">
        <p className="text-sm text-neutral-muted font-medium">
          © 2026 Corporacion Universitaria Adventista - Facultad de Ingeniería 
        </p>
      </footer>
    </div>
  );
}

