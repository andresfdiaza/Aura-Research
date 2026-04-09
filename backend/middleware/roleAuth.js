const VALID_ROLES = new Set(['admin', 'director', 'coordinador', 'investigador', 'user']);

function normalizeRole(role) {
  const normalized = String(role || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized === 'user') return 'investigador';
  return VALID_ROLES.has(normalized) ? normalized : '';
}

function getRequestRole(req) {
  return normalizeRole(req.headers['x-user-role']);
}

function requireRole(...roles) {
  const allowed = roles.map(normalizeRole).filter(Boolean);
  return (req, res, next) => {
    const role = getRequestRole(req);
    if (!role) {
      return res.status(401).json({ message: 'Rol no autenticado. Inicia sesion nuevamente.' });
    }
    if (allowed.length > 0 && !allowed.includes(role)) {
      return res.status(403).json({ message: 'No tienes permisos para esta accion.' });
    }
    next();
  };
}

module.exports = {
  requireRole,
  normalizeRole,
};
