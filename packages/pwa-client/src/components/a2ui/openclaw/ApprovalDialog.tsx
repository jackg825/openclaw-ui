import { resolveBindings } from '@/lib/a2ui/adapter';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import type { WidgetProps } from '../registry';

export function ApprovalDialog({ component, dataModel }: WidgetProps) {
  const props = resolveBindings(component, dataModel);
  const tool = props.tool as string | undefined;
  const description = props.description as string | undefined;
  const args = props.args as Record<string, unknown> | undefined;
  const runId = props.runId as string | undefined;

  const handleApprove = () => {
    window.dispatchEvent(
      new CustomEvent('a2ui:approval', {
        detail: { runId, decision: 'approve' },
      }),
    );
  };

  const handleDeny = () => {
    window.dispatchEvent(
      new CustomEvent('a2ui:approval', {
        detail: { runId, decision: 'deny' },
      }),
    );
  };

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <StatusBadge status="pending" />
          <span className="font-semibold">Approval Required: {tool}</span>
        </div>
      </CardHeader>
      <CardContent className="text-sm">{description}</CardContent>
      {args && (
        <CardContent className="pt-0">
          <pre className="text-xs bg-muted p-2 rounded overflow-auto">
            {JSON.stringify(args, null, 2)}
          </pre>
        </CardContent>
      )}
      <CardFooter className="gap-2">
        <Button variant="default" onClick={handleApprove}>
          Approve
        </Button>
        <Button variant="outline" onClick={handleDeny}>
          Deny
        </Button>
      </CardFooter>
    </Card>
  );
}
