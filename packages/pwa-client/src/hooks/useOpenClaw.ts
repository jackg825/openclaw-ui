import { useRef, useCallback } from 'react';
import { useConnectionStore } from '@/stores/connection';
import { useChatStore } from '@/stores/chat';
import { ConnectionManager } from '@/lib/webrtc/connection-manager';

interface OpenClawConnection {
  connect: (signalingUrl: string, roomId: string) => Promise<void>;
  disconnect: () => void;
  sendMessage: (prompt: string) => void;
  sendDeviceRegistration: (deviceToken: string, stableRoomId: string) => void;
}

export function useOpenClaw(): OpenClawConnection {
  const managerRef = useRef<ConnectionManager | null>(null);
  const pendingRegistration = useRef<{ deviceToken: string; stableRoomId: string } | null>(null);
  const setStatus = useConnectionStore((s) => s.setStatus);
  const setError = useConnectionStore((s) => s.setError);
  const setGatewayInfo = useConnectionStore((s) => s.setGatewayInfo);
  const setDeviceToken = useConnectionStore((s) => s.setDeviceToken);
  const setLatency = useConnectionStore((s) => s.setLatency);
  const setTransport = useConnectionStore((s) => s.setTransport);
  const reset = useConnectionStore((s) => s.reset);
  const addMessage = useChatStore((s) => s.addMessage);
  const appendToLastMessage = useChatStore((s) => s.appendToLastMessage);
  const setStreaming = useChatStore((s) => s.setStreaming);

  const connect = useCallback(
    async (signalingUrl: string, roomId: string) => {
      try {
        console.debug('[hook:openclaw] Connecting', { signalingUrl, roomId });
        // Clean up previous connection
        if (managerRef.current) {
          console.debug('[hook:openclaw] Disconnecting previous connection');
          managerRef.current.disconnect();
        }

        setStatus('signaling');

        const manager = new ConnectionManager(signalingUrl, roomId);
        managerRef.current = manager;

        manager.addEventListener('connected', () => {
          console.debug('[hook:openclaw] Connected');
          setStatus('connected');

          // Send pending device registration if any
          if (pendingRegistration.current) {
            console.debug('[hook:openclaw] Sending queued device registration');
            const { deviceToken, stableRoomId } = pendingRegistration.current;
            manager.send(JSON.stringify({
              type: 'device-registration',
              deviceToken,
              stableRoomId,
            }));
            pendingRegistration.current = null;
          }
        });

        manager.addEventListener('reconnecting', () => {
          console.debug('[hook:openclaw] Reconnecting');
          setStatus('reconnecting');
        });

        manager.addEventListener('disconnected', () => {
          console.debug('[hook:openclaw] Disconnected');
          setStatus('disconnected');
        });

        manager.addEventListener('error', (e) => {
          console.debug('[hook:openclaw] Error', { detail: (e as CustomEvent).detail });
          setError((e as CustomEvent).detail);
        });

        // Handle incoming messages
        manager.onMessage((msg) => {
          console.debug('[hook:openclaw] Message received', { size: msg.length });
          // Silently consume device-registration-ack
          try {
            const parsed = JSON.parse(msg);
            if (parsed.type === 'device-registration-ack') {
              console.debug('[hook:openclaw] Device registration acknowledged');
              return;
            }
          } catch {
            // Not JSON — fall through to protocol handling
          }

          // TODO: OpenClawProtocol integration
          // protocol.handleMessage(msg) will route to chat store
        });

        setStatus('connecting');
        await manager.connect();
      } catch (err) {
        console.debug('[hook:openclaw] Connection error', { error: err instanceof Error ? err.message : err });
        setError(err instanceof Error ? err.message : 'Connection failed');
      }
    },
    [setStatus, setError],
  );

  const disconnect = useCallback(() => {
    console.debug('[hook:openclaw] Disconnect requested');
    managerRef.current?.disconnect();
    managerRef.current = null;
    pendingRegistration.current = null;
    reset();
  }, [reset]);

  const sendMessage = useCallback(
    (prompt: string) => {
      addMessage({ role: 'user', content: prompt });

      // TODO: protocol.agentRun(prompt) when protocol layer is available
      if (managerRef.current?.getState() === 'connected') {
        managerRef.current.send(JSON.stringify({
          jsonrpc: '2.0',
          method: 'agent.run',
          params: { prompt },
          id: crypto.randomUUID(),
        }));
      }
    },
    [addMessage],
  );

  const sendDeviceRegistration = useCallback(
    (deviceToken: string, stableRoomId: string) => {
      const manager = managerRef.current;
      if (manager?.getState() === 'connected') {
        manager.send(JSON.stringify({
          type: 'device-registration',
          deviceToken,
          stableRoomId,
        }));
      } else {
        // Queue — will be sent when relay connects
        pendingRegistration.current = { deviceToken, stableRoomId };
      }
    },
    [],
  );

  return { connect, disconnect, sendMessage, sendDeviceRegistration };
}
