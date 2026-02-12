import type { ChunkEnvelope } from '@openclaw/shared-types';

export const MAX_CHUNK_SIZE = 64 * 1024; // 64 KiB

export class MessageChunker {
  private pending = new Map<string, { chunks: string[]; total: number }>();

  /** Split a message into chunks if needed */
  split(message: string): string[] {
    if (message.length <= MAX_CHUNK_SIZE) return [message];

    const id = crypto.randomUUID();
    const total = Math.ceil(message.length / MAX_CHUNK_SIZE);
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
    if (received === entry.total) {
      this.pending.delete(id);
      return entry.chunks.join('');
    }

    return null;
  }

  clear(): void {
    this.pending.clear();
  }
}
