import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { resolveBindings } from '@/lib/a2ui/adapter';
import type { WidgetProps } from '../registry';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/25',
  running: 'bg-blue-500/15 text-blue-700 border-blue-500/25',
  success: 'bg-green-500/15 text-green-700 border-green-500/25',
  error: 'bg-red-500/15 text-red-700 border-red-500/25',
};

interface StatusBadgeDirectProps {
  status: string;
}

// Support both direct usage (from ApprovalDialog) and as a widget
export function StatusBadge(props: WidgetProps | StatusBadgeDirectProps) {
  let status: string;

  if ('component' in props) {
    const resolved = resolveBindings(props.component, props.dataModel);
    status = (resolved.status as string) ?? 'pending';
  } else {
    status = props.status;
  }

  const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending;

  return (
    <Badge variant="outline" className={cn(style)}>
      {status}
    </Badge>
  );
}
