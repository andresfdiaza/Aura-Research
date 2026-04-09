
const { listUsersByActor, canDirectorManageTargetUser, updateUser, deleteUser } = require('../repository/userRepository');
const { getActorFromHeaders } = require('../service/accessScopeService');
// DELETE /api/users/:id
async function deleteUserController(req, res) {
  const { id } = req.params;
  try {
    const actor = await getActorFromHeaders(req.headers);
    const actorRole = String(actor?.role || '').toLowerCase();
    if (actorRole === 'director') {
      const targetId = Number(id);
      if (!Number.isInteger(targetId)) {
        return res.status(400).json({ message: 'ID de usuario invalido' });
      }
      if (targetId === Number(actor?.id)) {
        return res.status(403).json({ message: 'No puedes eliminar tu propio usuario' });
      }
      const canManage = await canDirectorManageTargetUser(actor, targetId);
      if (!canManage) {
        return res.status(403).json({ message: 'Solo puedes eliminar usuarios de tu universidad' });
      }
    }

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
    const actor = await getActorFromHeaders(req.headers);
    const users = await listUsersByActor(actor);
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
    const actor = await getActorFromHeaders(req.headers);
    const actorRole = String(actor?.role || '').toLowerCase();
    if (actorRole === 'director') {
      const targetId = Number(id);
      if (!Number.isInteger(targetId)) {
        return res.status(400).json({ message: 'ID de usuario invalido' });
      }
      const canManage = await canDirectorManageTargetUser(actor, targetId);
      if (!canManage) {
        return res.status(403).json({ message: 'Solo puedes editar usuarios de tu universidad' });
      }
      if (role === 'admin') {
        return res.status(403).json({ message: 'No puedes asignar rol admin' });
      }
    }

    const ok = await updateUser(id, email, role);
    if (!ok) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ message: 'Usuario actualizado' });
  } catch (err) {
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
}

module.exports = { listUsersController, updateUserController, deleteUserController };
