const { createPrograma } = require('../repository/programaRepository');

async function addPrograma(nombre_programa, id_facultad) {
  if (!nombre_programa || !id_facultad) {
    const error = new Error('nombre_programa e id_facultad son requeridos');
    error.status = 400;
    throw error;
  }
  try {
    return await createPrograma(nombre_programa, id_facultad);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const error = new Error('El programa ya existe');
      error.status = 409;
      throw error;
    }
    throw err;
  }
}

module.exports = { addPrograma };