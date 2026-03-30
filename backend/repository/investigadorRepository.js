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

module.exports.updateInvestigador = updateInvestigador;
module.exports.deleteInvestigadorProgramaFacultad = deleteInvestigadorProgramaFacultad;
module.exports.deleteInvestigadorGrupo = deleteInvestigadorGrupo;
const pool = require('../db');

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

module.exports = {
  createInvestigador,
  insertFacultadIfNotExists,
  getProgramaId,
  insertInvestigadorProgramaFacultad,
  insertInvestigadorGrupo,
};
