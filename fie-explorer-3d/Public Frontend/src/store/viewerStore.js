import { create } from 'zustand';

export const useViewerStore = create((set) => ({
  // Edificio seleccionado
  selectedBuilding: null,
  setSelectedBuilding: (b) => set({ selectedBuilding: b }),

  // Hotspot activo (panel lateral)
  activeHotspot: null,
  setActiveHotspot: (h) => set({ activeHotspot: h }),

  // Vista actual: 'exterior' | 'interior'
  viewMode: 'exterior',
  setViewMode: (m) => set({ viewMode: m }),

  // Planta actual para interior
  currentFloor: 1,
  setCurrentFloor: (f) => set({ currentFloor: f }),

  // Hotspots cargados
  hotspots: [],
  setHotspots: (hs) => set({ hotspots: hs }),

  // Estado de carga del modelo 3D
  modelLoading: false,
  setModelLoading: (v) => set({ modelLoading: v }),

  modelProgress: 0,
  setModelProgress: (p) => set({ modelProgress: p }),

  // LOD activo: 0 | 1 | 2
  activeLOD: 0,
  setActiveLOD: (l) => set({ activeLOD: l }),
}));
