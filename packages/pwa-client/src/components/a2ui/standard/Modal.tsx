import { resolveBindings } from '@/lib/a2ui/adapter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDataModelStore } from '@/stores/datamodel';
import type { WidgetProps } from '../registry';

export function A2UIModal({ component, surface, dataModel, children }: WidgetProps) {
  const props = resolveBindings(component, dataModel);
  const title = props.title as string | undefined;
  const open = (props.open as boolean) ?? false;

  const updateDataModel = useDataModelStore((s) => s.updateDataModel);
  const bindingPath = component.bindings?.open;

  const handleOpenChange = (value: boolean) => {
    if (bindingPath) {
      updateDataModel(surface.id, bindingPath, value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}
