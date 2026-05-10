// Public Frontend/src/services/modelsService.js
import api from './api';

export const modelsService = {
  /** Todos los modelos registrados en la BD */
  getAll: () => api.get('/models').then(r => r.data),

  /** Modelos activos de un edificio, opcionalmente filtrados por tipo */
  getByBuilding: (buildingId, modelType = null) => {
    return api.get('/models').then(r => {
      const all = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      return all.filter(m =>
        String(m.building_id) === String(buildingId) &&
        m.is_active &&
        (modelType ? m.model_type === modelType : true)
      );
    });
  },

  /**
   * Primer modelo activo de un edificio para un tipo y LOD dados.
   *
   * IMPORTANTE: devuelve file_path como URL RELATIVA (ej: /models/fie.glb)
   * para que el proxy de Vite la enrute sin problemas de CORS.
   * No añadir prefijo http://localhost:3001 aquí.
   */
  getActive: (buildingId, modelType = 'exterior', lodLevel = 0) => {
    return api.get('/models').then(r => {
      const all = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);

      // Log de diagnóstico (quitar cuando funcione)
      console.log('[modelsService] Total modelos en BD:', all.length);
      console.log('[modelsService] Buscando buildingId:', String(buildingId), '| tipo:', modelType);
      all.forEach(m => console.log(
        `  modelo id=${m.id} building_id=${m.building_id} type=${m.model_type}`,
        `lod=${m.lod_level} active=${m.is_active} path=${m.file_path}`
      ));

      const bid = String(buildingId);
      const candidates = all.filter(m =>
        String(m.building_id) === bid &&
        m.model_type  === modelType &&
        m.is_active
      );

      console.log('[modelsService] Candidatos encontrados:', candidates.length);
      if (!candidates.length) return null;

      const exact  = candidates.find(m => m.lod_level === lodLevel);
      const chosen = exact ?? candidates.sort((a, b) => a.lod_level - b.lod_level)[0];

      // ← file_path queda como ruta relativa: /models/archivo.glb
      // El proxy de Vite la redirige a http://localhost:3001/models/archivo.glb
      console.log('[modelsService] Modelo elegido:', chosen.file_path, 'LOD', chosen.lod_level);
      return chosen;
    });
  },
};