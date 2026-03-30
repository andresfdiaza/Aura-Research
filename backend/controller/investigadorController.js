const { addInvestigador } = require('../service/investigadorService');

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

module.exports = { crearInvestigador };