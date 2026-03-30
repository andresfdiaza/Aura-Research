const { createFacultad } = require('../repository/facultadRepository');

async function addFacultad(nombre_facultad) {
  if (!nombre_facultad) {
    const error = new Error('nombre_facultad es requerido');
    error.status = 400;
    throw error;
  }
  try {
    return await createFacultad(nombre_facultad);
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