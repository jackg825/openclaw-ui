import type { NodeResources } from '@shared/cluster';
import type { NodeManager } from './node-manager';

const DEFAULT_INTERVAL = 30_000; // 30 seconds
const MAX_MISSED_HEARTBEATS = 3;

export class HealthMonitor {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private missedHeartbeats = new Map<string, number>();
  private nodeManager: NodeManager | null = null;

  start(nodeManager: NodeManager, interval = DEFAULT_INTERVAL): void {
    this.stop();
    this.nodeManager = nodeManager;

    this.intervalId = setInterval(() => {
      this.checkAll();
    }, interval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.missedHeartbeats.clear();
    this.nodeManager = null;
  }

  onHealthCheck(nodeId: string, resources: NodeResources): void {
    if (!this.nodeManager) return;

    const node = this.nodeManager.getNode(nodeId);
    if (!node) return;

    node.meta.resources = resources;
    node.meta.lastHeartbeat = new Date().toISOString();

    if (node.meta.status === 'degraded') {
      node.meta.status = 'online';
    }

    this.missedHeartbeats.set(nodeId, 0);
  }

  private checkAll(): void {
    if (!this.nodeManager) return;

    for (const node of this.nodeManager.getAllNodes()) {
      if (node.status === 'offline' || node.status === 'connecting') continue;

      const missed = (this.missedHeartbeats.get(node.id) ?? 0) + 1;
      this.missedHeartbeats.set(node.id, missed);

      if (missed >= MAX_MISSED_HEARTBEATS) {
        this.markOffline(node.id);
      } else if (missed >= 2) {
        const managedNode = this.nodeManager.getNode(node.id);
        if (managedNode) {
          managedNode.meta.status = 'degraded';
        }
      }
    }
  }

  private markOffline(nodeId: string): void {
    if (!this.nodeManager) return;

    const node = this.nodeManager.getNode(nodeId);
    if (node) {
      node.meta.status = 'offline';
    }
  }
}
