import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePlanStore } from '@/stores/plan';

export function PlanApproval() {
  const { pendingPlan, isExecuting, reset } = usePlanStore();

  if (!pendingPlan) return null;

  const handleApprove = () => {
    usePlanStore.getState().setExecuting(true);
  };

  const handleReject = () => {
    reset();
  };

  const previewSteps = pendingPlan.slice(0, 3);
  const remaining = pendingPlan.length - previewSteps.length;

  return (
    <Card className="w-full border-blue-500/30 bg-blue-500/5">
      <CardContent className="pt-4 pb-2">
        <p className="mb-2 text-sm font-medium">Plan ({pendingPlan.length} steps)</p>
        <ol className="space-y-1 text-sm text-muted-foreground">
          {previewSteps.map((step, i) => (
            <li key={step.id}>
              {i + 1}. {step.description}
            </li>
          ))}
        </ol>
        {remaining > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">+{remaining} more steps</p>
        )}
      </CardContent>
      <CardFooter className="gap-2 pt-0">
        <Button size="sm" onClick={handleApprove} disabled={isExecuting}>
          Approve
        </Button>
        <Button size="sm" variant="outline" onClick={handleReject} disabled={isExecuting}>
          Reject
        </Button>
      </CardFooter>
    </Card>
  );
}
