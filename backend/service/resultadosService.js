// backend/service/resultadosService.js
const resultadosRepository = require('../repository/resultadosRepository');

exports.getResultados = async (filters) => {
  return await resultadosRepository.getResultados(filters);
};
