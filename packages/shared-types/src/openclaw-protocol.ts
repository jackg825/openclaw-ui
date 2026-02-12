// OpenClaw Gateway JSON-RPC protocol types

// Frame types
export interface OCRequest {
  type: 'req';
  id: string;
  method: string;
  params: Record<string, unknown>;
}

export interface OCResponse {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: { code: string; message: string };
}

export interface OCEvent {
  type: 'event';
  event: string;
  payload: unknown;
  seq?: number;
  stateVersion?: number;
}

export type OCFrame = OCRequest | OCResponse | OCEvent;

// Connect handshake
export interface ConnectParams {
  role: 'operator' | 'node';
  scopes?: string[];
  auth?: {
    token?: string;
    deviceToken?: string;
  };
  device?: {
    name: string;
    platform: string;
    version: string;
  };
  minProtocol: number;
  maxProtocol: number;
}

export interface ConnectResult {
  protocolVersion: number;
  gateway: { version: string; name: string };
  auth?: { deviceToken: string };
}

// Agent execution
export interface AgentRunParams {
  prompt: string;
  agentId?: string;
  sessionKey?: string;
}

export interface AgentRunResult {
  runId: string;
  status: 'accepted';
}

// Agent events
export interface AgentEvent {
  runId: string;
  type: 'text' | 'tool_use' | 'tool_result' | 'status';
  content: string;
  seq: number;
}

// Approval
export interface ApprovalRequest {
  runId: string;
  tool: string;
  args: Record<string, unknown>;
  description: string;
}
