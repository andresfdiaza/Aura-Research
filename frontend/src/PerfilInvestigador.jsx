import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { API_BASE } from './config';

const assetImages = import.meta.glob('./assets/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default'
});

function normalizeText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenize(text) {
  const stopwords = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'docente', 'unac']);
  return normalizeText(text)
    .split(' ')
    .filter((token) => token.length > 1 && !stopwords.has(token));
}

function tokenSimilar(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.startsWith(b) || b.startsWith(a)) return true;
  if (a.length >= 5 && b.length >= 5 && a.slice(0, 5) === b.slice(0, 5)) return true;
  return false;
}

function getInvestigatorImage(nombre) {
  const normalizedName = normalizeText(nombre);
  const nameTokens = tokenize(nombre);
  if (!normalizedName || nameTokens.length === 0) return null;

  let bestMatch = null;
  let bestScore = 0;

  for (const [path, src] of Object.entries(assetImages)) {
    const fileName = path.split('/').pop() || '';
    const baseName = fileName.replace(/\.[^.]+$/, '');
    const normalizedFileName = normalizeText(baseName);
    const fileTokens = tokenize(baseName);

    if (normalizedFileName.includes('logo') || normalizedFileName.includes('fondo')) {
      continue;
    }

    if (normalizedName.includes(normalizedFileName) || normalizedFileName.includes(normalizedName)) {
      return src;
    }

    const overlap = nameTokens.filter((nameToken) =>
      fileTokens.some((fileToken) => tokenSimilar(fileToken, nameToken))
    );

    if (overlap.length > bestScore) {
      bestScore = overlap.length;
      bestMatch = src;
    }
  }

  return bestScore >= 2 ? bestMatch : null;
}

export default function PerfilInvestigador() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;
  const nombreInvestigador = location.state?.nombreInvestigador;
  const homePath = user?.role === 'admin' ? '/homeadmin' : '/home';
  const userName = user?.email?.split('@')[0] || 'Usuario';

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [datosInvestigador, setDatosInvestigador] = React.useState(null);

  React.useEffect(() => {
    if (!nombreInvestigador) {
      setError('No se especificó un investigador');
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Buscar datos del investigador desde los resultados
        const res = await fetch(`${API_BASE}/resultados`);
        if (!res.ok) throw new Error('Error fetching resultados');
        const data = await res.json();

        // Filtrar por nombre del investigador
        const datosInv = data.filter(r => r.nombre === nombreInvestigador);
        
        console.log('[PerfilInvestigador] Datos filtrados:', datosInv);
        console.log('[PerfilInvestigador] Total registros encontrados:', datosInv.length);
        
        if (datosInv.length === 0) {
          throw new Error('No se encontraron datos del investigador');
        }

        // Obtener el primer registro para datos básicos
        const primerRegistro = datosInv[0];
        console.log('[PerfilInvestigador] Primer registro:', primerRegistro);
        console.log('[PerfilInvestigador] Sexo:', primerRegistro.sexo);
        console.log('[PerfilInvestigador] Grado:', primerRegistro.grado);

        // Obtener el último grado (el más reciente o el que tenga valor)
        const gradosDisponibles = datosInv.filter(r => r.grado).map(r => r.grado);
        console.log('[PerfilInvestigador] Grados disponibles:', gradosDisponibles);
        const ultimoGrado = gradosDisponibles.length > 0 ? gradosDisponibles[gradosDisponibles.length - 1] : 'No disponible';

        setDatosInvestigador({
          nombre_completo: primerRegistro.nombre,
          genero: primerRegistro.sexo || 'No disponible',
          facultad: primerRegistro.facultad || 'No disponible',
          programa: primerRegistro.programa || 'No disponible',
          link_cvlac: primerRegistro.link_cvlac || null,
          ultimo_grado: ultimoGrado,
          correo: primerRegistro.correo || 'No disponible',
          orcid: primerRegistro.orcid || null,
          google_scholar: primerRegistro.google_scholar || null,
          totalProductos: datosInv.length
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [nombreInvestigador]);

  const correoLimpio = React.useMemo(() => {
    const correoRaw = datosInvestigador?.correo;
    if (!correoRaw || correoRaw === 'No disponible') return '';

    // Normaliza entradas como "mailto:correo@dominio.com" o con espacios accidentales.
    const normalizado = String(correoRaw).replace(/^mailto:/i, '').trim();
    return normalizado;
  }, [datosInvestigador]);

  const mailtoHref = correoLimpio ? `mailto:${encodeURIComponent(correoLimpio)}` : '';

  const fotoInvestigador = React.useMemo(() => {
    const nombreObjetivo = datosInvestigador?.nombre_completo || nombreInvestigador;
    return getInvestigatorImage(nombreObjetivo);
  }, [datosInvestigador, nombreInvestigador]);

  if (!nombreInvestigador) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">No se especificó un investigador</p>
          <button
            onClick={() => navigate('/DirectorioInvestigadores', { state: { user } })}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
          >
            Volver al Directorio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 md:px-16 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-10 rounded-lg bg-primary text-white">
            <span className="material-symbols-outlined text-2xl">person</span>
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto flex-1 flex flex-col">
        <main className="flex-1 flex flex-col items-center py-8 px-6 md:px-16">
          <div className="max-w-4xl w-full flex flex-col gap-6">
            {/* Botón volver */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/DirectorioInvestigadores', { state: { user } })}
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-primary rounded-lg font-semibold hover:bg-slate-300 transition-all"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                <span>Volver al Directorio</span>
              </button>
            </div>

            {loading && (
              <div className="text-center py-12">
                <p className="text-lg text-slate-500">Cargando perfil del investigador...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <p className="text-red-600 text-lg">Error: {error}</p>
              </div>
            )}

            {!loading && !error && datosInvestigador && (
              <>
                {/* Encabezado del perfil */}
                <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 text-white shadow-lg">
                  <div className="flex items-center gap-6">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full border-2 border-white/40 flex items-center justify-center w-24 h-24">
                      {fotoInvestigador ? (
                        <img
                          src={fotoInvestigador}
                          alt={`Foto de ${datosInvestigador.nombre_completo}`}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-6xl">person</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold mb-2">{datosInvestigador.nombre_completo}</h1>
                      <p className="text-white/90 text-lg">{datosInvestigador.facultad}</p>
                      <p className="text-white/80">{datosInvestigador.programa}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/80 text-sm">Total de Productos</p>
                      <p className="text-4xl font-bold">{datosInvestigador.totalProductos}</p>
                    </div>
                  </div>
                </div>

                {/* Información básica */}
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 md:p-7">
                  <div className="mb-6 pb-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">info</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-primary leading-tight">Información Básica</h2>
                      <p className="text-sm text-slate-500">Resumen general del investigador</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">Nombre Completo</p>
                      <p className="text-base md:text-lg text-slate-900 font-semibold break-words">{datosInvestigador.nombre_completo}</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">Género</p>
                      <p className="text-base md:text-lg text-slate-900 font-semibold">{datosInvestigador.genero}</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                      <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">Último Grado Obtenido</p>
                      <p className="text-base md:text-lg text-slate-900 font-semibold break-words">{datosInvestigador.ultimo_grado}</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                      <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">Correo Electrónico</p>
                      {correoLimpio ? (
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <p className="text-base md:text-lg text-slate-900 font-semibold break-all">{correoLimpio}</p>
                          <button
                            type="button"
                            onClick={() => {
                              if (mailtoHref) {
                                window.location.href = mailtoHref;
                              }
                            }}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-all"
                          >
                            <span className="material-symbols-outlined text-base">mail</span>
                            Enviar correo
                          </button>
                        </div>
                      ) : (
                        <p className="text-base md:text-lg text-slate-900 font-semibold break-all">No disponible</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Enlaces académicos */}
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
                  <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined">link</span>
                    Enlaces Académicos
                  </h2>

                  <div className="space-y-4">
                    {/* CVLAC */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 rounded-full p-2">
                          <span className="material-symbols-outlined text-primary">description</span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">CVLAC</p>
                          <p className="text-sm text-slate-600">Curriculum Vitae Latinoamericano y del Caribe</p>
                        </div>
                      </div>
                      {datosInvestigador.link_cvlac ? (
                        <a
                          href={datosInvestigador.link_cvlac}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-all"
                        >
                          Ver perfil
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-sm italic">No disponible</span>
                      )}
                    </div>

                    {/* ORCID */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 rounded-full p-2">
                          <span className="material-symbols-outlined text-green-600">badge</span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">ORCID</p>
                          <p className="text-sm text-slate-600">Open Researcher and Contributor ID</p>
                        </div>
                      </div>
                      {datosInvestigador.orcid ? (
                        <a
                          href={datosInvestigador.orcid}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
                        >
                          Ver perfil
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-sm italic">No disponible</span>
                      )}
                    </div>

                    {/* Google Scholar */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 rounded-full p-2">
                          <span className="material-symbols-outlined text-blue-600">school</span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Google Scholar</p>
                          <p className="text-sm text-slate-600">Perfil académico en Google Scholar</p>
                        </div>
                      </div>
                      {datosInvestigador.google_scholar ? (
                        <a
                          href={datosInvestigador.google_scholar}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
                        >
                          Ver perfil
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-sm italic">No disponible</span>
                      )}
                    </div>
                  </div>
                </div>

              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
