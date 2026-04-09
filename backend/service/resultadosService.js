// backend/service/resultadosService.js
const resultadosRepository = require('../repository/resultadosRepository');

exports.getResultados = async (filters) => {
  return await resultadosRepository.getResultados(filters);
};

exports.getResultadosByScope = async (filters, dataScope) => {
  return await resultadosRepository.getResultados(filters, dataScope);
};
