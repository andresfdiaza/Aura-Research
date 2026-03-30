// backend/controller/resultadosController.js
const resultadosService = require('../service/resultadosService');

exports.getResultados = async (req, res) => {
  try {
    const resultados = await resultadosService.getResultados(req.query);
    res.json(resultados);
  } catch (err) {
    console.error('[Controller] /api/resultados error', err);
    res.status(500).json({ error: err.message });
  }
};
