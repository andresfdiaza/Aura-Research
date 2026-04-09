const { registerUser } = require('../service/registerService');
const { getActorFromHeaders } = require('../service/accessScopeService');

async function register(req, res) {
  console.log('--- [REGISTER] HEADERS:', req.headers);
  console.log('--- [REGISTER] BODY:', req.body);
  const { email, password, role, scope } = req.body;
  try {
    const actor = await getActorFromHeaders(req.headers);
    const user = await registerUser(email, password, role, scope, actor);
    res.status(201).json(user);
  } catch (err) {
    const status = err.status || 500;
    const message = err.status === 400 || err.status === 409 ? err.message : 'internal server error';
    if (status === 500) {
      // log full details to help debugging
      console.error('Registration error:', err.message, err.stack);
    }
    res.status(status).json({ message, error: err.message });
  }
}

module.exports = { register };