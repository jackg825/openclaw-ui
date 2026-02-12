import { resolveBindings } from '@/lib/a2ui/adapter';
import type { WidgetProps } from '../registry';

export function ProgressBar({ component, dataModel }: WidgetProps) {
  const props = resolveBindings(component, dataModel);
  const value = Math.min(100, Math.max(0, (props.value as number) ?? 0));
  const label = props.label as string | undefined;

  return (
    <div className="w-full space-y-1">
      {label && (
        <div className="flex justify-between text-sm">
          <span>{label}</span>
          <span className="text-muted-foreground">{Math.round(value)}%</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-in-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
