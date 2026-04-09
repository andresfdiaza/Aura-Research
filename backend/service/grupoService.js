const grupoRepository = require('../repository/grupoRepository');
const pool = require('../db');

function uniqueNumeric(values = []) {
  return [...new Set(values.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0))];
}

async function resolveActorUniversidadIds(actor) {
  const directIds = uniqueNumeric(actor?.universidadIds || []);
  if (directIds.length > 0) return directIds;

  const facultadIds = uniqueNumeric(actor?.facultadIds || []);
  if (facultadIds.length === 0) return [];

  const [rows] = await pool.query(
    `SELECT DISTINCT id_universidad
     FROM facultad
     WHERE id_facultad IN (${facultadIds.map(() => '?').join(',')})
       AND id_universidad IS NOT NULL`,
    facultadIds
  );
  return uniqueNumeric(rows.map((r) => r.id_universidad));
}

async function listarGrupos(dataScope) {
  return await grupoRepository.listarGrupos(dataScope);
}
const { createGrupo } = require('../repository/grupoRepository');

async function addGrupo(nombre_grupo, sigla_grupo, url, id_facultad, actor = null) {
  if (!nombre_grupo || !url || !id_facultad) {
    const error = new Error('nombre_grupo, url e id_facultad requeridos');
    error.status = 400;
    throw error;
  }
  try {
    const [facRows] = await pool.query(
      'SELECT id_facultad, id_universidad FROM facultad WHERE id_facultad = ? LIMIT 1',
      [id_facultad]
    );
    if (facRows.length === 0) {
      const error = new Error('La facultad seleccionada no existe');
      error.status = 400;
      throw error;
    }

    const role = String(actor?.role || '').toLowerCase();
    if (role && role !== 'admin') {
      const allowedUniversidadIds = await resolveActorUniversidadIds(actor);
      const targetUniversidadId = Number(facRows[0].id_universidad);
      if (allowedUniversidadIds.length === 0 || !allowedUniversidadIds.includes(targetUniversidadId)) {
        const error = new Error('No puedes crear grupos fuera de tu universidad');
        error.status = 403;
        throw error;
      }
    }

    return await createGrupo(nombre_grupo, sigla_grupo, url, id_facultad);
  } catch (err) {
    throw err;
  }
}

module.exports = { addGrupo, listarGrupos };