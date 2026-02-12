import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePlanStore, type PlanStep } from '@/stores/plan';

function StepStatusIcon({ status }: { status: PlanStep['status'] }) {
  switch (status) {
    case 'completed':
      return <span className="text-green-500">&#10003;</span>;
    case 'in_progress':
      return <span className="animate-spin text-blue-500">&#9696;</span>;
    case 'failed':
      return <span className="text-red-500">&#10007;</span>;
    default:
      return <span className="text-muted-foreground">&#9675;</span>;
  }
}

export function PlanPreview() {
  const { transcript, pendingPlan, isExecuting, setTranscript, setActive, reset } = usePlanStore();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(transcript);

  const handleApprove = () => {
    usePlanStore.getState().setExecuting(true);
  };

  const handleReject = () => {
    reset();
  };

  const handleEdit = () => {
    if (editing) {
      setTranscript(editValue);
      setEditing(false);
    } else {
      setEditValue(transcript);
      setEditing(true);
    }
  };

  const completedCount = pendingPlan?.filter((s) => s.status === 'completed').length ?? 0;
  const totalCount = pendingPlan?.length ?? 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Plan Mode</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setActive(false)}>
            <span className="sr-only">Close</span>
            &#10005;
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">Input</label>
          {editing ? (
            <textarea
              className="mt-1 w-full rounded-md border bg-background p-3 text-sm"
              rows={3}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
            />
          ) : (
            <p className="mt-1 rounded-md bg-muted p-3 text-sm">{transcript || 'No input yet'}</p>
          )}
        </div>

        {pendingPlan && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Plan ({completedCount}/{totalCount} steps)
            </label>
            <ol className="mt-1 space-y-1.5">
              {pendingPlan.map((step, i) => (
                <li key={step.id} className="flex items-start gap-2 text-sm">
                  <StepStatusIcon status={step.status} />
                  <span>
                    {i + 1}. {step.description}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        <Button onClick={handleApprove} disabled={!pendingPlan || isExecuting}>
          Approve
        </Button>
        <Button variant="outline" onClick={handleEdit}>
          {editing ? 'Save' : 'Edit'}
        </Button>
        <Button variant="destructive" onClick={handleReject} disabled={isExecuting}>
          Reject
        </Button>
      </CardFooter>
    </Card>
  );
}
