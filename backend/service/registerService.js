const bcrypt = require('bcryptjs');
const { createUser } = require('../repository/registerRepository');
const pool = require('../db');

function uniqueNumericIds(list = []) {
  return [...new Set((Array.isArray(list) ? list : []).map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0))];
}

async function getDirectorAllowedFacultadIds(actorId) {
  if (!actorId) return [];
  const [universityScopeRows] = await pool.query(
    `SELECT scope_id
     FROM user_scope
     WHERE user_id = ? AND scope_type = 'universidad'`,
    [actorId]
  );
  const universityIds = universityScopeRows.map((r) => Number(r.scope_id)).filter(Number.isInteger);
  if (universityIds.length > 0) {
    const [facRows] = await pool.query(
      `SELECT id_facultad
       FROM facultad
       WHERE id_universidad IN (${universityIds.map(() => '?').join(',')})`,
      universityIds
    );
    const universidadFacultadIds = facRows.map((r) => Number(r.id_facultad)).filter(Number.isInteger);
    if (universidadFacultadIds.length > 0) return universidadFacultadIds;
  }

  const [scopeRows] = await pool.query(
    `SELECT scope_id
     FROM user_scope
     WHERE user_id = ? AND scope_type = 'facultad'`,
    [actorId]
  );
  const scopedIds = scopeRows.map((r) => Number(r.scope_id)).filter(Number.isInteger);
  if (scopedIds.length > 0) return scopedIds;

  const [legacyRows] = await pool.query('SELECT id_facultad FROM users WHERE id = ? LIMIT 1', [actorId]);
  const legacyId = Number(legacyRows?.[0]?.id_facultad);
  return Number.isInteger(legacyId) && legacyId > 0 ? [legacyId] : [];
}

async function validateScope(role, scope, actor = null) {
  const normalizedRole = String(role || '').trim().toLowerCase();
  const resultScope = {
    universidadIds: [],
    facultadIds: [],
    grupoIds: [],
    investigadorIds: [],
  };

  const requestedUniversidadIds = uniqueNumericIds(scope?.universidadIds);
  const requestedFacultadIds = uniqueNumericIds(scope?.facultadIds);
  const requestedGrupoIds = uniqueNumericIds(scope?.grupoIds);
  const requestedInvestigadorIds = uniqueNumericIds(scope?.investigadorIds || (scope?.investigadorId ? [scope.investigadorId] : []));

  if (normalizedRole === 'director') {
    if (requestedUniversidadIds.length !== 1) {
      const error = new Error('director requiere exactamente una universidad asignada');
      error.status = 400;
      throw error;
    }

    const [universidades] = await pool.query(
      `SELECT id_universidad
       FROM universidad
       WHERE id_universidad IN (${requestedUniversidadIds.map(() => '?').join(',')})`,
      requestedUniversidadIds
    );
    if (universidades.length !== requestedUniversidadIds.length) {
      const error = new Error('la universidad asignada no existe');
      error.status = 400;
      throw error;
    }

    resultScope.universidadIds = requestedUniversidadIds;

    const [facRows] = await pool.query(
      `SELECT id_facultad
       FROM facultad
       WHERE id_universidad = ?`,
      [requestedUniversidadIds[0]]
    );
    resultScope.facultadIds = uniqueNumericIds(facRows.map((r) => r.id_facultad));
  }

  if (normalizedRole === 'coordinador') {
    if (requestedGrupoIds.length === 0) {
      const error = new Error('coordinador requiere al menos un grupo asignado');
      error.status = 400;
      throw error;
    }
    resultScope.grupoIds = requestedGrupoIds;

    const [grupos] = await pool.query(
      `SELECT id, id_facultad
       FROM link_grouplab
       WHERE id IN (${requestedGrupoIds.map(() => '?').join(',')})`,
      requestedGrupoIds
    );
    if (grupos.length !== requestedGrupoIds.length) {
      const error = new Error('uno o mas grupos no existen');
      error.status = 400;
      throw error;
    }
    resultScope.facultadIds = uniqueNumericIds(grupos.map((g) => g.id_facultad));
  }

  if (normalizedRole === 'investigador') {
    if (requestedInvestigadorIds.length !== 1) {
      const error = new Error('investigador requiere exactamente un perfil de investigador asignado');
      error.status = 400;
      throw error;
    }
    resultScope.investigadorIds = requestedInvestigadorIds;

    const [invFacRows] = await pool.query(
      `SELECT DISTINCT id_facultad
       FROM investigador_programa_facultad
       WHERE id_investigador = ?`,
      [requestedInvestigadorIds[0]]
    );
    resultScope.facultadIds = uniqueNumericIds(invFacRows.map((r) => r.id_facultad));
  }

  if (actor?.role === 'director') {
    const allowedFacultadIds = await getDirectorAllowedFacultadIds(actor.id);
    if (allowedFacultadIds.length === 0) {
      const error = new Error('el director no tiene facultades asignadas para delegar');
      error.status = 403;
      throw error;
    }
    const outsideScope = resultScope.facultadIds.some((id) => !allowedFacultadIds.includes(id));
    if (outsideScope) {
      const error = new Error('solo puedes asignar usuarios dentro de tus facultades');
      error.status = 403;
      throw error;
    }
  }

  return resultScope;
}

async function registerUser(email, password, role = 'user', scope = {}, actor = null) {
  if (!email || !password) {
    const error = new Error('email and password required');
    error.status = 400;
    throw error;
  }
  // Solo permitir roles válidos
  const validRoles = ['admin', 'director', 'coordinador', 'investigador', 'user'];
  let safeRole = validRoles.includes(role) ? role : 'investigador';

  if (actor?.role === 'director') {
    if (!['coordinador', 'investigador'].includes(safeRole)) {
      const error = new Error('director solo puede crear coordinadores e investigadores');
      error.status = 403;
      throw error;
    }
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const safeScope = await validateScope(safeRole, scope, actor);
    const user = await createUser(email, hashed, safeRole, safeScope);
    return user;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const error = new Error('Email already exists');
      error.status = 409;
      throw error;
    }
    throw err;
  }
}

module.exports = { registerUser };