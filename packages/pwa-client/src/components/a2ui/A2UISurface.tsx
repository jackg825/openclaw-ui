import { useSurfaceStore } from '@/stores/surface';
import { useDataModelStore } from '@/stores/datamodel';
import { resolveWidget } from './registry';
import { FallbackWidget } from './FallbackWidget';
import type { Surface } from './registry';

interface A2UISurfaceProps {
  surfaceId: string;
}

function RenderComponent({
  componentId,
  surface,
  dataModel,
}: {
  componentId: string;
  surface: Surface;
  dataModel: Record<string, unknown>;
}) {
  const component = surface.components.get(componentId);
  if (!component) return null;

  const Widget = resolveWidget(component.type) ?? FallbackWidget;

  const children = component.children?.map((childId) => (
    <RenderComponent
      key={childId}
      componentId={childId}
      surface={surface}
      dataModel={dataModel}
    />
  ));

  return (
    <Widget component={component} surface={surface} dataModel={dataModel}>
      {children}
    </Widget>
  );
}

const EMPTY_MODEL: Record<string, unknown> = {};

export function A2UISurface({ surfaceId }: A2UISurfaceProps) {
  const surface = useSurfaceStore((s) => s.surfaces.get(surfaceId));
  const dataModel = useDataModelStore(
    (s) => s.models.get(surfaceId) ?? EMPTY_MODEL,
  );

  if (!surface || !surface.rootId) return null;

  return (
    <div data-surface-id={surfaceId} className="my-2 rounded-lg border bg-card/50 p-3 shadow-sm">
      <RenderComponent
        componentId={surface.rootId}
        surface={surface}
        dataModel={dataModel}
      />
    </div>
  );
}
