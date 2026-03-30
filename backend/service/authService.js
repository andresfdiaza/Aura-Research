const bcrypt = require('bcryptjs');
const { findUserByEmail } = require('../repository/userRepository');

async function validateUser(email, password) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;
  return { id: user.id, email: user.email, role: user.role || 'user' };
}

module.exports = { validateUser };
