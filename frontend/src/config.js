// central configuration for the client-side application
// export base URLs for the backend; the API endpoints live under /api,
// while auth/login happens at the server root. Environment variables
// allow changing both bases in production (VITE_SERVER_BASE overrides).

export const SERVER_BASE = import.meta.env.VITE_SERVER_BASE || 'http://localhost:4000';
export const API_BASE = import.meta.env.VITE_API_BASE || `${SERVER_BASE}/api`;
export const LOGIN_URL = import.meta.env.VITE_LOGIN_URL || `${SERVER_BASE}/login`;
