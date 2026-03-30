// backend/service/tipologiaCantidadesService.js
const tipologiaCantidadesRepository = require('../repository/tipologiaCantidadesRepository');

exports.getTipologiaCantidades = async (filters) => {
  return await tipologiaCantidadesRepository.getTipologiaCantidades(filters);
};
