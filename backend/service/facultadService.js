const { createFacultad } = require('../repository/facultadRepository');
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

async function resolveUniversidadForCreate(requestedIdUniversidad, actor) {
  const role = String(actor?.role || '').toLowerCase();
  const requestedId = Number(requestedIdUniversidad);
  if (role === 'admin') {
    if (Number.isInteger(requestedId) && requestedId > 0) return requestedId;

    const [rows] = await pool.query(
      `SELECT id_universidad
       FROM universidad
       WHERE codigo = 'UNAC' OR nombre_universidad = 'Universidad Adventista de Colombia'
       ORDER BY id_universidad
       LIMIT 1`
    );
    return rows?.[0]?.id_universidad || null;
  }

  const allowedUniversidadIds = await resolveActorUniversidadIds(actor);
  if (allowedUniversidadIds.length === 0) {
    const error = new Error('No tienes una universidad asignada para crear facultades');
    error.status = 403;
    throw error;
  }

  if (Number.isInteger(requestedId) && requestedId > 0 && !allowedUniversidadIds.includes(requestedId)) {
    const error = new Error('No puedes crear facultades fuera de tu universidad');
    error.status = 403;
    throw error;
  }

  return Number.isInteger(requestedId) && requestedId > 0 ? requestedId : allowedUniversidadIds[0];
}

async function addFacultad(payload = {}, actor = null) {
  const nombre_facultad = payload?.nombre_facultad;
  if (!nombre_facultad) {
    const error = new Error('nombre_facultad es requerido');
    error.status = 400;
    throw error;
  }
  try {
    const id_universidad = await resolveUniversidadForCreate(payload?.id_universidad, actor);
    if (!id_universidad) {
      const error = new Error('No se pudo resolver la universidad para la facultad');
      error.status = 400;
      throw error;
    }
    return await createFacultad(nombre_facultad, id_universidad);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const error = new Error('La facultad ya existe');
      error.status = 409;
      throw error;
    }
    throw err;
  }
}

module.exports = { addFacultad };