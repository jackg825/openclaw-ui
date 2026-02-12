import { describe, it, expect, beforeEach } from 'vitest';
import { MessageChunker, MAX_CHUNK_SIZE } from './chunker';

describe('MessageChunker', () => {
  let chunker: MessageChunker;

  beforeEach(() => {
    chunker = new MessageChunker();
  });

  describe('MAX_CHUNK_SIZE', () => {
    it('should be 64 KiB', () => {
      expect(MAX_CHUNK_SIZE).toBe(64 * 1024);
    });
  });

  describe('split', () => {
    it('should return the original message in an array when under MAX_CHUNK_SIZE', () => {
      const msg = 'Hello, world!';
      const result = chunker.split(msg);
      expect(result).toEqual([msg]);
    });

    it('should return the original message when exactly MAX_CHUNK_SIZE', () => {
      const msg = 'a'.repeat(MAX_CHUNK_SIZE);
      const result = chunker.split(msg);
      expect(result).toEqual([msg]);
    });

    it('should split messages larger than MAX_CHUNK_SIZE into chunks', () => {
      const msg = 'a'.repeat(MAX_CHUNK_SIZE * 2 + 100);
      const result = chunker.split(msg);
      expect(result.length).toBe(3);

      // Each chunk should be a valid JSON ChunkEnvelope
      for (const chunk of result) {
        const parsed = JSON.parse(chunk);
        expect(parsed._chunk).toBeDefined();
        expect(parsed._chunk.id).toBeDefined();
        expect(typeof parsed._chunk.seq).toBe('number');
        expect(parsed._chunk.total).toBe(3);
        expect(parsed._data).toBeDefined();
      }
    });

    it('should produce chunks with sequential seq values', () => {
      const msg = 'b'.repeat(MAX_CHUNK_SIZE * 3);
      const result = chunker.split(msg);
      const seqs = result.map((c) => JSON.parse(c)._chunk.seq);
      expect(seqs).toEqual([0, 1, 2]);
    });

    it('should use the same chunk ID for all chunks from one message', () => {
      const msg = 'c'.repeat(MAX_CHUNK_SIZE * 2 + 1);
      const result = chunker.split(msg);
      const ids = result.map((c) => JSON.parse(c)._chunk.id);
      expect(new Set(ids).size).toBe(1);
    });

    it('should produce different chunk IDs for different messages', () => {
      const msg1 = 'd'.repeat(MAX_CHUNK_SIZE + 1);
      const msg2 = 'e'.repeat(MAX_CHUNK_SIZE + 1);
      const result1 = chunker.split(msg1);
      const result2 = chunker.split(msg2);
      const id1 = JSON.parse(result1[0])._chunk.id;
      const id2 = JSON.parse(result2[0])._chunk.id;
      expect(id1).not.toBe(id2);
    });
  });

  describe('receive', () => {
    it('should pass through non-JSON strings as-is', () => {
      const result = chunker.receive('not json at all');
      expect(result).toBe('not json at all');
    });

    it('should pass through JSON without _chunk field', () => {
      const msg = JSON.stringify({ hello: 'world' });
      const result = chunker.receive(msg);
      expect(result).toBe(msg);
    });

    it('should pass through small messages that were not chunked', () => {
      const msg = 'Hello, small message!';
      const result = chunker.receive(msg);
      expect(result).toBe(msg);
    });

    it('should reassemble chunks in order', () => {
      const original = 'x'.repeat(MAX_CHUNK_SIZE * 2 + 500);
      const chunks = chunker.split(original);

      // Feed chunks in order
      const result0 = chunker.receive(chunks[0]);
      expect(result0).toBeNull();

      const result1 = chunker.receive(chunks[1]);
      expect(result1).toBeNull();

      const result2 = chunker.receive(chunks[2]);
      expect(result2).toBe(original);
    });

    it('should reassemble chunks out of order', () => {
      const original = 'y'.repeat(MAX_CHUNK_SIZE * 3);
      const chunks = chunker.split(original);

      // Feed chunks out of order: 2, 0, 1
      const r0 = chunker.receive(chunks[2]);
      expect(r0).toBeNull();

      const r1 = chunker.receive(chunks[0]);
      expect(r1).toBeNull();

      const r2 = chunker.receive(chunks[1]);
      expect(r2).toBe(original);
    });

    it('should handle duplicate chunks gracefully', () => {
      const original = 'z'.repeat(MAX_CHUNK_SIZE + 1);
      const chunks = chunker.split(original);

      chunker.receive(chunks[0]); // first chunk
      chunker.receive(chunks[0]); // duplicate — should overwrite, not corrupt

      const result = chunker.receive(chunks[1]);
      expect(result).toBe(original);
    });

    it('should handle multiple interleaved messages', () => {
      const msg1 = 'A'.repeat(MAX_CHUNK_SIZE + 1);
      const msg2 = 'B'.repeat(MAX_CHUNK_SIZE + 1);

      const chunks1 = chunker.split(msg1);
      const chunks2 = chunker.split(msg2);

      // Interleave: msg1[0], msg2[0], msg1[1], msg2[1]
      expect(chunker.receive(chunks1[0])).toBeNull();
      expect(chunker.receive(chunks2[0])).toBeNull();
      const r1 = chunker.receive(chunks1[1]);
      expect(r1).toBe(msg1);
      const r2 = chunker.receive(chunks2[1]);
      expect(r2).toBe(msg2);
    });
  });

  describe('split + receive roundtrip', () => {
    it('should roundtrip a small message', () => {
      const original = '{"type":"req","id":"123","method":"connect","params":{}}';
      const chunks = chunker.split(original);
      expect(chunks.length).toBe(1);

      const result = chunker.receive(chunks[0]);
      expect(result).toBe(original);
    });

    it('should roundtrip a large message', () => {
      const largePayload = JSON.stringify({
        type: 'event',
        event: 'agent.text',
        payload: { content: 'W'.repeat(MAX_CHUNK_SIZE * 5) },
      });

      const chunks = chunker.split(largePayload);
      expect(chunks.length).toBeGreaterThan(1);

      let assembled: string | null = null;
      for (const chunk of chunks) {
        assembled = chunker.receive(chunk);
      }
      expect(assembled).toBe(largePayload);
    });
  });

  describe('clear', () => {
    it('should discard incomplete pending chunks', () => {
      const original = 'Q'.repeat(MAX_CHUNK_SIZE + 1);
      const chunks = chunker.split(original);

      chunker.receive(chunks[0]); // partial
      chunker.clear();

      // After clear, the second chunk for the old message should not assemble
      // because the first chunk was discarded
      const result = chunker.receive(chunks[1]);
      // It will try to create a new pending entry with only chunk[1], not complete
      expect(result).toBeNull();
    });
  });
});
