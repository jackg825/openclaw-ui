import { resolveBindings } from '@/lib/a2ui/adapter';
import { cn } from '@/lib/utils';
import type { WidgetProps } from '../registry';

export function A2UIList({ component, dataModel, children }: WidgetProps) {
  const props = resolveBindings(component, dataModel);
  const className = props.className as string | undefined;

  return <ul className={cn('list-disc pl-5 space-y-1', className)}>{children}</ul>;
}
