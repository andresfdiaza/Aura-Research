const pool = require('../db');

async function createPrograma(nombre_programa, id_facultad) {
  try {
    const [result] = await pool.query(
      'INSERT INTO programa (nombre_programa, id_facultad) VALUES (?, ?)',
      [nombre_programa.trim(), id_facultad]
    );
    return { id_programa: result.insertId, nombre_programa: nombre_programa.trim(), id_facultad };
  } catch (err) {
    throw err;
  }
}

module.exports = { createPrograma };