const pool = require('../db');

async function createFacultad(nombre_facultad, id_universidad) {
  try {
    const [result] = await pool.query(
      'INSERT INTO facultad (nombre_facultad, id_universidad) VALUES (?, ?)',
      [nombre_facultad.trim(), id_universidad]
    );
    return { id_facultad: result.insertId, nombre_facultad: nombre_facultad.trim(), id_universidad };
  } catch (err) {
    throw err;
  }
}

module.exports = { createFacultad };