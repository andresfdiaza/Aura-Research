const pool = require('../db');

async function createGrupo(nombre_grupo, sigla_grupo, url, id_facultad) {
  try {
    const [result] = await pool.query(
      'INSERT INTO link_grouplab (nombre_grupo, sigla_grupo, url, id_facultad) VALUES (?, ?, ?, ?)',
      [nombre_grupo, sigla_grupo || null, url, id_facultad]
    );
    return { id: result.insertId, nombre_grupo, sigla_grupo, url, id_facultad };
  } catch (err) {
    throw err;
  }
}

module.exports = { createGrupo };