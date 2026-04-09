const pool = require('../db');

function uniqueNumeric(values = []) {
  return [...new Set(values.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0))];
}

async function resolveDirectorUniversityIds(actor = null) {
  const scopedUniIds = uniqueNumeric(actor?.universidadIds || []);
  if (scopedUniIds.length > 0) return scopedUniIds;

  const scopedFacultadIds = uniqueNumeric(actor?.facultadIds || []);
  if (scopedFacultadIds.length === 0) return [];

  const [rows] = await pool.query(
    `SELECT DISTINCT id_universidad
     FROM facultad
     WHERE id_facultad IN (${scopedFacultadIds.map(() => '?').join(',')})
       AND id_universidad IS NOT NULL`,
    scopedFacultadIds
  );
  return uniqueNumeric(rows.map((r) => r.id_universidad));
}

async function listUsersByActor(actor = null) {
  const role = String(actor?.role || '').toLowerCase();
  if (role !== 'director') {
    return await listUsers();
  }

  const directorUniversityIds = await resolveDirectorUniversityIds(actor);
  if (directorUniversityIds.length === 0) {
    const [selfRows] = await pool.query(
      'SELECT id, email, role, twofa_secret FROM users WHERE id = ? LIMIT 1',
      [actor?.id || -1]
    );
    return selfRows.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      twofa_enabled: !!user.twofa_secret,
    }));
  }

  const placeholders = directorUniversityIds.map(() => '?').join(',');
  const userScopeSql = `
    SELECT DISTINCT us.user_id
    FROM user_scope us
    LEFT JOIN facultad f ON us.scope_type = 'facultad' AND f.id_facultad = us.scope_id
    LEFT JOIN link_grouplab g ON us.scope_type = 'grupo' AND g.id = us.scope_id
    LEFT JOIN investigador_programa_facultad ipf ON us.scope_type = 'investigador' AND ipf.id_investigador = us.scope_id
    WHERE
      (us.scope_type = 'universidad' AND us.scope_id IN (${placeholders}))
      OR (us.scope_type = 'facultad' AND f.id_universidad IN (${placeholders}))
      OR (us.scope_type = 'grupo' AND g.id_facultad IN (
        SELECT id_facultad FROM facultad WHERE id_universidad IN (${placeholders})
      ))
      OR (us.scope_type = 'investigador' AND ipf.id_facultad IN (
        SELECT id_facultad FROM facultad WHERE id_universidad IN (${placeholders})
      ))
  `;

  const [scopedRows] = await pool.query(userScopeSql, [
    ...directorUniversityIds,
    ...directorUniversityIds,
    ...directorUniversityIds,
    ...directorUniversityIds,
  ]);

  const scopedUserIds = uniqueNumeric(scopedRows.map((r) => r.user_id));
  const visibleUserIds = uniqueNumeric([actor?.id, ...scopedUserIds]);
  if (visibleUserIds.length === 0) return [];

  const [rows] = await pool.query(
    `SELECT id, email, role, twofa_secret
     FROM users
     WHERE id IN (${visibleUserIds.map(() => '?').join(',')})
     ORDER BY id`,
    visibleUserIds
  );

  return rows.map((user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    twofa_enabled: !!user.twofa_secret,
  }));
}

async function canDirectorManageTargetUser(actor = null, targetUserId) {
  const users = await listUsersByActor(actor);
  const targetId = Number(targetUserId);
  return users.some((u) => Number(u.id) === targetId);
}

async function findUserByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}


async function listUsers() {
  const [rows] = await pool.query('SELECT id, email, role, twofa_secret FROM users ORDER BY id');
  // Agrega un campo 2fa_enabled: true/false
  return rows.map(user => ({
    id: user.id,
    email: user.email,
    role: user.role,
    twofa_enabled: !!user.twofa_secret
  }));
}

async function updateUser(id, email, role) {
  const [result] = await pool.query(
    'UPDATE users SET email = ?, role = ? WHERE id = ?',
    [email, role, id]
  );
  return result.affectedRows > 0;
}
async function deleteUser(id) {
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  findUserByEmail,
  listUsers,
  listUsersByActor,
  canDirectorManageTargetUser,
  updateUser,
  deleteUser,
};
