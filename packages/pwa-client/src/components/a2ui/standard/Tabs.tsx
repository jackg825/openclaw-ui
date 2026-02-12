import { resolveBindings } from '@/lib/a2ui/adapter';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import type { WidgetProps } from '../registry';

interface TabItem {
  label: string;
  value: string;
  content?: string;
}

export function A2UITabs({ component, dataModel, children }: WidgetProps) {
  const props = resolveBindings(component, dataModel);
  const items = (props.items as TabItem[]) ?? [];
  const defaultValue = (props.defaultValue as string) ?? items[0]?.value;

  return (
    <Tabs defaultValue={defaultValue}>
      <TabsList>
        {items.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((item) => (
        <TabsContent key={item.value} value={item.value}>
          {item.content ?? null}
        </TabsContent>
      ))}
      {children}
    </Tabs>
  );
}
