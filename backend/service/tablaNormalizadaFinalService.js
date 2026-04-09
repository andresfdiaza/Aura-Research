// backend/service/tablaNormalizadaFinalService.js
const tablaNormalizadaFinalRepository = require('../repository/tablaNormalizadaFinalRepository');

exports.getTablaNormalizadaFinal = async (filters) => {
  return await tablaNormalizadaFinalRepository.getTablaNormalizadaFinal(filters);
};

exports.getTablaNormalizadaFinalByScope = async (filters, dataScope) => {
  return await tablaNormalizadaFinalRepository.getTablaNormalizadaFinal(filters, dataScope);
};
