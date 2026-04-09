// Modularized: listar todos los investigadores
async function listarInvestigadores(dataScope = {}) {
  const pool = require('../db');
  const conditions = [];
  const params = [];

  if (Array.isArray(dataScope.id_facultades) && dataScope.id_facultades.length > 0) {
    conditions.push(`ipf.id_facultad IN (${dataScope.id_facultades.map(() => '?').join(',')})`);
    params.push(...dataScope.id_facultades);
  }
  if (Array.isArray(dataScope.id_grupos) && dataScope.id_grupos.length > 0) {
    conditions.push(`ig.id_grupo IN (${dataScope.id_grupos.map(() => '?').join(',')})`);
    params.push(...dataScope.id_grupos);
  }
  if (Array.isArray(dataScope.id_investigadores) && dataScope.id_investigadores.length > 0) {
    conditions.push(`i.id_investigador IN (${dataScope.id_investigadores.map(() => '?').join(',')})`);
    params.push(...dataScope.id_investigadores);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT
      i.id_investigador,
      i.nombre_completo,
      i.cedula,
      i.link_cvlac,
      i.correo,
      i.google_scholar,
      i.orcid,
      GROUP_CONCAT(DISTINCT p.nombre_programa ORDER BY p.nombre_programa SEPARATOR ', ') AS programa_academico,
      GROUP_CONCAT(DISTINCT f.nombre_facultad ORDER BY f.nombre_facultad SEPARATOR ', ') AS facultad,
      GROUP_CONCAT(DISTINCT ig.id_grupo) AS grupos_ids
    FROM investigadores i
    LEFT JOIN investigador_programa_facultad ipf ON ipf.id_investigador = i.id_investigador
    LEFT JOIN programa p ON p.id_programa = ipf.id_programa
    LEFT JOIN facultad f ON f.id_facultad = ipf.id_facultad
    LEFT JOIN investigador_grupo ig ON ig.id_investigador = i.id_investigador
    ${whereClause}
    GROUP BY i.id_investigador, i.nombre_completo, i.cedula, i.link_cvlac, i.correo, i.google_scholar, i.orcid
    ORDER BY i.nombre_completo`,
    params
  );
  return rows.map(row => ({
    ...row,
    grupos_ids: row.grupos_ids ? row.grupos_ids.split(',').map(id => parseInt(id, 10)) : []
  }));
}

// Modularized: obtener investigador por id
async function obtenerInvestigadorPorId(id) {
  const pool = require('../db');
  const [rows] = await pool.query(
    `SELECT
      i.id_investigador,
      i.nombre_completo AS investigador,
      p.nombre_programa AS programa,
      f.nombre_facultad AS facultad,
      i.cedula,
      i.link_cvlac,
      i.correo,
      i.google_scholar,
      i.orcid
    FROM investigadores i
    LEFT JOIN investigador_programa_facultad ipf ON ipf.id_investigador = i.id_investigador
    LEFT JOIN programa p ON p.id_programa = ipf.id_programa
    LEFT JOIN facultad f ON f.id_facultad = ipf.id_facultad
    WHERE i.id_investigador = ?
    ORDER BY p.nombre_programa`,
    [id]
  );
  return rows.length === 0 ? null : rows;
}

const pool = require('../db');

async function updateInvestigador(id, fields) {
  // fields: { nombre_completo, cedula, link_cvlac, correo, google_scholar, orcid }
  const setFields = [];
  const values = [];
  for (const [key, value] of Object.entries(fields)) {
    setFields.push(`${key} = ?`);
    values.push(value);
  }
  if (setFields.length === 0) return 0;
  values.push(id);
  const sql = `UPDATE investigadores SET ${setFields.join(', ')} WHERE id_investigador = ?`;
  const [result] = await pool.query(sql, values);
  return result.affectedRows;
}

async function deleteInvestigadorProgramaFacultad(id_investigador) {
  await pool.query('DELETE FROM investigador_programa_facultad WHERE id_investigador = ?', [id_investigador]);
}

async function deleteInvestigadorGrupo(id_investigador) {
  await pool.query('DELETE FROM investigador_grupo WHERE id_investigador = ?', [id_investigador]);
}


// Mock para compatibilidad con scrapingService.js
async function markAllPending() {
  // No-op: la lógica real está en los scripts Python
  return;
}

async function poblarInvestigadorTitulo() {
  // No-op: la lógica real está en los scripts Python
  return;
}

module.exports = {
  updateInvestigador,
  deleteInvestigadorProgramaFacultad,
  deleteInvestigadorGrupo,
  createInvestigador,
  insertFacultadIfNotExists,
  getProgramaId,
  insertInvestigadorProgramaFacultad,
  insertInvestigadorGrupo,
  listarInvestigadores,
  obtenerInvestigadorPorId,
  markAllPending,
  poblarInvestigadorTitulo
};

async function createInvestigador({ nombre_completo, cedula, link_cvlac, correo, google_scholar, orcid }) {
  const [result] = await pool.query(
    'INSERT INTO investigadores (nombre_completo, cedula, link_cvlac, correo, google_scholar, orcid) VALUES (?, ?, ?, ?, ?, ?)',
    [nombre_completo, cedula || null, link_cvlac || null, correo || null, google_scholar || null, orcid || null]
  );
  return result.insertId;
}

async function insertFacultadIfNotExists(nombre_facultad) {
  await pool.query('INSERT IGNORE INTO facultad (nombre_facultad) VALUES (?)', [nombre_facultad]);
  const [facRows] = await pool.query('SELECT id_facultad FROM facultad WHERE nombre_facultad = ?', [nombre_facultad]);
  return facRows[0]?.id_facultad;
}

async function getProgramaId(nombre_programa, id_facultad) {
  const [progRows] = await pool.query(
    'SELECT id_programa FROM programa WHERE nombre_programa = ? AND id_facultad = ?',
    [nombre_programa, id_facultad]
  );
  return progRows[0]?.id_programa;
}

async function insertInvestigadorProgramaFacultad(id_investigador, id_programa, id_facultad) {
  await pool.query(
    'INSERT IGNORE INTO investigador_programa_facultad (id_investigador, id_programa, id_facultad) VALUES (?, ?, ?)',
    [id_investigador, id_programa, id_facultad]
  );
}

async function insertInvestigadorGrupo(id_investigador, id_grupo) {
  await pool.query(
    'INSERT INTO investigador_grupo (id_investigador, id_grupo) VALUES (?, ?)',
    [id_investigador, id_grupo]
  );
}


