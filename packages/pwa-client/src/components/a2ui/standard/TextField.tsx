import { resolveBindings } from '@/lib/a2ui/adapter';
import { Input } from '@/components/ui/input';
import { useDataModelStore } from '@/stores/datamodel';
import type { WidgetProps } from '../registry';

export function A2UITextField({ component, surface, dataModel }: WidgetProps) {
  const props = resolveBindings(component, dataModel);
  const label = props.label as string | undefined;
  const placeholder = props.placeholder as string | undefined;
  const value = (props.value as string) ?? '';
  const disabled = props.disabled as boolean | undefined;

  const updateDataModel = useDataModelStore((s) => s.updateDataModel);
  const bindingPath = component.bindings?.value;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (bindingPath) {
      updateDataModel(surface.id, bindingPath, e.target.value);
    }
  };

  return (
    <div className="grid w-full gap-1.5">
      {label && (
        <label className="text-sm font-medium leading-none">{label}</label>
      )}
      <Input
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleChange}
      />
    </div>
  );
}
