import { resolveBindings } from '@/lib/a2ui/adapter';
import { cn } from '@/lib/utils';
import type { WidgetProps } from '../registry';

export function A2UIText({ component, dataModel }: WidgetProps) {
  const props = resolveBindings(component, dataModel);
  const variant = props.variant as string | undefined;
  const className = props.className as string | undefined;
  const content = props.content as string | undefined;

  if (variant === 'span') {
    return <span className={cn(className)}>{content}</span>;
  }

  return <p className={cn(className)}>{content}</p>;
}
