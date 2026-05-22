// Public Frontend/src/services/hotspotsService.js
//

import api from './api';

export const hotspotsService = {
  /**
   * Lista hotspots.
   * @param {object} params - Filtros opcionales, p.ej. { building_id: 3, floor: 1 }
   * @returns {Promise<Array>}
   */
  getAll: (params = {}) =>
    api.get('/hotspots', { params }).then(r =>
      Array.isArray(r.data) ? r.data : (r.data?.data ?? [])
    ),

  /**
   * Obtiene un hotspot por su ID.
   * @param {number|string} id
   * @returns {Promise<object>}
   */
  getById: (id) =>
    api.get(`/hotspots/${id}`).then(r =>
      r.data?.data ?? r.data
    ),

  /**
   * Crea un nuevo hotspot (requiere JWT de admin).
   */
  create: (data) =>
    api.post('/hotspots', data).then(r => r.data?.data ?? r.data),

  /**
   * Actualiza un hotspot existente (requiere JWT de admin).
   */
  update: (id, data) =>
    api.put(`/hotspots/${id}`, data).then(r => r.data?.data ?? r.data),

  /**
   * Elimina un hotspot (requiere JWT de admin).
   */
  remove: (id) =>
    api.delete(`/hotspots/${id}`).then(r => r.data),
};