// Public Frontend/src/services/hotspotsService.js
//
// CORRECCIÓN HU-04 (Bug Frontend):
//   El backend devuelve `res.json(rows)` → el array llega en `r.data` (axios).
//   El servicio usaba `r.data.data` que siempre era undefined, dejando el
//   store vacío y el panel sin datos.
//
//   Se unifica el accessor a `r.data` con fallback defensivo para arrays
//   (mismo patrón robusto de buildingsService.js).

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