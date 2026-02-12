import { resolveBindings } from '@/lib/a2ui/adapter';
import { cn } from '@/lib/utils';
import type { WidgetProps } from '../registry';

export function A2UIRow({ component, dataModel, children }: WidgetProps) {
  const props = resolveBindings(component, dataModel);
  const className = props.className as string | undefined;

  return (
    <div className={cn('flex flex-row gap-2', className)}>{children}</div>
  );
}
