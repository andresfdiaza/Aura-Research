const pool = require('../db');

async function listarGrupos(dataScope = {}) {
  const conditions = [];
  const params = [];

  if (Array.isArray(dataScope.id_facultades) && dataScope.id_facultades.length > 0) {
    conditions.push(`id_facultad IN (${dataScope.id_facultades.map(() => '?').join(',')})`);
    params.push(...dataScope.id_facultades);
  }
  if (Array.isArray(dataScope.id_grupos) && dataScope.id_grupos.length > 0) {
    conditions.push(`id IN (${dataScope.id_grupos.map(() => '?').join(',')})`);
    params.push(...dataScope.id_grupos);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT id, nombre_grupo, sigla_grupo, url, id_facultad FROM link_grouplab ${whereClause} ORDER BY sigla_grupo`,
    params
  );
  return rows;
}

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

module.exports = { listarGrupos, createGrupo };