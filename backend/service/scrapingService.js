const { exec } = require('child_process');
const path = require('path');
const repo = require('../repository/investigadorRepository');
const pool = require('../db');

const scrapingProgressByActor = new Map();

function actorProgressKey(actor) {
  if (actor?.id) return `user:${actor.id}`;
  if (actor?.email) return `email:${String(actor.email).toLowerCase()}`;
  return 'anonymous';
}

function buildInitialProgress() {
  return {
    status: 'idle',
    message: null,
    error: null,
    updatedAt: Date.now(),
    startedAt: null,
    finishedAt: null,
    steps: {
      cvlac: 'pending',
      grouplab: 'pending',
      limpieza: 'pending',
      coincidencias: 'pending',
      vistas: 'pending',
    },
  };
}

function getOrCreateProgress(actor) {
  const key = actorProgressKey(actor);
  const current = scrapingProgressByActor.get(key) || buildInitialProgress();
  scrapingProgressByActor.set(key, current);
  return current;
}

function setProgressStep(progress, step, state) {
  progress.steps[step] = state;
  progress.updatedAt = Date.now();
}

function markProgressError(progress, error, step) {
  progress.status = 'error';
  progress.error = error?.message || 'Error ejecutando scraping';
  progress.message = progress.error;
  if (step) {
    setProgressStep(progress, step, 'failed');
  }
  progress.finishedAt = Date.now();
  progress.updatedAt = Date.now();
}

function cloneProgress(progress) {
  return JSON.parse(JSON.stringify(progress));
}

const runPythonScript = (scriptPath, env) =>
  new Promise((resolve, reject) => {
    exec(`python "${scriptPath}"`, { env, maxBuffer: 1024 * 500 }, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      resolve({ stdout, stderr });
    });
  });

const runNormalizationPipeline = async (env, progress) => {
  const base = path.resolve(__dirname, '..', '..', 'Scraping');
  const scripts = [
    { name: 'crear_titulo_grouplab_clean_v2.py', step: 'limpieza' },
    { name: 'crear_tabla_resultados_coincidentes.py', step: 'coincidencias' },
    { name: 'crear_vista_normalizada_final.py', step: 'vistas' },
    { name: 'crear_vistas_sin_coincidencias.py', step: 'vistas' },
  ];

  const lastIndexByStep = scripts.reduce((acc, item, idx) => {
    acc[item.step] = idx;
    return acc;
  }, {});

  let pipelineStdout = '\n--- Normalization pipeline ---\n';
  let pipelineStderr = '';

  for (let idx = 0; idx < scripts.length; idx += 1) {
    const script = scripts[idx];
    if (progress && progress.steps[script.step] !== 'in_progress' && progress.steps[script.step] !== 'completed') {
      setProgressStep(progress, script.step, 'in_progress');
    }

    try {
      const scriptPath = path.resolve(base, script.name);
      const result = await runPythonScript(scriptPath, env);
      pipelineStdout += `\n[${script.name}]\n${result.stdout || ''}`;
      if (result.stderr) {
        pipelineStderr += `\n[${script.name}]\n${result.stderr}`;
      }

      if (progress && lastIndexByStep[script.step] === idx) {
        setProgressStep(progress, script.step, 'completed');
      }
    } catch (error) {
      if (progress) {
        setProgressStep(progress, script.step, 'failed');
      }
      throw error;
    }
  }

  return { pipelineStdout, pipelineStderr };
};

const getPythonEnv = () =>
  Object.assign({}, process.env, {
    PYTHONIOENCODING: 'utf-8',
    PYTHONUTF8: '1'
  });

function addScrapingScopeToEnv(env, actor) {
  if (!actor || actor.role !== 'director') {
    return env;
  }

  const universidadIds = Array.isArray(actor.universidadIds)
    ? actor.universidadIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    : [];
  const facultadIds = Array.isArray(actor.facultadIds)
    ? actor.facultadIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    : [];

  if (universidadIds.length > 0) {
    env.CVLAC_ALLOWED_UNIVERSIDAD_IDS = universidadIds.join(',');
  }
  if (facultadIds.length > 0) {
    env.CVLAC_ALLOWED_FACULTAD_IDS = facultadIds.join(',');
  }

  return env;
}

function getScopedIds(actor) {
  const universidadIds = Array.isArray(actor?.universidadIds)
    ? actor.universidadIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    : [];
  const facultadIds = Array.isArray(actor?.facultadIds)
    ? actor.facultadIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    : [];
  return { universidadIds, facultadIds };
}

async function assertDirectorHasScopeTargets(actor) {
  if (!actor || actor.role !== 'director') return;

  const { universidadIds, facultadIds } = getScopedIds(actor);
  if (universidadIds.length === 0 && facultadIds.length === 0) {
    const err = new Error('No tienes universidad/facultad asignada para ejecutar scraping.');
    err.statusCode = 403;
    throw err;
  }

  const where = [];
  const params = [];

  if (facultadIds.length > 0) {
    where.push(`ipf.id_facultad IN (${facultadIds.map(() => '?').join(',')})`);
    params.push(...facultadIds);
  }
  if (universidadIds.length > 0) {
    where.push(`f.id_universidad IN (${universidadIds.map(() => '?').join(',')})`);
    params.push(...universidadIds);
  }

  const filterSql = where.length ? `AND ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT COUNT(DISTINCT i.id_investigador) AS total
     FROM investigadores i
     LEFT JOIN investigador_programa_facultad ipf ON ipf.id_investigador = i.id_investigador
     LEFT JOIN facultad f ON f.id_facultad = ipf.id_facultad
     WHERE i.link_cvlac IS NOT NULL
     ${filterSql}`,
    params
  );

  const totalInvestigadores = Number(rows?.[0]?.total || 0);

  const groupWhere = [];
  const groupParams = [];
  if (facultadIds.length > 0) {
    groupWhere.push(`g.id_facultad IN (${facultadIds.map(() => '?').join(',')})`);
    groupParams.push(...facultadIds);
  }
  if (universidadIds.length > 0) {
    groupWhere.push(`f.id_universidad IN (${universidadIds.map(() => '?').join(',')})`);
    groupParams.push(...universidadIds);
  }
  const groupFilterSql = groupWhere.length ? `WHERE ${groupWhere.join(' AND ')}` : '';
  const [groupRows] = await pool.query(
    `SELECT COUNT(DISTINCT g.id) AS total
     FROM link_grouplab g
     LEFT JOIN facultad f ON f.id_facultad = g.id_facultad
     ${groupFilterSql}`,
    groupParams
  );

  const totalGrupos = Number(groupRows?.[0]?.total || 0);

  if (totalInvestigadores === 0 && totalGrupos === 0) {
    const err = new Error('No se pudo ejecutar la accion porque no hay data para procesar (sin investigadores ni grupos en tu alcance).');
    err.statusCode = 403;
    throw err;
  }
}

// run python scraping logic. the real processing lives in scraping_cvlac_completo.py
exports.executeScraping = async ({ actor } = {}) => {
  const progress = getOrCreateProgress(actor);
  progress.status = 'running';
  progress.message = 'Ejecutando pipeline de scraping...';
  progress.error = null;
  progress.startedAt = Date.now();
  progress.finishedAt = null;
  progress.updatedAt = Date.now();
  progress.steps = buildInitialProgress().steps;

  try {
    await assertDirectorHasScopeTargets(actor);

    const env = addScrapingScopeToEnv(getPythonEnv(), actor);
    const base = path.resolve(__dirname, '..', '..', 'Scraping');
    const cvlacScript = path.resolve(base, 'scraping_cvlac_completo.py');
    const groupLabScript = path.resolve(base, 'scraping_grupoinves.py');

    setProgressStep(progress, 'cvlac', 'in_progress');
    const cvlacResult = await runPythonScript(cvlacScript, env);
    setProgressStep(progress, 'cvlac', 'completed');

    setProgressStep(progress, 'grouplab', 'in_progress');
    const groupLabResult = await runPythonScript(groupLabScript, env);
    setProgressStep(progress, 'grouplab', 'completed');

    const { pipelineStdout, pipelineStderr } = await runNormalizationPipeline(env, progress);

    progress.status = 'success';
    progress.message = 'Pipeline completado correctamente.';
    progress.finishedAt = Date.now();
    progress.updatedAt = Date.now();

    return {
      stdout:
        '\n--- CVLAC ---\n' + (cvlacResult.stdout || '') +
        '\n--- GroupLab ---\n' + (groupLabResult.stdout || '') +
        pipelineStdout,
      stderr:
        (cvlacResult.stderr || '') +
        (groupLabResult.stderr || '') +
        pipelineStderr,
    };
  } catch (error) {
    if (progress.steps.cvlac === 'in_progress') {
      markProgressError(progress, error, 'cvlac');
    } else if (progress.steps.grouplab === 'in_progress') {
      markProgressError(progress, error, 'grouplab');
    } else {
      markProgressError(progress, error);
    }
    throw error;
  }
};

// run python scraping logic for GroupLab. the processing lives in scraping_grupoinves.py
exports.executeScrapingGroupLab = async () => {
  return new Promise((resolve, reject) => {
    // execute the GroupLab scraping script which handles fetching group data
    // the scraping scripts live at workspace root in the `Scraping` folder
    const scriptPath = path.resolve(__dirname, '..', '..', 'Scraping', 'scraping_grupoinves.py');
    // set environment variables so Python uses UTF-8 for I/O (prevents
    // UnicodeEncodeError when printing emojis on Windows)
    const env = getPythonEnv();
    exec(`python "${scriptPath}"`, { env, maxBuffer: 1024 * 500 }, async (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }

      try {
        const { pipelineStdout, pipelineStderr } = await runNormalizationPipeline(env);
        resolve({ stdout: (stdout || '') + pipelineStdout, stderr: (stderr || '') + pipelineStderr });
      } catch (pipelineError) {
        reject(pipelineError);
      }
    });
  });
};

// run complete flow in one endpoint: CVLAC + GroupLab + normalization pipeline (single pass)
exports.executeScrapingComplete = async () => {

  const env = getPythonEnv();
  const base = path.resolve(__dirname, '..', '..', 'Scraping');
  const cvlacScript = path.resolve(base, 'scraping_cvlac_completo.py');
  const groupLabScript = path.resolve(base, 'scraping_grupoinves.py');

  const cvlacResult = await runPythonScript(cvlacScript, env);
  const groupLabResult = await runPythonScript(groupLabScript, env);
  const { pipelineStdout, pipelineStderr } = await runNormalizationPipeline(env);

  // Paso extra: poblar la tabla de relaciones investigador_titulo

  return {
    stdout:
      '\n--- CVLAC ---\n' + (cvlacResult.stdout || '') +
      '\n--- GroupLab ---\n' + (groupLabResult.stdout || '') +
      pipelineStdout +
      '\n--- Relaciones investigador_titulo actualizadas ---\n',
    stderr:
      (cvlacResult.stderr || '') +
      (groupLabResult.stderr || '') +
      pipelineStderr,
  };
};

exports.getScrapingProgress = ({ actor } = {}) => {
  const progress = getOrCreateProgress(actor);
  return cloneProgress(progress);
};
