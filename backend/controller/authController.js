
const { validateUser } = require('../service/authService');
const { generate2FASecret, getQRCodeDataURL, verify2FAToken } = require('../service/2faService');
// En producción, guarda el secreto en la base de datos. Aquí, solo demo en memoria.
const user2FASecrets = {};


async function login(req, res) {
  const { email, password, token } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password required' });
  }
  try {
    const user = await validateUser(email, password);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // Simula consulta a DB para saber si el usuario ya tiene 2FA
    let secret = user2FASecrets[email];
    if (!secret) {
      // Primer login: genera secreto y QR
      secret = generate2FASecret(email);
      user2FASecrets[email] = secret;
      const qr = await getQRCodeDataURL(secret);
      return res.json({ require2FA: true, qr });
    }
    // Si no se envió token, pide el código
    if (!token) {
      return res.json({ require2FA: true });
    }
    // Valida el token
    if (!verify2FAToken(secret, token)) {
      return res.status(401).json({ message: 'Invalid 2FA token' });
    }
    res.json({ ...user, twoFactor: true });
  } catch (err) {
    console.error('Login error:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
}

module.exports = { login };
