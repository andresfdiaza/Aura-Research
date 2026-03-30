const { addFacultad } = require('../service/facultadService');

async function crearFacultad(req, res) {
  const { nombre_facultad } = req.body;
  try {
    const facultad = await addFacultad(nombre_facultad);
    res.status(201).json(facultad);
  } catch (err) {
    const status = err.status || 500;
    const message = err.status === 400 || err.status === 409 ? err.message : 'internal server error';
    if (status === 500) {
      console.error('Error creando facultad:', err.message, err.stack);
    }
    res.status(status).json({ message });
  }
}

module.exports = { crearFacultad };