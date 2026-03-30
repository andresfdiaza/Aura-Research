// backend/controller/nodoHijoCantidadesController.js
const nodoHijoCantidadesService = require('../service/nodoHijoCantidadesService');

exports.getNodoHijoCantidades = async (req, res) => {
  try {
    const data = await nodoHijoCantidadesService.getNodoHijoCantidades(req.query);
    res.json(data);
  } catch (err) {
    console.error('[Controller] /api/nodo-hijo-cantidades error', err);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
};
