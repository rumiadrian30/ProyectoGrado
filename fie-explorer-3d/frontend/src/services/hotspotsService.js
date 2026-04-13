import api from './api';

export const hotspotsService = {
  getAll: (params = {}) => api.get('/hotspots', { params }).then(r => r.data.data),
  getById: (id) => api.get(`/hotspots/${id}`).then(r => r.data.data),
  create: (data) => api.post('/hotspots', data).then(r => r.data.data),
  update: (id, data) => api.put(`/hotspots/${id}`, data).then(r => r.data.data),
  remove: (id) => api.delete(`/hotspots/${id}`).then(r => r.data),
};
