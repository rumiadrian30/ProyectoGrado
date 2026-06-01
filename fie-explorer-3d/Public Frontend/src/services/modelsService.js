// Public Frontend/src/services/modelsService.js

import api from './api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const modelsService = {
  /** Todos los modelos (con building_name y building_code) */
  getAll: () => api.get('/models').then(r => r.data),

  /** Modelos activos de un edificio concreto */
  getByBuilding: (buildingId) => {
    return api.get('/models').then(r => {
      const all = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      return all.filter(m => m.building_id === buildingId && m.is_active);
    });
  },

  /** Modelo activo de un edificio para un LOD dado (sin model_type) */
  getActive: (buildingId, lodLevel = 0) => {
    return api.get('/models').then(r => {
      const all = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      const candidates = all.filter(m =>
        m.building_id === buildingId &&
        m.is_active
      );
      if (!candidates.length) return null;
      const exact = candidates.find(m => m.lod_level === lodLevel);
      const model = exact ?? candidates.sort((a, b) => a.lod_level - b.lod_level)[0];

      if (model?.file_path) {
        model.file_path = `${API_BASE}${model.file_path}`;
      }
      return model;
    });
  },

  /** Mejor modelo activo por edificio (LOD más bajo = mayor calidad) */
  getAllActive: () => {
    return api.get('/models').then(r => {
      const all = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);

      const byBuilding = {};
      all
        .filter(m => m.is_active)
        .forEach(m => {
          const prev = byBuilding[m.building_id];
          if (!prev || m.lod_level < prev.lod_level) byBuilding[m.building_id] = m;
        });

      return Object.values(byBuilding).map(m => ({
        ...m,
        file_path: `${API_BASE}${m.file_path}`,
      }));
    });
  },
};