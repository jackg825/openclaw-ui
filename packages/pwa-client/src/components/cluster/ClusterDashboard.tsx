import { Button } from '@/components/ui/button';
import { NodeCard } from './NodeCard';
import { useClusterStore } from '@/stores/cluster';
import type { RoutingStrategy } from '@shared/cluster';

const STRATEGIES: { value: RoutingStrategy; label: string }[] = [
  { value: 'affinity', label: 'Affinity' },
  { value: 'round-robin', label: 'Round Robin' },
  { value: 'least-loaded', label: 'Least Loaded' },
  { value: 'capability', label: 'Capability' },
  { value: 'manual', label: 'Manual' },
];

interface ClusterDashboardProps {
  onSelectNode: (nodeId: string) => void;
  onAddNode: () => void;
}

export function ClusterDashboard({ onSelectNode, onAddNode }: ClusterDashboardProps) {
  const { nodes, routingStrategy, setRoutingStrategy } = useClusterStore();

  const totalRuns = nodes.reduce((sum, n) => sum + n.resources.activeRuns, 0);
  const onlineCount = nodes.filter((n) => n.status === 'online').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Cluster</h1>
          <p className="text-sm text-muted-foreground">
            {onlineCount}/{nodes.length} nodes online &middot; {totalRuns} active runs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Routing:</label>
            <select
              className="rounded-md border bg-background px-2 py-1 text-sm"
              value={routingStrategy}
              onChange={(e) => setRoutingStrategy(e.target.value as RoutingStrategy)}
            >
              {STRATEGIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={onAddNode}>Add Node</Button>
        </div>
      </div>

      {nodes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No nodes configured. Add a node to get started.
          </p>
          <Button className="mt-4" onClick={onAddNode}>
            Add First Node
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {nodes.map((node) => (
            <NodeCard key={node.id} node={node} onClick={onSelectNode} />
          ))}
        </div>
      )}
    </div>
  );
}
