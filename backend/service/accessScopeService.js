const pool = require('../db');

function normalizeRole(role) {
  const raw = String(role || '').trim().toLowerCase();
  if (raw === 'user') return 'investigador';
  return raw;
}

function uniqueNumeric(values = []) {
  return [...new Set(values.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0))];
}

async function getActorFromHeaders(headers = {}) {
  const rawId = headers['x-user-id'];
  const rawEmail = headers['x-user-email'];
  const id = rawId ? Number(rawId) : null;
  const email = rawEmail ? String(rawEmail).trim() : null;

  if (!id && !email) return null;

  const where = [];
  const params = [];

  if (Number.isInteger(id) && id > 0) {
    where.push('u.id = ?');
    params.push(id);
  }
  if (email) {
    where.push('u.email = ?');
    params.push(email);
  }

  if (where.length === 0) return null;

  const sql = `
    SELECT
      u.id,
      u.email,
      LOWER(TRIM(u.role)) AS role,
      u.id_facultad,
      u.id_grupo,
      f.nombre_facultad,
      g.sigla_grupo,
      g.nombre_grupo
    FROM users u
    LEFT JOIN facultad f ON f.id_facultad = u.id_facultad
    LEFT JOIN link_grouplab g ON g.id = u.id_grupo
    WHERE ${where.join(' OR ')}
    ORDER BY u.id ASC
    LIMIT 1
  `;

  const [rows] = await pool.query(sql, params);
  if (!rows.length) return null;

  const row = rows[0];
  const [scopeRows] = await pool.query(
    `SELECT
      us.scope_type,
      us.scope_id,
      u.nombre_universidad,
      f.nombre_facultad,
      g.sigla_grupo,
      g.nombre_grupo
     FROM user_scope us
     LEFT JOIN universidad u ON u.id_universidad = us.scope_id AND us.scope_type = 'universidad'
     LEFT JOIN facultad f ON f.id_facultad = us.scope_id AND us.scope_type = 'facultad'
     LEFT JOIN link_grouplab g ON g.id = us.scope_id AND us.scope_type = 'grupo'
     WHERE us.user_id = ?`,
    [row.id]
  );

  const universidadIds = uniqueNumeric(scopeRows.filter((s) => s.scope_type === 'universidad').map((s) => s.scope_id));
  const universidadNombres = [...new Set(scopeRows.filter((s) => s.scope_type === 'universidad').map((s) => s.nombre_universidad).filter(Boolean))];
  const facultadIds = uniqueNumeric(scopeRows.filter((s) => s.scope_type === 'facultad').map((s) => s.scope_id));
  const facultadNombres = [...new Set(scopeRows.filter((s) => s.scope_type === 'facultad').map((s) => s.nombre_facultad).filter(Boolean))];
  const grupoIds = uniqueNumeric(scopeRows.filter((s) => s.scope_type === 'grupo').map((s) => s.scope_id));
  const grupoSiglas = [...new Set(scopeRows.filter((s) => s.scope_type === 'grupo').map((s) => s.sigla_grupo).filter(Boolean))];
  const investigadorIds = uniqueNumeric(scopeRows.filter((s) => s.scope_type === 'investigador').map((s) => s.scope_id));

  const actor = {
    id: row.id,
    email: row.email,
    role: normalizeRole(row.role),
    id_facultad: row.id_facultad || null,
    id_grupo: row.id_grupo || null,
    nombre_facultad: row.nombre_facultad || null,
    sigla_grupo: row.sigla_grupo || null,
    nombre_grupo: row.nombre_grupo || null,
    universidadIds,
    universidadNombres,
    facultadIds,
    facultadNombres,
    grupoIds,
    grupoSiglas,
    investigadorIds,
  };

  // Legacy fallback while old columns still exist in existing installations.
  if (actor.facultadIds.length === 0 && actor.id_facultad) {
    actor.facultadIds = [Number(actor.id_facultad)];
    if (actor.nombre_facultad) actor.facultadNombres = [actor.nombre_facultad];
  }
  if (actor.grupoIds.length === 0 && actor.id_grupo) {
    actor.grupoIds = [Number(actor.id_grupo)];
    if (actor.sigla_grupo) actor.grupoSiglas = [actor.sigla_grupo];
  }

  // Director scoped to universidad can see all facultades under those universidades.
  if (actor.role === 'director' && actor.universidadIds.length > 0 && actor.facultadIds.length === 0) {
    const [facRows] = await pool.query(
      `SELECT id_facultad, nombre_facultad
       FROM facultad
       WHERE id_universidad IN (${actor.universidadIds.map(() => '?').join(',')})`,
      actor.universidadIds
    );
    actor.facultadIds = uniqueNumeric(facRows.map((f) => f.id_facultad));
    actor.facultadNombres = [...new Set(facRows.map((f) => f.nombre_facultad).filter(Boolean))];
  }

  return actor;
}

function buildDataScope(actor) {
  if (!actor || !actor.role) return {};

  if (actor.role === 'director') {
    const facultadIds = Array.isArray(actor.facultadIds) ? actor.facultadIds : [];
    const facultadNombres = Array.isArray(actor.facultadNombres) ? actor.facultadNombres : [];
    const hasUniversityScope = Array.isArray(actor.universidadIds) && actor.universidadIds.length > 0;

    if (hasUniversityScope && facultadIds.length === 0) {
      return {
        id_facultades: [-1],
        facultades: ['__NO_ACCESS__'],
      };
    }

    return {
      id_facultades: facultadIds,
      facultades: facultadNombres,
    };
  }

  if (actor.role === 'coordinador') {
    const grupoIds = Array.isArray(actor.grupoIds) ? actor.grupoIds : [];
    const grupoSiglas = Array.isArray(actor.grupoSiglas) ? actor.grupoSiglas : [];
    if (grupoIds.length === 0) {
      return {
        id_grupos: [-1],
        siglas_grupo: ['__NO_ACCESS__'],
      };
    }

    return {
      id_grupos: grupoIds,
      siglas_grupo: grupoSiglas,
    };
  }

  if (actor.role === 'investigador') {
    const investigadorIds = Array.isArray(actor.investigadorIds) ? actor.investigadorIds : [];
    if (investigadorIds.length === 0) {
      return {
        id_investigadores: [-1],
      };
    }

    return {
      id_investigadores: investigadorIds,
    };
  }

  return {};
}

module.exports = {
  getActorFromHeaders,
  buildDataScope,
};
