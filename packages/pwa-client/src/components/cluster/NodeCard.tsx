import { Card, CardContent } from '@/components/ui/card';
import type { ClusterNode } from '@shared/cluster';

const STATUS_COLORS: Record<string, string> = {
  online: 'bg-green-500',
  degraded: 'bg-yellow-500',
  offline: 'bg-red-500',
  connecting: 'bg-blue-500 animate-pulse',
};

function ResourceBar({ label, percent }: { label: string; percent: number }) {
  const color = percent > 80 ? 'bg-red-500' : percent > 60 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div className="mt-0.5 h-1.5 w-full rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

interface NodeCardProps {
  node: ClusterNode;
  onClick: (nodeId: string) => void;
}

export function NodeCard({ node, onClick }: NodeCardProps) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onClick(node.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[node.status] ?? 'bg-gray-500'}`} />
          <h3 className="text-sm font-medium">{node.name}</h3>
          <span className="ml-auto text-xs capitalize text-muted-foreground">{node.status}</span>
        </div>

        <div className="mt-3 space-y-2">
          <ResourceBar label="CPU" percent={node.resources.cpuPercent} />
          <ResourceBar label="RAM" percent={node.resources.memoryPercent} />
          <ResourceBar label="Disk" percent={node.resources.diskPercent} />
        </div>

        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{node.resources.activeRuns}/{node.resources.maxRuns} runs</span>
          <span>{node.agents.length} agents</span>
          <span>{node.skills.length} skills</span>
        </div>
      </CardContent>
    </Card>
  );
}
