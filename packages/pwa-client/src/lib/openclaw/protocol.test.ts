import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenClawProtocol } from './protocol';
import type { ConnectionManager } from '../webrtc/connection-manager';

// Mock ConnectionManager
function createMockConnection() {
  const messageHandlers: ((message: string) => void)[] = [];
  let lastSent: string | null = null;

  const mock = {
    send: vi.fn((msg: string) => {
      lastSent = msg;
    }),
    onMessage: vi.fn((handler: (message: string) => void) => {
      messageHandlers.push(handler);
    }),
    offMessage: vi.fn((handler: (message: string) => void) => {
      const idx = messageHandlers.indexOf(handler);
      if (idx >= 0) messageHandlers.splice(idx, 1);
    }),
    // Helper to simulate an incoming message
    simulateMessage: (raw: string) => {
      for (const h of messageHandlers) h(raw);
    },
    getLastSent: () => lastSent,
  };

  return mock;
}

describe('OpenClawProtocol', () => {
  let mockConnection: ReturnType<typeof createMockConnection>;
  let protocol: OpenClawProtocol;

  beforeEach(() => {
    vi.useFakeTimers();
    mockConnection = createMockConnection();
    protocol = new OpenClawProtocol(mockConnection as unknown as ConnectionManager);
  });

  afterEach(() => {
    vi.useRealTimers();
    protocol.destroy();
  });

  describe('request/response', () => {
    it('should send a request frame over the connection', async () => {
      const promise = protocol.request('connect', { role: 'operator' });

      expect(mockConnection.send).toHaveBeenCalledOnce();
      const sent = JSON.parse(mockConnection.send.mock.calls[0][0]);
      expect(sent.type).toBe('req');
      expect(sent.method).toBe('connect');
      expect(sent.params.role).toBe('operator');
      expect(sent.id).toBeDefined();

      // Respond
      mockConnection.simulateMessage(
        JSON.stringify({ type: 'res', id: sent.id, ok: true, payload: { version: 1 } }),
      );

      const result = await promise;
      expect(result).toEqual({ version: 1 });
    });

    it('should reject on error response', async () => {
      const promise = protocol.request('bad.method', {});

      const sent = JSON.parse(mockConnection.send.mock.calls[0][0]);
      mockConnection.simulateMessage(
        JSON.stringify({
          type: 'res',
          id: sent.id,
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Method not found' },
        }),
      );

      await expect(promise).rejects.toEqual({ code: 'NOT_FOUND', message: 'Method not found' });
    });

    it('should timeout after 30 seconds', async () => {
      const promise = protocol.request('slow.method', {});

      // Advance time past the timeout
      vi.advanceTimersByTime(31_000);

      await expect(promise).rejects.toThrow('Request slow.method timed out');
    });

    it('should handle multiple concurrent requests', async () => {
      const p1 = protocol.request<{ a: number }>('method1', {});
      const p2 = protocol.request<{ b: number }>('method2', {});

      expect(mockConnection.send).toHaveBeenCalledTimes(2);

      const sent1 = JSON.parse(mockConnection.send.mock.calls[0][0]);
      const sent2 = JSON.parse(mockConnection.send.mock.calls[1][0]);

      // Respond to second first
      mockConnection.simulateMessage(
        JSON.stringify({ type: 'res', id: sent2.id, ok: true, payload: { b: 2 } }),
      );
      mockConnection.simulateMessage(
        JSON.stringify({ type: 'res', id: sent1.id, ok: true, payload: { a: 1 } }),
      );

      expect(await p1).toEqual({ a: 1 });
      expect(await p2).toEqual({ b: 2 });
    });
  });

  describe('connect', () => {
    it('should send a connect request with ConnectParams', async () => {
      const promise = protocol.connect({
        role: 'operator',
        minProtocol: 1,
        maxProtocol: 1,
        device: { name: 'Test', platform: 'test', version: '0.1.0' },
      });

      const sent = JSON.parse(mockConnection.send.mock.calls[0][0]);
      expect(sent.method).toBe('connect');
      expect(sent.params.role).toBe('operator');

      mockConnection.simulateMessage(
        JSON.stringify({
          type: 'res',
          id: sent.id,
          ok: true,
          payload: {
            protocolVersion: 1,
            gateway: { version: '0.12.1', name: 'TestGateway' },
          },
        }),
      );

      const result = await promise;
      expect(result.protocolVersion).toBe(1);
      expect(result.gateway.name).toBe('TestGateway');
    });
  });

  describe('agentRun', () => {
    it('should send an agent request', async () => {
      const promise = protocol.agentRun('Hello', 'agent-123');

      const sent = JSON.parse(mockConnection.send.mock.calls[0][0]);
      expect(sent.method).toBe('agent');
      expect(sent.params.prompt).toBe('Hello');
      expect(sent.params.agentId).toBe('agent-123');

      mockConnection.simulateMessage(
        JSON.stringify({
          type: 'res',
          id: sent.id,
          ok: true,
          payload: { runId: 'run-abc', status: 'accepted' },
        }),
      );

      const result = await promise;
      expect(result.runId).toBe('run-abc');
    });
  });

  describe('resolveApproval', () => {
    it('should send an approval resolution', async () => {
      const promise = protocol.resolveApproval('run-abc', 'approve');

      const sent = JSON.parse(mockConnection.send.mock.calls[0][0]);
      expect(sent.method).toBe('exec.approval.resolve');
      expect(sent.params.runId).toBe('run-abc');
      expect(sent.params.action).toBe('approve');

      mockConnection.simulateMessage(
        JSON.stringify({ type: 'res', id: sent.id, ok: true }),
      );

      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('events', () => {
    it('should dispatch events received from the connection', () => {
      const handler = vi.fn();
      protocol.addEventListener('agent.text', handler);

      mockConnection.simulateMessage(
        JSON.stringify({
          type: 'event',
          event: 'agent.text',
          payload: { runId: 'run-1', content: 'Hello from agent' },
        }),
      );

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].detail).toEqual({
        runId: 'run-1',
        content: 'Hello from agent',
      });
    });

    it('should dispatch approval requested events', () => {
      const handler = vi.fn();
      protocol.addEventListener('exec.approval.requested', handler);

      mockConnection.simulateMessage(
        JSON.stringify({
          type: 'event',
          event: 'exec.approval.requested',
          payload: {
            runId: 'run-2',
            tool: 'bash',
            args: { command: 'rm -rf /' },
            description: 'Delete everything',
          },
        }),
      );

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].detail.tool).toBe('bash');
    });

    it('should ignore non-JSON messages gracefully', () => {
      expect(() => {
        mockConnection.simulateMessage('not json');
      }).not.toThrow();
    });

    it('should ignore responses with unknown IDs', () => {
      expect(() => {
        mockConnection.simulateMessage(
          JSON.stringify({ type: 'res', id: 'unknown-id', ok: true, payload: {} }),
        );
      }).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('should reject all pending requests', async () => {
      const promise = protocol.request('test', {});

      protocol.destroy();

      await expect(promise).rejects.toThrow('Protocol destroyed');
    });
  });
});
