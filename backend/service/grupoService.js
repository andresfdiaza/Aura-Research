const grupoRepository = require('../repository/grupoRepository');

async function listarGrupos() {
  return await grupoRepository.listarGrupos();
}
const { createGrupo } = require('../repository/grupoRepository');

async function addGrupo(nombre_grupo, sigla_grupo, url, id_facultad) {
  if (!nombre_grupo || !url || !id_facultad) {
    const error = new Error('nombre_grupo, url e id_facultad requeridos');
    error.status = 400;
    throw error;
  }
  try {
    return await createGrupo(nombre_grupo, sigla_grupo, url, id_facultad);
  } catch (err) {
    throw err;
  }
}

module.exports = { addGrupo, listarGrupos };