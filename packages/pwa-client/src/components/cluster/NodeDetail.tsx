import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ClusterNode } from '@shared/cluster';

const STATUS_COLORS: Record<string, string> = {
  online: 'bg-green-500',
  degraded: 'bg-yellow-500',
  offline: 'bg-red-500',
  connecting: 'bg-blue-500 animate-pulse',
};

function ResourceChart({ label, percent }: { label: string; percent: number }) {
  const color = percent > 80 ? 'bg-red-500' : percent > 60 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex-1">
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{Math.round(percent)}%</span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

interface NodeDetailProps {
  node: ClusterNode;
  onBack: () => void;
  onRemove: (nodeId: string) => void;
}

export function NodeDetail({ node, onBack, onRemove }: NodeDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack}>
            &larr; Back
          </Button>
          <div className={`h-3 w-3 rounded-full ${STATUS_COLORS[node.status] ?? 'bg-gray-500'}`} />
          <h1 className="text-xl font-bold">{node.name}</h1>
          <span className="text-sm capitalize text-muted-foreground">{node.status}</span>
        </div>

        <Button variant="destructive" onClick={() => onRemove(node.id)}>
          Remove Node
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resources</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-6">
          <ResourceChart label="CPU" percent={node.resources.cpuPercent} />
          <ResourceChart label="Memory" percent={node.resources.memoryPercent} />
          <ResourceChart label="Disk" percent={node.resources.diskPercent} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Agents ({node.agents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {node.agents.length > 0 ? (
              <ul className="space-y-1">
                {node.agents.map((agent) => (
                  <li key={agent} className="text-sm">
                    {agent}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No agents registered</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Skills ({node.skills.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {node.skills.length > 0 ? (
              <ul className="space-y-1">
                {node.skills.map((skill) => (
                  <li key={skill} className="text-sm">
                    {skill}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No skills installed</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Connection Info</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <dl className="grid grid-cols-2 gap-2">
            <dt className="text-muted-foreground">Host</dt>
            <dd>{node.host}</dd>
            <dt className="text-muted-foreground">Active Runs</dt>
            <dd>
              {node.resources.activeRuns}/{node.resources.maxRuns}
            </dd>
            <dt className="text-muted-foreground">Last Heartbeat</dt>
            <dd>{new Date(node.lastHeartbeat).toLocaleString()}</dd>
            <dt className="text-muted-foreground">Added</dt>
            <dd>{new Date(node.addedAt).toLocaleString()}</dd>
            <dt className="text-muted-foreground">Capabilities</dt>
            <dd>{node.capabilities.join(', ') || 'None'}</dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
