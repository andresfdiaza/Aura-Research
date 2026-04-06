
const { listUsers, updateUser, deleteUser } = require('../repository/userRepository');
// DELETE /api/users/:id
async function deleteUserController(req, res) {
  const { id } = req.params;
  try {
    const ok = await deleteUser(id);
    if (!ok) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
}

// GET /api/users
async function listUsersController(req, res) {
  try {
    const users = await listUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
}


// PUT /api/users/:id
async function updateUserController(req, res) {
  console.log('--- [UPDATE USER] params:', req.params);
  console.log('--- [UPDATE USER] body:', req.body);
  const { id } = req.params;
  const { email, role } = req.body;
  if (!email || !role) {
    return res.status(400).json({ message: 'email and role required' });
  }
  try {
    const ok = await updateUser(id, email, role);
    if (!ok) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ message: 'Usuario actualizado' });
  } catch (err) {
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
}

module.exports = { listUsersController, updateUserController, deleteUserController };
