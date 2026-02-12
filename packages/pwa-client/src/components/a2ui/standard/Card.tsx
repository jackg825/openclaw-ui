import { resolveBindings } from '@/lib/a2ui/adapter';
import { cn } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import type { WidgetProps } from '../registry';

export function A2UICard({ component, dataModel, children }: WidgetProps) {
  const props = resolveBindings(component, dataModel);
  const title = props.title as string | undefined;
  const footer = props.footer as string | undefined;
  const className = props.className as string | undefined;

  return (
    <Card className={cn(className)}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
