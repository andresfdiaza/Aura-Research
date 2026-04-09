const grupoService = require('../service/grupoService');
const { buildDataScope, getActorFromHeaders } = require('../service/accessScopeService');

async function listarGrupos(req, res) {
  try {
    const actor = await getActorFromHeaders(req.headers);
    const dataScope = buildDataScope(actor);
    const grupos = await grupoService.listarGrupos(dataScope);
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
    const actor = await getActorFromHeaders(req.headers);
    const grupo = await addGrupo(nombre_grupo, sigla_grupo, url, id_facultad, actor);
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