// Public Frontend/src/services/modelsService.js
import api from './api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const modelsService = {
  /** Todos los modelos (con building_name y building_code) */
  getAll: () => api.get('/models').then(r => r.data),

  /** Modelos de un edificio concreto, opcionalmente filtrados por tipo */
  getByBuilding: (buildingId, modelType = null) => {
    return api.get('/models').then(r => {
      const all = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      return all.filter(m =>
        m.building_id === buildingId &&
        m.is_active &&
        (modelType ? m.model_type === modelType : true)
      );
    });
  },

  /** Primer modelo activo de un edificio para un tipo y LOD dados */
  getActive: (buildingId, modelType = 'exterior', lodLevel = 0) => {
    return api.get('/models').then(r => {
      const all = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      const candidates = all.filter(m =>
        m.building_id === buildingId &&
        m.model_type  === modelType  &&
        m.is_active
      );
      if (!candidates.length) return null;
      const exact = candidates.find(m => m.lod_level === lodLevel);
      const model = exact ?? candidates.sort((a, b) => a.lod_level - b.lod_level)[0];

      // ← Prefija la URL del backend para que GLTFLoader pueda descargarlo
      if (model?.file_path) {
        model.file_path = `${API_BASE}${model.file_path}`;
      }
      return model;
    });
  },
};