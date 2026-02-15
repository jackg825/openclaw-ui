// OpenClaw Gateway JSON-RPC protocol types
// Based on official OpenClaw Gateway source (2026-02)

// === Frame Types ===

export interface OCRequest {
  type: 'req';
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface OCResponse {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    retryable?: boolean;
    retryAfterMs?: number;
  };
}

export interface OCEvent {
  type: 'event';
  event: string; // "chat" | "agent" | "tick" | "shutdown" | ...
  payload?: unknown;
  seq?: number;
  stateVersion?: unknown;
}

export type OCFrame = OCRequest | OCResponse | OCEvent;

// === Connect Handshake ===

export interface ConnectParams {
  minProtocol: number;
  maxProtocol: number;
  client: {
    id: string;
    displayName?: string;
    version: string;
    platform: string;
    mode: 'browser';
    instanceId?: string;
  };
  auth?: {
    token?: string;
    password?: string;
  };
  scopes?: string[];
  device?: {
    id: string;
    publicKey: string;
    signature: string;
    signedAt: number;
    nonce: string;
  };
  role?: string;
}

export interface HelloOk {
  type: 'hello-ok';
  protocol: number;
  server: {
    version: string;
    commit?: string;
    host?: string;
    connId: string;
  };
  features: {
    methods: string[];
    events: string[];
  };
  snapshot: unknown;
  policy: {
    maxPayload: number;
    maxBufferedBytes: number;
    tickIntervalMs: number;
  };
  auth?: {
    deviceToken: string;
    role: string;
    scopes: string[];
    issuedAtMs: number;
  };
}

// === Chat Protocol ===

export interface ChatSendParams {
  sessionKey: string;
  message: string;
  thinking?: string;
  deliver?: boolean;
  attachments?: Array<{ type: string; mimeType: string; content: string }>;
  timeoutMs?: number;
  idempotencyKey: string;
}

export interface ContentBlock {
  type: 'text';
  text: string;
}

export interface ChatEventPayload {
  runId: string;
  sessionKey: string;
  seq: number;
  state: 'delta' | 'final' | 'error' | 'aborted';
  message?: {
    role: 'assistant';
    content: ContentBlock[];
    timestamp: number;
  };
  errorMessage?: string;
  usage?: TokenUsage;
  stopReason?: string;
}

// === Agent Events ===

export interface AgentEventPayload {
  runId: string;
  sessionKey?: string;
  seq: number;
  stream: 'tool' | 'lifecycle' | 'assistant' | 'error' | 'compaction';
  ts: number;
  data: Record<string, unknown>;
}

// Typed data shapes per stream:

export interface ToolStartData {
  phase: 'start';
  toolCallId: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolUpdateData {
  phase: 'update';
  toolCallId: string;
  partialResult?: unknown;
}

export interface ToolResultData {
  phase: 'result';
  toolCallId: string;
  result: unknown;
  isError?: boolean;
}

export type ToolEventData = ToolStartData | ToolUpdateData | ToolResultData;

export interface LifecycleData {
  phase: 'start' | 'end' | 'error';
  error?: unknown;
}

export interface AssistantStreamData {
  text: string;
}

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  cost?: number;
}

// === Event Map for typed dispatch ===

export interface GatewayEventMap {
  chat: ChatEventPayload;
  agent: AgentEventPayload;
}

// === Session Management ===

export interface SessionInfo {
  key: string;
  displayName?: string;
  label?: string;
  kind?: string;
  channel?: string;
  updatedAt?: number;
}

// === Approval (shape TBD — shell for future Gateway verification) ===

export interface ApprovalRequest {
  runId: string;
  toolCallId: string;
  tool: string;
  args: Record<string, unknown>;
  description: string;
}

// Legacy re-export for backward compat during migration
/** @deprecated Use HelloOk instead */
export interface ConnectResult {
  protocolVersion: number;
  gateway: { version: string; name: string };
  auth?: { deviceToken: string };
}
