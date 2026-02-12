import type { ClusterNode, RouteRequest, RoutingStrategy } from '@shared/cluster';

export class SessionRouter {
  private strategy: RoutingStrategy = 'affinity';
  private sessionAffinity = new Map<string, string>();
  private roundRobinIndex = 0;

  route(request: RouteRequest, nodes: ClusterNode[]): string {
    const healthy = nodes.filter((n) => n.status === 'online');
    if (healthy.length === 0) throw new Error('No healthy nodes available');

    // Preferred node override
    if (request.preferredNodeId) {
      const preferred = healthy.find((n) => n.id === request.preferredNodeId);
      if (preferred) return preferred.id;
    }

    // Check affinity first
    const affinityNodeId = this.sessionAffinity.get(request.sessionKey);
    if (affinityNodeId) {
      const affinityNode = healthy.find((n) => n.id === affinityNodeId);
      if (affinityNode) return affinityNode.id;
    }

    let selectedId: string;
    switch (this.strategy) {
      case 'capability':
        selectedId = this.routeByCapability(request, healthy);
        break;
      case 'least-loaded':
        selectedId = this.routeByLoad(healthy);
        break;
      case 'round-robin':
        selectedId = this.routeRoundRobin(healthy);
        break;
      default:
        selectedId = healthy[0].id;
    }

    this.sessionAffinity.set(request.sessionKey, selectedId);
    return selectedId;
  }

  setStrategy(strategy: RoutingStrategy): void {
    this.strategy = strategy;
  }

  getStrategy(): RoutingStrategy {
    return this.strategy;
  }

  clearAffinity(sessionKey: string): void {
    this.sessionAffinity.delete(sessionKey);
  }

  private routeByCapability(request: RouteRequest, nodes: ClusterNode[]): string {
    if (!request.requiredCapabilities?.length) return nodes[0].id;

    const capable = nodes.filter((n) =>
      request.requiredCapabilities!.every((cap) => n.capabilities.includes(cap)),
    );
    if (capable.length === 0) {
      throw new Error(`No nodes with required capabilities: ${request.requiredCapabilities.join(', ')}`);
    }
    return this.routeByLoad(capable);
  }

  private routeByLoad(nodes: ClusterNode[]): string {
    let best = nodes[0];
    for (const node of nodes) {
      if (node.resources.activeRuns < best.resources.activeRuns) {
        best = node;
      }
    }
    return best.id;
  }

  private routeRoundRobin(nodes: ClusterNode[]): string {
    const index = this.roundRobinIndex % nodes.length;
    this.roundRobinIndex++;
    return nodes[index].id;
  }
}
