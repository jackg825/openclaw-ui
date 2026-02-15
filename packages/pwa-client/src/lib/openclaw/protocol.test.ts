import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenClawProtocol } from './protocol';

function createMockTransport() {
  let lastSent: string | null = null;
  const sendFn = vi.fn((msg: string) => {
    lastSent = msg;
  });

  return {
    sendFn,
    getLastSent: () => lastSent,
    getSentParsed: (callIdx = 0) => JSON.parse(sendFn.mock.calls[callIdx][0]),
  };
}

describe('OpenClawProtocol', () => {
  let transport: ReturnType<typeof createMockTransport>;
  let protocol: OpenClawProtocol;

  beforeEach(() => {
    vi.useFakeTimers();
    transport = createMockTransport();
    protocol = new OpenClawProtocol(transport.sendFn);
  });

  afterEach(() => {
    vi.useRealTimers();
    protocol.destroy();
  });

  describe('request/response', () => {
    it('should send a request frame', async () => {
      const promise = protocol.request('chat.send', { sessionKey: 's1' });

      expect(transport.sendFn).toHaveBeenCalledOnce();
      const sent = transport.getSentParsed();
      expect(sent.type).toBe('req');
      expect(sent.method).toBe('chat.send');
      expect(sent.params.sessionKey).toBe('s1');

      protocol.handleFrame(
        JSON.stringify({ type: 'res', id: sent.id, ok: true, payload: { runId: 'r1' } }),
      );

      const result = await promise;
      expect(result).toEqual({ runId: 'r1' });
    });

    it('should reject on error response', async () => {
      const promise = protocol.request('bad.method', {});
      const sent = transport.getSentParsed();

      protocol.handleFrame(
        JSON.stringify({
          type: 'res',
          id: sent.id,
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Method not found' },
        }),
      );

      await expect(promise).rejects.toEqual({ code: 'NOT_FOUND', message: 'Method not found' });
    });

    it('should timeout after 30 seconds by default', async () => {
      const promise = protocol.request('slow.method', {});
      vi.advanceTimersByTime(31_000);
      await expect(promise).rejects.toThrow('Request slow.method timed out');
    });

    it('should support custom timeout', async () => {
      const promise = protocol.request('fast.method', {}, 5_000);
      vi.advanceTimersByTime(6_000);
      await expect(promise).rejects.toThrow('Request fast.method timed out');
    });

    it('should handle multiple concurrent requests', async () => {
      const p1 = protocol.request<{ a: number }>('method1', {});
      const p2 = protocol.request<{ b: number }>('method2', {});

      expect(transport.sendFn).toHaveBeenCalledTimes(2);
      const sent1 = transport.getSentParsed(0);
      const sent2 = transport.getSentParsed(1);

      // Respond out of order
      protocol.handleFrame(
        JSON.stringify({ type: 'res', id: sent2.id, ok: true, payload: { b: 2 } }),
      );
      protocol.handleFrame(
        JSON.stringify({ type: 'res', id: sent1.id, ok: true, payload: { a: 1 } }),
      );

      expect(await p1).toEqual({ a: 1 });
      expect(await p2).toEqual({ b: 2 });
    });
  });

  describe('chatSend', () => {
    it('should send chat.send with ChatSendParams', async () => {
      const promise = protocol.chatSend({
        sessionKey: 'session-1',
        message: 'Hello',
        idempotencyKey: 'idem-1',
      });

      const sent = transport.getSentParsed();
      expect(sent.method).toBe('chat.send');
      expect(sent.params.sessionKey).toBe('session-1');
      expect(sent.params.message).toBe('Hello');

      protocol.handleFrame(
        JSON.stringify({ type: 'res', id: sent.id, ok: true, payload: { runId: 'run-abc' } }),
      );

      const result = await promise;
      expect(result.runId).toBe('run-abc');
    });

    it('should use 2-minute timeout for chat.send', async () => {
      const promise = protocol.chatSend({
        sessionKey: 's1',
        message: 'test',
        idempotencyKey: 'k1',
      });

      // Should NOT timeout at 30s
      vi.advanceTimersByTime(31_000);
      // Resolve to check it's still pending
      const sent = transport.getSentParsed();
      protocol.handleFrame(
        JSON.stringify({ type: 'res', id: sent.id, ok: true, payload: { runId: 'r1' } }),
      );

      const result = await promise;
      expect(result.runId).toBe('r1');
    });
  });

  describe('chatAbort', () => {
    it('should send chat.abort', async () => {
      const promise = protocol.chatAbort('run-123');
      const sent = transport.getSentParsed();
      expect(sent.method).toBe('chat.abort');
      expect(sent.params.runId).toBe('run-123');

      protocol.handleFrame(
        JSON.stringify({ type: 'res', id: sent.id, ok: true }),
      );

      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('resolveApproval', () => {
    it('should send exec.approval.resolve', async () => {
      const promise = protocol.resolveApproval('run-abc', 'tc-1', 'approve');
      const sent = transport.getSentParsed();
      expect(sent.method).toBe('exec.approval.resolve');
      expect(sent.params.runId).toBe('run-abc');
      expect(sent.params.toolCallId).toBe('tc-1');
      expect(sent.params.action).toBe('approve');

      protocol.handleFrame(
        JSON.stringify({ type: 'res', id: sent.id, ok: true }),
      );

      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('typed events (on)', () => {
    it('should dispatch chat events to typed handlers', () => {
      const handler = vi.fn();
      protocol.on('chat', handler);

      const payload = {
        runId: 'run-1',
        sessionKey: 's1',
        seq: 1,
        state: 'delta',
        message: { role: 'assistant', content: [{ type: 'text', text: 'Hi' }], timestamp: 100 },
      };

      protocol.handleFrame(
        JSON.stringify({ type: 'event', event: 'chat', payload }),
      );

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0]).toEqual(payload);
    });

    it('should dispatch agent events', () => {
      const handler = vi.fn();
      protocol.on('agent', handler);

      const payload = {
        runId: 'run-1',
        seq: 1,
        stream: 'tool',
        ts: Date.now(),
        data: { phase: 'start', toolCallId: 'tc-1', name: 'read_file', args: { path: '/a.txt' } },
      };

      protocol.handleFrame(
        JSON.stringify({ type: 'event', event: 'agent', payload }),
      );

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].stream).toBe('tool');
    });

    it('should return unsubscribe function', () => {
      const handler = vi.fn();
      const unsub = protocol.on('chat', handler);

      protocol.handleFrame(
        JSON.stringify({ type: 'event', event: 'chat', payload: { runId: 'r1', seq: 1 } }),
      );
      expect(handler).toHaveBeenCalledOnce();

      unsub();

      protocol.handleFrame(
        JSON.stringify({ type: 'event', event: 'chat', payload: { runId: 'r2', seq: 2 } }),
      );
      expect(handler).toHaveBeenCalledOnce(); // Still 1
    });

    it('should handle multiple handlers for same event', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      protocol.on('agent', h1);
      protocol.on('agent', h2);

      protocol.handleFrame(
        JSON.stringify({ type: 'event', event: 'agent', payload: { runId: 'r1', seq: 1 } }),
      );

      expect(h1).toHaveBeenCalledOnce();
      expect(h2).toHaveBeenCalledOnce();
    });

    it('should not throw if handler throws', () => {
      const badHandler = vi.fn(() => { throw new Error('boom'); });
      const goodHandler = vi.fn();
      protocol.on('chat', badHandler);
      protocol.on('chat', goodHandler);

      expect(() => {
        protocol.handleFrame(
          JSON.stringify({ type: 'event', event: 'chat', payload: { runId: 'r1', seq: 1 } }),
        );
      }).not.toThrow();

      expect(goodHandler).toHaveBeenCalledOnce();
    });
  });

  describe('handleFrame edge cases', () => {
    it('should ignore non-JSON messages', () => {
      expect(() => protocol.handleFrame('not json')).not.toThrow();
    });

    it('should ignore responses with unknown IDs', () => {
      expect(() => {
        protocol.handleFrame(
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

    it('should clear all listeners', () => {
      const handler = vi.fn();
      protocol.on('chat', handler);
      protocol.destroy();

      protocol.handleFrame(
        JSON.stringify({ type: 'event', event: 'chat', payload: { runId: 'r1', seq: 1 } }),
      );
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
