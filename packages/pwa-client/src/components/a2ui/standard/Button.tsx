import { resolveBindings } from '@/lib/a2ui/adapter';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../registry';

export function A2UIButton({ component, dataModel }: WidgetProps) {
  const props = resolveBindings(component, dataModel);
  const label = props.label as string | undefined;
  const variant = props.variant as 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | undefined;
  const disabled = props.disabled as boolean | undefined;
  const action = props.action as string | undefined;

  const handleClick = () => {
    if (action) {
      window.dispatchEvent(
        new CustomEvent('a2ui:action', {
          detail: { componentId: component.id, action },
        }),
      );
    }
  };

  return (
    <Button variant={variant} disabled={disabled} onClick={handleClick}>
      {label}
    </Button>
  );
}
