const { addPrograma } = require('../service/programaService');

async function crearPrograma(req, res) {
  const { nombre_programa, id_facultad } = req.body;
  try {
    const programa = await addPrograma(nombre_programa, id_facultad);
    res.status(201).json(programa);
  } catch (err) {
    const status = err.status || 500;
    const message = err.status === 400 || err.status === 409 ? err.message : 'internal server error';
    if (status === 500) {
      console.error('Error creando programa:', err.message, err.stack);
    }
    res.status(status).json({ message });
  }
}

module.exports = { crearPrograma };