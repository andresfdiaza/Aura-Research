// backend/controller/tipologiaCantidadesController.js
const tipologiaCantidadesService = require('../service/tipologiaCantidadesService');

exports.getTipologiaCantidades = async (req, res) => {
  try {
    const data = await tipologiaCantidadesService.getTipologiaCantidades(req.query);
    res.json(data);
  } catch (err) {
    console.error('[Controller] /api/tipologia-cantidades error', err);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
};
