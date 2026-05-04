import api from './api';

export const buildingsService = {
  getAll: () => api.get('/buildings').then(r => {return r.data?.data ?? r.data ?? [];}),
  getById: (id) => api.get(`/buildings/${id}`).then(r => r.data.data),
  create: (data) => api.post('/buildings', data).then(r => r.data.data),
  update: (id, data) => api.put(`/buildings/${id}`, data).then(r => r.data.data),
};
