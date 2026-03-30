const grupoService = require('../service/grupoService');

async function listarGrupos(_req, res) {
  try {
    const grupos = await grupoService.listarGrupos();
    res.json(grupos);
  } catch (err) {
    console.error('Error fetching grupos:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
}
const { addGrupo } = require('../service/grupoService');

async function crearGrupo(req, res) {
  const { nombre_grupo, sigla_grupo, url, id_facultad } = req.body;
  try {
    const grupo = await addGrupo(nombre_grupo, sigla_grupo, url, id_facultad);
    res.status(201).json(grupo);
  } catch (err) {
    const status = err.status || 500;
    const message = err.status === 400 ? err.message : 'internal server error';
    if (status === 500) {
      console.error('Error creando grupo:', err.message, err.stack);
    }
    res.status(status).json({ message });
  }
}

module.exports = { listarGrupos, crearGrupo };