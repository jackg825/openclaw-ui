import { create } from 'zustand';
import type { A2UIComponent } from '@shared/a2ui';

export interface Surface {
  id: string;
  components: Map<string, A2UIComponent>;
  rootId: string | null;
  status: 'rendering' | 'complete';
}

interface SurfaceState {
  surfaces: Map<string, Surface>;
  createSurface: (surfaceId: string) => void;
  updateSurface: (surfaceId: string, components: A2UIComponent[]) => void;
  deleteSurface: (surfaceId: string) => void;
  getSurface: (surfaceId: string) => Surface | undefined;
  completeSurface: (surfaceId: string) => void;
}

export const useSurfaceStore = create<SurfaceState>((set, get) => ({
  surfaces: new Map(),

  createSurface: (surfaceId) =>
    set((state) => {
      const surfaces = new Map(state.surfaces);
      surfaces.set(surfaceId, {
        id: surfaceId,
        components: new Map(),
        rootId: null,
        status: 'rendering',
      });
      return { surfaces };
    }),

  updateSurface: (surfaceId, components) =>
    set((state) => {
      const surfaces = new Map(state.surfaces);
      const existing = surfaces.get(surfaceId);
      if (!existing) return state;

      const updated = {
        ...existing,
        components: new Map(existing.components),
      };
      for (const comp of components) {
        updated.components.set(comp.id, comp);
        if (!updated.rootId && !comp.parentId) {
          updated.rootId = comp.id;
        }
      }
      surfaces.set(surfaceId, updated);
      return { surfaces };
    }),

  deleteSurface: (surfaceId) =>
    set((state) => {
      const surfaces = new Map(state.surfaces);
      surfaces.delete(surfaceId);
      return { surfaces };
    }),

  getSurface: (surfaceId) => get().surfaces.get(surfaceId),

  completeSurface: (surfaceId) =>
    set((state) => {
      const surfaces = new Map(state.surfaces);
      const existing = surfaces.get(surfaceId);
      if (!existing) return state;
      surfaces.set(surfaceId, { ...existing, status: 'complete' });
      return { surfaces };
    }),
}));
