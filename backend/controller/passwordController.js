const bcrypt = require('bcryptjs');
const pool = require('../db');
const { getActorFromHeaders } = require('../service/accessScopeService');

async function changeMyPasswordController(req, res) {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'currentPassword and newPassword required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 8 caracteres' });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({ message: 'La nueva contraseña debe ser diferente a la actual' });
  }

  try {
    const actor = await getActorFromHeaders(req.headers);
    if (!actor?.id) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const [rows] = await pool.query(
      'SELECT id, password FROM users WHERE id = ? LIMIT 1',
      [actor.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = rows[0];
    const validCurrentPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validCurrentPassword) {
      return res.status(401).json({ message: 'La contraseña actual es incorrecta' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, actor.id]);

    return res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('Error changing password:', err.message, err.stack);
    return res.status(500).json({ message: 'internal server error', error: err.message });
  }
}

module.exports = { changeMyPasswordController };
