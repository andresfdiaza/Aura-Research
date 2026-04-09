// backend/controller/resultadosController.js
const resultadosService = require('../service/resultadosService');
const { buildDataScope, getActorFromHeaders } = require('../service/accessScopeService');

exports.getResultados = async (req, res) => {
  try {
    const actor = await getActorFromHeaders(req.headers);
    const dataScope = buildDataScope(actor);
    const resultados = await resultadosService.getResultadosByScope(req.query, dataScope);
    res.json(resultados);
  } catch (err) {
    console.error('[Controller] /api/resultados error', err);
    res.status(500).json({ error: err.message });
  }
};
