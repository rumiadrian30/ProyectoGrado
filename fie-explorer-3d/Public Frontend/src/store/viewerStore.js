import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const LS_KEY = 'fie-viewer-building';

export const useViewerStore = create(
  persist(
    (set) => ({
      selectedBuilding: null,
      setSelectedBuilding: (b) => set({ selectedBuilding: b }),

      activeHotspot: null,
      setActiveHotspot: (h) => set({ activeHotspot: h }),

      viewMode: 'exterior',
      setViewMode: (m) => set({ viewMode: m }),

      currentFloor: 1,
      setCurrentFloor: (f) => set({ currentFloor: f }),

      hotspots: [],
      setHotspots: (hs) => set({ hotspots: hs }),

      modelLoading: false,
      setModelLoading: (v) => set({ modelLoading: v }),

      modelProgress: 0,
      setModelProgress: (p) => set({ modelProgress: p }),

      activeLOD: 0,
      setActiveLOD: (l) => set({ activeLOD: l }),
    }),
    {
      name: LS_KEY,
      partialize: (state) => ({ selectedBuilding: state.selectedBuilding }),
    }
  )
);