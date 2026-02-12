import type { ChunkEnvelope } from '@openclaw/shared-types';

export const MAX_CHUNK_SIZE = 64 * 1024; // 64 KiB

export class MessageChunker {
  private pending = new Map<string, { chunks: string[]; total: number }>();

  /** Split a message into chunks if needed */
  split(message: string): string[] {
    if (message.length <= MAX_CHUNK_SIZE) return [message];

    const id = crypto.randomUUID();
    const total = Math.ceil(message.length / MAX_CHUNK_SIZE);
    console.debug('[chunker] Splitting message', { size: message.length, chunks: total, id: id.slice(0, 8) });
    const chunks: string[] = [];

    for (let i = 0; i < message.length; i += MAX_CHUNK_SIZE) {
      const data = message.slice(i, i + MAX_CHUNK_SIZE);
      const envelope: ChunkEnvelope = {
        _chunk: { id, seq: chunks.length, total },
        _data: data,
      };
      chunks.push(JSON.stringify(envelope));
    }

    return chunks;
  }

  /** Receive a raw string; returns assembled message when complete, else null */
  receive(raw: string): string | null {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return raw;
    }

    const obj = parsed as Record<string, unknown>;
    if (!obj._chunk) return raw;

    const { id, seq, total } = obj._chunk as ChunkEnvelope['_chunk'];
    const data = obj._data as string;

    if (!this.pending.has(id)) {
      this.pending.set(id, { chunks: new Array<string>(total), total });
    }

    const entry = this.pending.get(id)!;
    entry.chunks[seq] = data;

    const received = entry.chunks.filter(Boolean).length;
    console.debug('[chunker] Chunk received', { id: id.slice(0, 8), seq, received, total: entry.total });
    if (received === entry.total) {
      this.pending.delete(id);
      const assembled = entry.chunks.join('');
      console.debug('[chunker] Assembly complete', { id: id.slice(0, 8), size: assembled.length });
      return assembled;
    }

    return null;
  }

  clear(): void {
    this.pending.clear();
  }
}
