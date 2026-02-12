import { Link } from 'react-router-dom';
import { Plus, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCluster } from '@/hooks/useCluster';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  online: 'bg-green-500 ring-2 ring-green-500/20',
  degraded: 'bg-yellow-500',
  offline: 'bg-red-500',
  connecting: 'bg-blue-500 animate-pulse',
};

export function ClusterPage() {
  const { nodes } = useCluster();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cluster</h1>
          <p className="text-muted-foreground">
            Manage your OpenClaw gateway nodes
          </p>
        </div>
        <Button variant="outline" className="border-dashed">
          <Plus className="mr-2 h-4 w-4" />
          Add Node
        </Button>
      </div>

      {nodes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Server className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No nodes configured. Add your first OpenClaw gateway node to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {nodes.map((node) => (
            <Link key={node.id} to={`/cluster/${node.id}`}>
              <Card className="cursor-pointer card-interactive">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{node.name}</CardTitle>
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        STATUS_COLORS[node.status] ?? 'bg-gray-500',
                      )}
                    />
                  </div>
                  <CardDescription>{node.host}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>CPU</span>
                      <span>{node.resources.cpuPercent}%</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Memory</span>
                      <span>{node.resources.memoryPercent}%</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {node.capabilities.slice(0, 3).map((cap) => (
                        <Badge key={cap} variant="outline" className="text-xs">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
