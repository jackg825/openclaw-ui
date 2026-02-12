import { create } from 'zustand';
import type { ClusterNode, NodeConfig, RoutingStrategy } from '@shared/cluster';

interface ClusterState {
  nodes: ClusterNode[];
  routingStrategy: RoutingStrategy;
  activeNodeId: string | null;

  setNodes: (nodes: ClusterNode[]) => void;
  addNode: (node: ClusterNode) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<ClusterNode>) => void;
  setRoutingStrategy: (strategy: RoutingStrategy) => void;
  setActiveNodeId: (nodeId: string | null) => void;
}

export const useClusterStore = create<ClusterState>((set) => ({
  nodes: [],
  routingStrategy: 'affinity',
  activeNodeId: null,

  setNodes: (nodes) => set({ nodes }),
  addNode: (node) =>
    set((state) => ({ nodes: [...state.nodes, node] })),
  removeNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      activeNodeId:
        state.activeNodeId === nodeId ? null : state.activeNodeId,
    })),
  updateNode: (nodeId, updates) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, ...updates } : n,
      ),
    })),
  setRoutingStrategy: (routingStrategy) => set({ routingStrategy }),
  setActiveNodeId: (activeNodeId) => set({ activeNodeId }),
}));
