// backend/service/nodoHijoCantidadesService.js
const nodoHijoCantidadesRepository = require('../repository/nodoHijoCantidadesRepository');

exports.getNodoHijoCantidades = async (filters) => {
  return await nodoHijoCantidadesRepository.getNodoHijoCantidades(filters);
};
