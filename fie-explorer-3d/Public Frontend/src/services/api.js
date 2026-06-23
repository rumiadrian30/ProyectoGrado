import axios from 'axios';

const API_ROOT =
  import.meta.env.VITE_API_URL || 'http://localhost:3001';

const API_BASE_URL = `${API_ROOT.replace(/\/$/, '')}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-App': 'public',
  },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('[API ERROR]', {
      baseURL: API_BASE_URL,
      url: err?.config?.url,
      fullURL: `${API_BASE_URL}${err?.config?.url || ''}`,
      method: err?.config?.method,
      status: err?.response?.status,
      message: err?.message,
    });

    return Promise.reject(err);
  }
);

export default api;