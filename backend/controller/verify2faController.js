const { verify2FA } = require('../service/twofaDbService');

// POST /api/2fa/verify { email, token }
async function verify2FAController(req, res) {
  const { email, token } = req.body;
  if (!email || !token) return res.status(400).json({ message: 'email and token required' });
  try {
    const valid = await verify2FA(email, token);
    if (!valid) return res.status(401).json({ message: 'Código 2FA inválido' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
}

module.exports = { verify2FAController };