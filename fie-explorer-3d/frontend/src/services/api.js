import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor → agrega token JWT si existe
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('fie-admin-store');
  if (raw) {
    try {
      const state = JSON.parse(raw);
      const token = state?.state?.token;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (_) { /* ignore */ }
  }
  return config;
});

// Response interceptor → maneja 401 global
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fie-admin-store');
      if (window.location.pathname.startsWith('/admin') &&
          !window.location.pathname.includes('login')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
