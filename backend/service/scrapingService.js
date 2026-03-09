const { exec } = require('child_process');
const path = require('path');
const repo = require('../repository/investigadorRepository');

const runPythonScript = (scriptPath, env) =>
  new Promise((resolve, reject) => {
    exec(`python "${scriptPath}"`, { env, maxBuffer: 1024 * 500 }, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      resolve({ stdout, stderr });
    });
  });

const runNormalizationPipeline = async (env) => {
  const base = path.resolve(__dirname, '..', '..', 'Scraping');
  const scripts = [
    'crear_titulo_grouplab_clean_v2.py',
    'crear_tabla_resultados_coincidentes.py',
    'crear_vista_normalizada_final.py',
    'crear_vistas_sin_coincidencias.py',
  ];

  let pipelineStdout = '\n--- Normalization pipeline ---\n';
  let pipelineStderr = '';

  for (const script of scripts) {
    const scriptPath = path.resolve(base, script);
    const result = await runPythonScript(scriptPath, env);
    pipelineStdout += `\n[${script}]\n${result.stdout || ''}`;
    if (result.stderr) {
      pipelineStderr += `\n[${script}]\n${result.stderr}`;
    }
  }

  return { pipelineStdout, pipelineStderr };
};

const getPythonEnv = () =>
  Object.assign({}, process.env, {
    PYTHONIOENCODING: 'utf-8',
    PYTHONUTF8: '1'
  });

// run python scraping logic. the real processing lives in scraping_cvlac_completo.py
exports.executeScraping = async () => {
  // ensure the scraping table exists and has necessary columns
  await repo.ensureScrapingTable();

  // mark all investigators with a link as pending so they will be processed
  await repo.markAllPending();

  return new Promise((resolve, reject) => {
    // execute the comprehensive script which already handles URL fetching,
    // table cleanup and database inserts. the previous `scraping.py` was just
    // a stub, so we call the file that contains the full scraping logic.
    // the scraping scripts live at workspace root in the `Scraping` folder, so
    // go up two levels from backend/service
    const scriptPath = path.resolve(__dirname, '..', '..', 'Scraping', 'scraping_cvlac_completo.py');
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
  await repo.ensureScrapingTable();
  await repo.markAllPending();

  const env = getPythonEnv();
  const base = path.resolve(__dirname, '..', '..', 'Scraping');
  const cvlacScript = path.resolve(base, 'scraping_cvlac_completo.py');
  const groupLabScript = path.resolve(base, 'scraping_grupoinves.py');

  const cvlacResult = await runPythonScript(cvlacScript, env);
  const groupLabResult = await runPythonScript(groupLabScript, env);
  const { pipelineStdout, pipelineStderr } = await runNormalizationPipeline(env);

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
};
