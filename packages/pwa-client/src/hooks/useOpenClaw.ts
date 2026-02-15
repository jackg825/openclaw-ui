import { useRef, useCallback, useEffect } from 'react';
import { useConnectionStore } from '@/stores/connection';
import { useChatStore } from '@/stores/chat';
import { ConnectionManager } from '@/lib/webrtc/connection-manager';
import { OpenClawProtocol } from '@/lib/openclaw/protocol';
import { useStreamAccumulator } from './useStreamAccumulator';
import type {
  ChatEventPayload,
  AgentEventPayload,
  LifecycleData,
  ToolEventData,
  AssistantStreamData,
} from '@shared/openclaw-protocol';

interface OpenClawConnection {
  connect: (signalingUrl: string, roomId: string) => Promise<void>;
  disconnect: () => void;
  sendMessage: (prompt: string) => void;
  abortRun: () => void;
  sendDeviceRegistration: (deviceToken: string, stableRoomId: string) => void;
}

export function useOpenClaw(): OpenClawConnection {
  const managerRef = useRef<ConnectionManager | null>(null);
  const protocolRef = useRef<OpenClawProtocol | null>(null);
  const pendingRegistration = useRef<{ deviceToken: string; stableRoomId: string } | null>(null);

  const setStatus = useConnectionStore((s) => s.setStatus);
  const setError = useConnectionStore((s) => s.setError);
  const reset = useConnectionStore((s) => s.reset);

  const addMessage = useChatStore((s) => s.addMessage);
  const startAgentTurn = useChatStore((s) => s.startAgentTurn);
  const appendTextSegment = useChatStore((s) => s.appendTextSegment);
  const appendThinkingSegment = useChatStore((s) => s.appendThinkingSegment);
  const addToolCall = useChatStore((s) => s.addToolCall);
  const updateToolCall = useChatStore((s) => s.updateToolCall);
  const addErrorSegment = useChatStore((s) => s.addErrorSegment);
  const finishTurn = useChatStore((s) => s.finishTurn);
  const sessionKey = useChatStore((s) => s.sessionKey);

  // Stream accumulator for text deltas — batches to ~16fps
  const textAccumulator = useStreamAccumulator(
    useCallback((text: string) => {
      const runId = useChatStore.getState().currentRunId;
      if (runId) appendTextSegment(runId, text);
    }, [appendTextSegment]),
  );

  const connect = useCallback(
    async (signalingUrl: string, roomId: string) => {
      try {
        // Clean up previous connection
        if (protocolRef.current) {
          protocolRef.current.destroy();
          protocolRef.current = null;
        }
        if (managerRef.current) {
          managerRef.current.disconnect();
        }

        setStatus('signaling');

        const manager = new ConnectionManager(signalingUrl, roomId);
        managerRef.current = manager;

        // Create protocol with manager's send function
        const protocol = new OpenClawProtocol((data) => manager.send(data));
        protocolRef.current = protocol;

        // Wire chat events
        protocol.on('chat', (payload: ChatEventPayload) => {
          const { runId, state } = payload;

          if (state === 'delta' && payload.message?.content) {
            const text = payload.message.content.map((b) => b.text).join('');
            if (text) textAccumulator.append(text);
          } else if (state === 'final') {
            textAccumulator.flush();
            finishTurn(runId, payload.usage);
          } else if (state === 'error') {
            textAccumulator.flush();
            addErrorSegment(runId, payload.errorMessage ?? 'Unknown error');
            finishTurn(runId);
          } else if (state === 'aborted') {
            textAccumulator.flush();
            addErrorSegment(runId, 'Run aborted');
            finishTurn(runId);
          }
        });

        // Wire agent events
        protocol.on('agent', (payload: AgentEventPayload) => {
          const { runId, stream, data } = payload;

          if (stream === 'lifecycle') {
            const ld = data as unknown as LifecycleData;
            if (ld.phase === 'start') {
              startAgentTurn(runId);
            } else if (ld.phase === 'error') {
              addErrorSegment(runId, String(ld.error ?? 'Unknown error'));
            }
            // 'end' phase is handled by chat final event
          }

          if (stream === 'tool') {
            const td = data as unknown as ToolEventData;
            if (td.phase === 'start') {
              // Flush any pending text before tool call
              textAccumulator.flush();
              addToolCall(runId, td.toolCallId, td.name, td.args);
            } else if (td.phase === 'result') {
              updateToolCall(runId, td.toolCallId, {
                output: td.result,
                status: td.isError ? 'error' : 'success',
                isError: td.isError,
              });
            } else if (td.phase === 'update') {
              updateToolCall(runId, td.toolCallId, {
                output: td.partialResult,
              });
            }
          }

          if (stream === 'assistant') {
            const ad = data as unknown as AssistantStreamData;
            appendThinkingSegment(runId, ad.text);
          }
        });

        // Connection lifecycle events
        manager.addEventListener('connected', () => {
          setStatus('connected');
          if (pendingRegistration.current) {
            const { deviceToken, stableRoomId } = pendingRegistration.current;
            manager.send(JSON.stringify({
              type: 'device-registration',
              deviceToken,
              stableRoomId,
            }));
            pendingRegistration.current = null;
          }
        });

        manager.addEventListener('reconnecting', () => setStatus('reconnecting'));
        manager.addEventListener('disconnected', () => setStatus('disconnected'));
        manager.addEventListener('error', (e) => {
          const detail = (e as CustomEvent).detail;
          if (typeof detail === 'string') setError(detail);
          else if (detail && typeof detail === 'object') setError(detail.message, detail.code);
        });

        // Route incoming messages through protocol
        manager.onMessage((msg) => {
          try {
            const parsed = JSON.parse(msg);
            if (parsed.type === 'device-registration-ack') return;
          } catch {
            // Not JSON — fall through
          }
          protocol.handleFrame(msg);
        });

        setStatus('connecting');
        await manager.connect();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed');
      }
    },
    [setStatus, setError, textAccumulator, startAgentTurn, appendThinkingSegment, addToolCall, updateToolCall, addErrorSegment, finishTurn],
  );

  const disconnect = useCallback(() => {
    protocolRef.current?.destroy();
    protocolRef.current = null;
    managerRef.current?.disconnect();
    managerRef.current = null;
    pendingRegistration.current = null;
    textAccumulator.reset();
    reset();
  }, [reset, textAccumulator]);

  const sendMessage = useCallback(
    (prompt: string) => {
      addMessage({ role: 'user', content: prompt });
      protocolRef.current?.chatSend({
        sessionKey,
        message: prompt,
        idempotencyKey: crypto.randomUUID(),
      });
    },
    [addMessage, sessionKey],
  );

  const abortRun = useCallback(() => {
    const runId = useChatStore.getState().currentRunId;
    if (runId) {
      protocolRef.current?.chatAbort(runId);
    }
  }, []);

  const sendDeviceRegistration = useCallback(
    (deviceToken: string, stableRoomId: string) => {
      const manager = managerRef.current;
      if (manager?.getState() === 'connected') {
        manager.send(JSON.stringify({ type: 'device-registration', deviceToken, stableRoomId }));
      } else {
        pendingRegistration.current = { deviceToken, stableRoomId };
      }
    },
    [],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      protocolRef.current?.destroy();
      managerRef.current?.disconnect();
    };
  }, []);

  return { connect, disconnect, sendMessage, abortRun, sendDeviceRegistration };
}
