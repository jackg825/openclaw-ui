// Cluster node and routing types

export type NodeStatus = 'online' | 'degraded' | 'offline' | 'connecting';

export interface ClusterNode {
  id: string;
  name: string;
  host: string;
  status: NodeStatus;
  capabilities: string[];
  agents: string[];
  skills: string[];
  resources: NodeResources;
  lastHeartbeat: string;
  addedAt: string;
}

export interface NodeResources {
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  activeRuns: number;
  maxRuns: number;
}

export interface NodeConfig {
  name: string;
  signalingUrl: string;
  roomId: string;
  autoConnect?: boolean;
}

export interface RouteRequest {
  sessionKey: string;
  requiredCapabilities?: string[];
  preferredNodeId?: string;
}

export type RoutingStrategy = 'affinity' | 'capability' | 'round-robin' | 'least-loaded' | 'manual';
