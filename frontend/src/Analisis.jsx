import React from 'react';
import { useLocation, Link } from 'react-router-dom';

export default function Analisis() {
  const location = useLocation();
  const user = location.state?.user;
  const categories = [
    'General',
    'Nuevo Conocimiento',
    'Desarrollo Tecnológico e Innovación',
    'Apropiación Social de Conocimiento',
    'Divulgación Pública de la Ciencia',
    'Formación del Recurso Humano',
  ];

  // choose an icon name per category
  const iconFor = (cat) => {
    switch (cat) {
      case 'General':
        return 'dashboard';
      case 'Nuevo Conocimiento':
        return 'psychology';
      case 'Desarrollo Tecnológico e Innovación':
        return 'computer';
      case 'Apropiación Social de Conocimiento':
        return 'groups';
      case 'Divulgación Pública de la Ciencia':
        return 'public';
      case 'Formación del Recurso Humano':
        return 'school';
      default:
        return 'analytics';
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 md:px-16 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-10 rounded-lg bg-primary text-white">
            <span className="material-symbols-outlined text-2xl">analytics</span>
          </div>
          <div className="flex flex-col">
            <h2 className="text-primary text-lg font-bold leading-tight tracking-tight">AURA RESEARCH UNAC</h2>
            <span className="text-xs text-neutral-muted font-medium uppercase tracking-wider">
              Facultad de Ingeniería
            </span>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <Link className="text-primary text-sm font-bold border-b-2 border-accent pb-1" to="/home" state={{ user }}>
            Inicio
          </Link>
          <Link
            className="text-slate-500 hover:text-primary text-sm font-semibold transition-colors"
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
      </header>
      <main className="flex-1 flex flex-col items-center py-12 px-0 md:px-0">
        <div className="max-w-6xl w-full flex flex-col gap-12">
          <h1 className="text-4xl font-black text-primary">Tipología de productos</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {categories.map(cat => (
              <div
                key={cat}
                className="action-card group relative flex flex-col overflow-hidden rounded-3xl shadow-soft"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 transition-transform group-hover:scale-110 group-hover:rotate-12 rounded-full">
                  <span className="material-symbols-outlined text-[120px] text-[#F5A800]">{iconFor(cat)}</span>
                </div>
                <div className="p-8 md:p-10 flex flex-col h-full relative z-10">
                  <h3 className="text-2xl font-bold text-primary mb-3 tracking-tight">
                    {cat}
                  </h3>
                  <div className="mt-auto">
                    {cat === 'General' ? (
                      <Link
                        to="/datos"
                        state={{ user, tipologia: '' }}
                        className="flex items-center gap-2 text-primary font-bold group-hover:gap-4 transition-all uppercase text-sm tracking-widest"
                      >
                        Ver
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </Link>
                    ) : cat === 'Nuevo Conocimiento' ? (
                      <Link
                        to="/NuevoConocimiento"
                        state={{ user }}
                        className="flex items-center gap-2 text-primary font-bold group-hover:gap-4 transition-all uppercase text-sm tracking-widest"
                      >
                        Ver
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </Link>
                    ) : (
                      <Link
                        to="/datos"
                        state={{ user, tipologia: cat }}
                        className="flex items-center gap-2 text-primary font-bold group-hover:gap-4 transition-all uppercase text-sm tracking-widest"
                      >
                        Ver
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </Link>
                    )}
                  </div>
                </div>
                <div className="h-2 w-full bg-primary mt-auto"></div>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-8">
            <button
              className="px-4 py-2 bg-slate-200 text-primary rounded-lg font-semibold hover:bg-slate-300 transition-all"
              onClick={() => window.history.back()}
            >
              <span className="material-symbols-outlined align-middle mr-2">arrow_back</span>
              Volver
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
