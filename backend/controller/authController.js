

const { validateUser } = require('../service/authService');
const { verify2FA } = require('../service/twofaDbService');


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
    // Si el usuario tiene 2FA activado, pedir token
    if (user.twofa_secret) {
      if (!token) {
        return res.json({ require2FA: true });
      }
      const valid = await verify2FA(email, token);
      if (!valid) {
        return res.status(401).json({ message: 'Invalid 2FA token' });
      }
      return res.json({ ...user, twoFactor: true });
    }
    // Si no tiene 2FA, login normal
    res.json(user);
  } catch (err) {
    console.error('Login error:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
}

module.exports = { login };
