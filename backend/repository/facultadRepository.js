const pool = require('../db');

async function createFacultad(nombre_facultad) {
  try {
    const [result] = await pool.query(
      'INSERT INTO facultad (nombre_facultad) VALUES (?)',
      [nombre_facultad.trim()]
    );
    return { id_facultad: result.insertId, nombre_facultad: nombre_facultad.trim() };
  } catch (err) {
    throw err;
  }
}

module.exports = { createFacultad };