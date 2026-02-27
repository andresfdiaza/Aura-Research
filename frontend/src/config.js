// central configuration for the client-side application
// export a base URL for API calls so that the rest of the code
// only references one constant. It can be overridden via VITE_API_BASE

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
