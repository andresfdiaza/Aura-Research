// backend/controller/tablaNormalizadaFinalController.js
const tablaNormalizadaFinalService = require('../service/tablaNormalizadaFinalService');

exports.getTablaNormalizadaFinal = async (req, res) => {
  try {
    const data = await tablaNormalizadaFinalService.getTablaNormalizadaFinal(req.query);
    res.json(data);
  } catch (err) {
    console.error('[Controller] /api/tabla-normalizada-final error', err);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
};
