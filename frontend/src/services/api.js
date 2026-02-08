const API_HOST = import.meta.env.VITE_API_HOST || window.location.hostname || '127.0.0.1';
const API_PORT = import.meta.env.VITE_API_PORT || '8000';
const API_BASE =
  import.meta.env.VITE_API_BASE || `${window.location.protocol}//${API_HOST}:${API_PORT}`;
const WS_BASE =
  import.meta.env.VITE_WS_BASE ||
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${API_HOST}:${API_PORT}`;

export const apiUrl = (path = '') => `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
export const wsUrl = (path = '') => `${WS_BASE}${path.startsWith('/') ? path : `/${path}`}`;

export const API_BASE_URL = API_BASE;
export const WS_BASE_URL = WS_BASE;
