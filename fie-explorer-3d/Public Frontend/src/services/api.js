import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-App': 'public',
  },
});

// Response interceptor → log de errores
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('[API ERROR]', {
      baseURL: API_BASE_URL,
      url: err?.config?.url,
      method: err?.config?.method,
      status: err?.response?.status,
      message: err?.message,
    });

    return Promise.reject(err);
  }
);

export default api;