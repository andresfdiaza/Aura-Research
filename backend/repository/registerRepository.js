const pool = require('../db');


async function createUser(email, hashedPassword, role = 'user', scope = {}) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      [email, hashedPassword, role]
    );

    const userId = result.insertId;
    const scopeRows = [];
    const universidadIds = Array.isArray(scope.universidadIds) ? scope.universidadIds : [];
    const facultadIds = Array.isArray(scope.facultadIds) ? scope.facultadIds : [];
    const grupoIds = Array.isArray(scope.grupoIds) ? scope.grupoIds : [];
    const investigadorIds = Array.isArray(scope.investigadorIds) ? scope.investigadorIds : [];

    universidadIds.forEach((id) => scopeRows.push([userId, 'universidad', Number(id)]));
    facultadIds.forEach((id) => scopeRows.push([userId, 'facultad', Number(id)]));
    grupoIds.forEach((id) => scopeRows.push([userId, 'grupo', Number(id)]));
    investigadorIds.forEach((id) => scopeRows.push([userId, 'investigador', Number(id)]));

    if (scopeRows.length > 0) {
      await conn.query(
        'INSERT INTO user_scope (user_id, scope_type, scope_id) VALUES ?',
        [scopeRows]
      );
    }

    await conn.commit();
    return { id: userId, email, role, scope };
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_rollbackErr) {
      // Ignore rollback errors and rethrow original error.
    }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { createUser };