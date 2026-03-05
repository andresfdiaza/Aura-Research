// central configuration for the client-side application
// export base URLs for the backend; the API endpoints live under /api,
// while auth/login happens at the server root. Environment variables
// allow changing both bases in production (VITE_SERVER_BASE overrides).

const DEFAULT_SERVER_BASE = import.meta.env.DEV
  ? 'http://localhost:4000'
  : window.location.origin;

export const SERVER_BASE = import.meta.env.VITE_SERVER_BASE || DEFAULT_SERVER_BASE;
export const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? `${SERVER_BASE}/api` : `/auraresearch/api`);
export const LOGIN_URL = import.meta.env.VITE_LOGIN_URL || (import.meta.env.DEV ? `${SERVER_BASE}/login` : `/auraresearch/login`);
