import { useCallback } from 'react';
import { useClusterStore } from '@/stores/cluster';
import type { ClusterNode, NodeConfig, RoutingStrategy } from '@shared/cluster';

interface UseClusterReturn {
  nodes: ClusterNode[];
  routingStrategy: RoutingStrategy;
  activeNodeId: string | null;
  addNode: (config: NodeConfig) => Promise<void>;
  removeNode: (nodeId: string) => Promise<void>;
  setRoutingStrategy: (strategy: RoutingStrategy) => void;
}

export function useCluster(): UseClusterReturn {
  const store = useClusterStore();

  const addNode = useCallback(
    async (config: NodeConfig) => {
      // Will create a new WebRTC connection to the node via NodeManager
      // and add it to the cluster store once connected.
      const node: ClusterNode = {
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
      store.addNode(node);
    },
    [store],
  );

  const removeNode = useCallback(
    async (nodeId: string) => {
      // Will disconnect the WebRTC connection via NodeManager
      store.removeNode(nodeId);
    },
    [store],
  );

  return {
    nodes: store.nodes,
    routingStrategy: store.routingStrategy,
    activeNodeId: store.activeNodeId,
    addNode,
    removeNode,
    setRoutingStrategy: store.setRoutingStrategy,
  };
}
