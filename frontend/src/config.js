// central configuration for the client-side application
// export base URLs for the backend; the API endpoints live under /api,
// while auth/login happens at the server root. Environment variables
// allow changing both bases in production (VITE_SERVER_BASE overrides).

const IS_DEV = import.meta.env.DEV;
const DEFAULT_SERVER_BASE = IS_DEV ? 'http://localhost:4000' : '';
const configuredServerBase = import.meta.env.VITE_SERVER_BASE || DEFAULT_SERVER_BASE;

export const SERVER_BASE = configuredServerBase.replace(/\/$/, '');
export const API_BASE = import.meta.env.VITE_API_BASE || (SERVER_BASE ? `${SERVER_BASE}/api` : '/api');
export const LOGIN_URL = import.meta.env.VITE_LOGIN_URL || `${API_BASE}/login`;
