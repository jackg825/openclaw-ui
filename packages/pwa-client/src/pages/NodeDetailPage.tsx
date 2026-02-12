import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useClusterStore } from '@/stores/cluster';
import { cn } from '@/lib/utils';

export function NodeDetailPage() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const nodes = useClusterStore((s) => s.nodes);
  const node = nodes.find((n) => n.id === nodeId);

  if (!node) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Node not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/cluster" aria-label="Back to cluster">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{node.name}</h1>
          <p className="text-muted-foreground">{node.host}</p>
        </div>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Remove
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ResourceBar label="CPU" value={node.resources.cpuPercent} />
            <ResourceBar label="Memory" value={node.resources.memoryPercent} />
            <ResourceBar label="Disk" value={node.resources.diskPercent} />
            <Separator />
            <div className="text-sm text-muted-foreground">
              Active Runs: {node.resources.activeRuns} / {node.resources.maxRuns}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agents</CardTitle>
          </CardHeader>
          <CardContent>
            {node.agents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agents</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {node.agents.map((agent) => (
                  <Badge key={agent} variant="secondary">
                    {agent}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skills</CardTitle>
          </CardHeader>
          <CardContent>
            {node.skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No skills</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {node.skills.map((skill) => (
                  <Badge key={skill} variant="outline">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ResourceBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            value > 80
              ? 'bg-red-500'
              : value > 60
                ? 'bg-yellow-500'
                : 'bg-green-500',
          )}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}
