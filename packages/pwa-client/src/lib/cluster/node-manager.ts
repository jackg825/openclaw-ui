import type { ClusterNode, NodeConfig } from '@shared/cluster';
import type { ConnectionManager } from '@/lib/webrtc/connection-manager';
import type { OpenClawProtocol } from '@/lib/openclaw/protocol';

export interface ManagedNode {
  connection: ConnectionManager;
  protocol: OpenClawProtocol;
  meta: ClusterNode;
}

export class NodeManager extends EventTarget {
  private nodes = new Map<string, ManagedNode>();

  async addNode(
    config: NodeConfig,
    createConnection: (config: NodeConfig) => { connection: ConnectionManager; protocol: OpenClawProtocol },
  ): Promise<void> {
    if (this.nodes.has(config.name)) {
      throw new Error(`Node "${config.name}" already exists`);
    }

    const { connection, protocol } = createConnection(config);

    const meta: ClusterNode = {
      id: crypto.randomUUID(),
      name: config.name,
      host: config.signalingUrl,
      status: 'connecting',
      capabilities: [],
      agents: [],
      skills: [],
      resources: {
        cpuPercent: 0,
        memoryPercent: 0,
        diskPercent: 0,
        activeRuns: 0,
        maxRuns: 0,
      },
      lastHeartbeat: new Date().toISOString(),
      addedAt: new Date().toISOString(),
    };

    this.nodes.set(meta.id, { connection, protocol, meta });

    connection.addEventListener('connected', () => {
      meta.status = 'online';
      this.dispatchEvent(new CustomEvent('node-status-changed', { detail: { nodeId: meta.id, status: 'online' } }));
    });

    connection.addEventListener('disconnected', () => {
      meta.status = 'offline';
      this.dispatchEvent(new CustomEvent('node-status-changed', { detail: { nodeId: meta.id, status: 'offline' } }));
    });

    this.dispatchEvent(new CustomEvent('node-added', { detail: { nodeId: meta.id } }));

    if (config.autoConnect !== false) {
      await connection.connect();
    }
  }

  async removeNode(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    node.connection.disconnect();
    this.nodes.delete(nodeId);
    this.dispatchEvent(new CustomEvent('node-removed', { detail: { nodeId } }));
  }

  getNode(nodeId: string): ManagedNode | undefined {
    return this.nodes.get(nodeId);
  }

  getHealthyNodes(): ClusterNode[] {
    return Array.from(this.nodes.values())
      .filter((n) => n.meta.status === 'online')
      .map((n) => n.meta);
  }

  getAllNodes(): ClusterNode[] {
    return Array.from(this.nodes.values()).map((n) => n.meta);
  }
}
