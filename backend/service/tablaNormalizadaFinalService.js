// backend/service/tablaNormalizadaFinalService.js
const tablaNormalizadaFinalRepository = require('../repository/tablaNormalizadaFinalRepository');

exports.getTablaNormalizadaFinal = async (filters) => {
  return await tablaNormalizadaFinalRepository.getTablaNormalizadaFinal(filters);
};
