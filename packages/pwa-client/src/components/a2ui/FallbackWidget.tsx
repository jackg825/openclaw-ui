import type { WidgetProps } from './registry';

export function FallbackWidget({ component, children }: WidgetProps) {
  return (
    <div className="rounded-md border border-dashed border-muted-foreground/25 bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
      <span>Unknown component: {component.type}</span>
      {children}
    </div>
  );
}
