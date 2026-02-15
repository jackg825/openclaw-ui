import { WebSocketServer, WebSocket } from 'ws';

const PORT = parseInt(process.env.PORT ?? '18789', 10);

// Predefined response scenarios
const SCENARIOS = {
  simple: { thinking: false, toolCalls: 0, responseText: 'Hello! I can help you with that.' },
  withThinking: { thinking: true, toolCalls: 0, responseText: 'After considering your question, here is my answer.' },
  withTools: { thinking: true, toolCalls: 1, responseText: 'I\'ve read the file and here\'s what I found.' },
  multiTool: { thinking: true, toolCalls: 3, responseText: 'I\'ve completed all the requested operations.' },
};

type Scenario = keyof typeof SCENARIOS;

const scenario: Scenario = (process.env.SCENARIO as Scenario) ?? 'withTools';

function createFrame(type: 'res' | 'event', data: Record<string, unknown>): string {
  return JSON.stringify({ type, ...data });
}

async function handleChatSend(ws: WebSocket, reqId: string, params: Record<string, unknown>) {
  const runId = `mock-${crypto.randomUUID().slice(0, 8)}`;
  const sessionKey = (params.sessionKey as string) ?? 'default';
  const config = SCENARIOS[scenario];
  let seq = 0;

  // 1. Respond to the RPC
  ws.send(createFrame('res', { id: reqId, ok: true, payload: { runId } }));

  // 2. Lifecycle start
  await delay(50);
  ws.send(JSON.stringify({
    type: 'event', event: 'agent',
    payload: { runId, seq: seq++, stream: 'lifecycle', ts: Date.now(), data: { phase: 'start' } },
  }));

  // 3. Thinking (optional)
  if (config.thinking) {
    await delay(100);
    ws.send(JSON.stringify({
      type: 'event', event: 'agent',
      payload: { runId, seq: seq++, stream: 'assistant', ts: Date.now(), data: { text: 'Let me think about this...' } },
    }));
    await delay(200);
    ws.send(JSON.stringify({
      type: 'event', event: 'agent',
      payload: { runId, seq: seq++, stream: 'assistant', ts: Date.now(), data: { text: ' Analyzing the request carefully.' } },
    }));
  }

  // 4. Tool calls (optional)
  for (let i = 0; i < config.toolCalls; i++) {
    const toolCallId = `tc-${crypto.randomUUID().slice(0, 8)}`;
    const toolName = ['read_file', 'bash', 'write_file'][i % 3];
    const args = toolName === 'read_file' ? { path: '/src/app.ts' }
      : toolName === 'bash' ? { command: 'echo "hello"' }
      : { path: '/src/output.ts', content: '// generated' };

    await delay(100);
    ws.send(JSON.stringify({
      type: 'event', event: 'agent',
      payload: { runId, seq: seq++, stream: 'tool', ts: Date.now(), data: { phase: 'start', toolCallId, name: toolName, args } },
    }));

    await delay(300 + Math.random() * 500);
    ws.send(JSON.stringify({
      type: 'event', event: 'agent',
      payload: { runId, seq: seq++, stream: 'tool', ts: Date.now(), data: { phase: 'result', toolCallId, result: `Result of ${toolName}`, isError: false } },
    }));
  }

  // 5. Text deltas (streaming response)
  const words = config.responseText.split(' ');
  for (let i = 0; i < words.length; i++) {
    await delay(80 + Math.random() * 70); // ~80-150ms per word
    const text = (i > 0 ? ' ' : '') + words[i];
    ws.send(JSON.stringify({
      type: 'event', event: 'chat',
      payload: {
        runId, sessionKey, seq: seq++, state: 'delta',
        message: { role: 'assistant', content: [{ type: 'text', text }], timestamp: Date.now() },
      },
    }));
  }

  // 6. Lifecycle end
  await delay(50);
  ws.send(JSON.stringify({
    type: 'event', event: 'agent',
    payload: { runId, seq: seq++, stream: 'lifecycle', ts: Date.now(), data: { phase: 'end' } },
  }));

  // 7. Chat final
  await delay(50);
  ws.send(JSON.stringify({
    type: 'event', event: 'chat',
    payload: {
      runId, sessionKey, seq: seq++, state: 'final',
      usage: { inputTokens: 1234, outputTokens: 567, cacheReadTokens: 890, cost: 0.0042 },
    },
  }));
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Server setup
const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  console.log(`[mock-gateway] Client connected (total: ${wss.clients.size})`);

  ws.on('message', (raw) => {
    try {
      const frame = JSON.parse(raw.toString());
      if (frame.type === 'req') {
        console.log(`[mock-gateway] Request: ${frame.method}`, frame.id?.slice(0, 8));
        if (frame.method === 'chat.send') {
          handleChatSend(ws, frame.id, frame.params ?? {});
        } else if (frame.method === 'chat.abort') {
          const runId = frame.params?.runId;
          ws.send(createFrame('res', { id: frame.id, ok: true }));
          // Send aborted chat event
          ws.send(JSON.stringify({
            type: 'event', event: 'chat',
            payload: { runId, sessionKey: 'default', seq: 0, state: 'aborted' },
          }));
        } else {
          ws.send(createFrame('res', { id: frame.id, ok: false, error: { code: 'METHOD_NOT_FOUND', message: `Unknown method: ${frame.method}` } }));
        }
      }
    } catch (e) {
      console.error('[mock-gateway] Parse error:', e);
    }
  });

  ws.on('close', () => {
    console.log(`[mock-gateway] Client disconnected (remaining: ${wss.clients.size})`);
  });
});

console.log(`[mock-gateway] Listening on ws://localhost:${PORT} (scenario: ${scenario})`);
console.log(`[mock-gateway] Available scenarios: ${Object.keys(SCENARIOS).join(', ')}`);
console.log(`[mock-gateway] Set SCENARIO env var to change (e.g., SCENARIO=multiTool)`);
