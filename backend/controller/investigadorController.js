const { addInvestigador, updateInvestigadorService } = require('../service/investigadorService');
const investigadorService = require('../service/investigadorService');
const { buildDataScope, getActorFromHeaders } = require('../service/accessScopeService');

async function crearInvestigador(req, res) {
  try {
    const result = await addInvestigador(req.body);
    res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.status === 400 || err.status === 409 ? err.message : 'internal server error';
    if (status === 500) {
      console.error('Error inserting investigador:', err.message, err.stack);
    }
    res.status(status).json({ message });
  }
}

async function editarInvestigador(req, res) {
  const { id } = req.params;
  try {
    const result = await updateInvestigadorService(id, req.body);
    if (!result) return res.status(404).json({ message: 'Not found' });
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.status === 400 || err.status === 409 ? err.message : 'internal server error';
    if (status === 500) {
      console.error('Error updating investigador:', err.message, err.stack);
    }
    res.status(status).json({ message });
  }
}

// Modularized: listar todos los investigadores
async function listarInvestigadores(req, res) {
  try {
    const actor = await getActorFromHeaders(req.headers);
    const dataScope = buildDataScope(actor);
    const investigadores = await investigadorService.listarInvestigadores(dataScope);
    res.json(investigadores);
  } catch (err) {
    console.error('Error fetching investigadores:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
}

// Modularized: obtener investigador por id
async function obtenerInvestigadorPorId(req, res) {
  const { id } = req.params;
  try {
    const investigador = await investigadorService.obtenerInvestigadorPorId(id);
    if (!investigador) return res.status(404).json({ message: 'Not found' });
    res.json(investigador);
  } catch (err) {
    console.error('Error fetching investigador:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
}

module.exports = {
  crearInvestigador,
  editarInvestigador,
  listarInvestigadores,
  obtenerInvestigadorPorId
};