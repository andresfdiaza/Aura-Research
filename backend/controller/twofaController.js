const { activate2FA } = require('../service/twofaDbService');

// POST /api/2fa/activate { email }
async function activate2FAController(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'email required' });
  try {
    const { qr } = await activate2FA(email);
    res.json({ qr });
  } catch (err) {
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
}

module.exports = { activate2FAController };