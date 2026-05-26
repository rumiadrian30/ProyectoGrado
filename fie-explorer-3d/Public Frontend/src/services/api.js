import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json', 'X-Client-App': 'public',},
});

// Response interceptor → log de errores
api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

export default api;
