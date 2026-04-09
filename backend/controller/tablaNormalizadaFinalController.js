// backend/controller/tablaNormalizadaFinalController.js
const tablaNormalizadaFinalService = require('../service/tablaNormalizadaFinalService');
const { buildDataScope, getActorFromHeaders } = require('../service/accessScopeService');

exports.getTablaNormalizadaFinal = async (req, res) => {
  try {
    const actor = await getActorFromHeaders(req.headers);
    const dataScope = buildDataScope(actor);
    const data = await tablaNormalizadaFinalService.getTablaNormalizadaFinalByScope(req.query, dataScope);
    res.json(data);
  } catch (err) {
    console.error('[Controller] /api/tabla-normalizada-final error', err);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
};
