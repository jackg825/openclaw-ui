import { create } from 'zustand';
import { generateId } from '@/utils/id';
import type { TokenUsage } from '@shared/openclaw-protocol';

// === Segment types (chronological within an agent turn) ===

export type TurnSegment =
  | { type: 'thinking'; content: string; isStreaming: boolean }
  | { type: 'text'; content: string; isStreaming: boolean }
  | {
      type: 'tool_call';
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
      status: 'running' | 'success' | 'error';
      output?: unknown;
      isError?: boolean;
      startedAt: number;
      completedAt?: number;
    }
  | { type: 'error'; message: string };

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;          // user messages use this
  segments?: TurnSegment[]; // agent turn chronological segment list
  timestamp: number;
  runId?: string;
  usage?: TokenUsage;
}

// === Store ===

interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  currentRunId: string | null;
  sessionKey: string;

  // Basic actions
  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  setSessionKey: (key: string) => void;

  // Agent turn segment actions
  startAgentTurn: (runId: string) => void;
  appendTextSegment: (runId: string, text: string) => void;
  appendThinkingSegment: (runId: string, text: string) => void;
  addToolCall: (
    runId: string,
    toolCallId: string,
    toolName: string,
    args: Record<string, unknown>,
  ) => void;
  updateToolCall: (
    runId: string,
    toolCallId: string,
    update: Partial<Pick<Extract<TurnSegment, { type: 'tool_call' }>, 'output' | 'status' | 'isError'>>,
  ) => void;
  addErrorSegment: (runId: string, message: string) => void;
  finishTurn: (runId: string, usage?: TokenUsage) => void;
}

// Lookup helper: find message index by runId
function findByRunId(messages: Message[], runId: string): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].runId === runId) return i;
  }
  return -1;
}

// Immutable update helper: clone messages array and the target message
function cloneAtIndex(messages: Message[], idx: number): Message[] {
  const cloned = [...messages];
  cloned[idx] = { ...cloned[idx], segments: [...(cloned[idx].segments ?? [])] };
  return cloned;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  currentRunId: null,
  sessionKey: 'default',

  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { ...msg, id: generateId(), timestamp: Date.now() },
      ],
    })),

  clearMessages: () => set({ messages: [], isStreaming: false, currentRunId: null }),

  setSessionKey: (sessionKey) => set({ sessionKey }),

  startAgentTurn: (runId) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: generateId(),
          role: 'agent',
          content: '',
          segments: [],
          timestamp: Date.now(),
          runId,
        },
      ],
      isStreaming: true,
      currentRunId: runId,
    })),

  appendTextSegment: (runId, text) =>
    set((state) => {
      const idx = findByRunId(state.messages, runId);
      if (idx < 0) return state;

      const messages = cloneAtIndex(state.messages, idx);
      const segments = messages[idx].segments!;
      const last = segments[segments.length - 1];

      if (last && last.type === 'text' && last.isStreaming) {
        // Append to existing streaming text segment
        segments[segments.length - 1] = { ...last, content: last.content + text };
      } else {
        // New text segment
        segments.push({ type: 'text', content: text, isStreaming: true });
      }

      // Also update flat content for backward compat
      messages[idx].content += text;
      return { messages };
    }),

  appendThinkingSegment: (runId, text) =>
    set((state) => {
      const idx = findByRunId(state.messages, runId);
      if (idx < 0) return state;

      const messages = cloneAtIndex(state.messages, idx);
      const segments = messages[idx].segments!;
      const last = segments[segments.length - 1];

      if (last && last.type === 'thinking' && last.isStreaming) {
        segments[segments.length - 1] = { ...last, content: last.content + text };
      } else {
        segments.push({ type: 'thinking', content: text, isStreaming: true });
      }

      return { messages };
    }),

  addToolCall: (runId, toolCallId, toolName, args) =>
    set((state) => {
      const idx = findByRunId(state.messages, runId);
      if (idx < 0) return state;

      const messages = cloneAtIndex(state.messages, idx);
      messages[idx].segments!.push({
        type: 'tool_call',
        toolCallId,
        toolName,
        args,
        status: 'running',
        startedAt: Date.now(),
      });

      return { messages };
    }),

  updateToolCall: (runId, toolCallId, update) =>
    set((state) => {
      const idx = findByRunId(state.messages, runId);
      if (idx < 0) return state;

      const messages = cloneAtIndex(state.messages, idx);
      const segments = messages[idx].segments!;
      const segIdx = segments.findIndex(
        (s) => s.type === 'tool_call' && s.toolCallId === toolCallId,
      );
      if (segIdx < 0) return state;

      const seg = segments[segIdx] as Extract<TurnSegment, { type: 'tool_call' }>;
      segments[segIdx] = {
        ...seg,
        ...update,
        completedAt: update.status && update.status !== 'running' ? Date.now() : seg.completedAt,
      };

      return { messages };
    }),

  addErrorSegment: (runId, message) =>
    set((state) => {
      const idx = findByRunId(state.messages, runId);
      if (idx < 0) return state;

      const messages = cloneAtIndex(state.messages, idx);
      messages[idx].segments!.push({ type: 'error', message });

      return { messages };
    }),

  finishTurn: (runId, usage) =>
    set((state) => {
      const idx = findByRunId(state.messages, runId);
      if (idx < 0) return { isStreaming: false, currentRunId: null };

      const messages = cloneAtIndex(state.messages, idx);
      // Stop all streaming segments
      for (let i = 0; i < messages[idx].segments!.length; i++) {
        const seg = messages[idx].segments![i];
        if ('isStreaming' in seg && seg.isStreaming) {
          messages[idx].segments![i] = { ...seg, isStreaming: false };
        }
      }
      if (usage) messages[idx].usage = usage;

      return { messages, isStreaming: false, currentRunId: null };
    }),
}));
