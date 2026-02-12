import { useMemo } from 'react';
import type { A2UIComponent } from '@shared/a2ui';

interface SurfaceData {
  components: A2UIComponent[];
  dataModel: Record<string, unknown>;
  isRendering: boolean;
}

export function useA2UISurface(surfaceId: string | null): SurfaceData {
  // This hook will subscribe to the surface store for a specific surface ID.
  // The surface store and A2UI pipeline are built by the a2ui-dev agent.
  // This provides the consumer interface.

  return useMemo(
    () => ({
      components: [],
      dataModel: {},
      isRendering: false,
    }),
    [],
  );
}
