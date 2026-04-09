const ROLE_ALIASES = {
  user: 'investigador',
};

const ROLE_LABELS = {
  admin: 'Administrador',
  director: 'Director estrategico',
  coordinador: 'Coordinador',
  investigador: 'Investigador',
};

const ROLE_PERMISSIONS = {
  admin: {
    canAccessHomeAdmin: true,
    canViewUsers: true,
    canManageUsers: true,
    canCreateUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canResetUser2FA: true,
    canManageInvestigadores: true,
    canDeleteInvestigadores: true,
    canCreateCatalogs: true,
    canRunScraping: true,
  },
  director: {
    canAccessHomeAdmin: false,
    canViewUsers: true,
    canManageUsers: true,
    canCreateUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canResetUser2FA: false,
    canManageInvestigadores: false,
    canDeleteInvestigadores: false,
    canCreateCatalogs: true,
    canRunScraping: false,
  },
  coordinador: {
    canAccessHomeAdmin: false,
    canViewUsers: false,
    canManageUsers: false,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canResetUser2FA: false,
    canManageInvestigadores: true,
    canDeleteInvestigadores: false,
    canCreateCatalogs: false,
    canRunScraping: false,
  },
  investigador: {
    canAccessHomeAdmin: false,
    canViewUsers: false,
    canManageUsers: false,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canResetUser2FA: false,
    canManageInvestigadores: false,
    canDeleteInvestigadores: false,
    canCreateCatalogs: false,
    canRunScraping: false,
  },
};

export function normalizeRole(role) {
  const rawRole = String(role || '').trim().toLowerCase();
  const normalized = ROLE_ALIASES[rawRole] || rawRole;
  return ROLE_PERMISSIONS[normalized] ? normalized : 'investigador';
}

export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[normalizeRole(role)];
}

export function roleLabel(role) {
  const normalized = normalizeRole(role);
  return ROLE_LABELS[normalized] || normalized;
}

export function canAccessRoles(role, allowedRoles) {
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    return true;
  }
  const normalizedRole = normalizeRole(role);
  return allowedRoles.map(normalizeRole).includes(normalizedRole);
}

export function homePathForRole(role) {
  return normalizeRole(role) === 'admin' ? '/homeadmin' : '/home';
}

export function authHeaders(user, extraHeaders = {}) {
  return {
    ...extraHeaders,
    'x-user-role': normalizeRole(user?.role),
    'x-user-id': user?.id ? String(user.id) : '',
    'x-user-email': user?.email || '',
  };
}
