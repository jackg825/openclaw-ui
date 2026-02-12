import { describe, it, expect } from 'vitest';
import { A2UIParser } from './parser';

describe('A2UIParser', () => {
  const parser = new A2UIParser();

  describe('parseLine', () => {
    it('parses a valid surfaceUpdate message', () => {
      const line = JSON.stringify({
        surfaceUpdate: {
          surfaceId: 's1',
          components: [
            { id: 'c1', type: 'Text', props: { content: 'Hello' } },
          ],
        },
      });

      const result = parser.parseLine(line);
      expect(result).toEqual({
        type: 'surfaceUpdate',
        surfaceId: 's1',
        components: [
          { id: 'c1', type: 'Text', props: { content: 'Hello' } },
        ],
      });
    });

    it('parses a beginRendering message', () => {
      const line = JSON.stringify({
        beginRendering: { surfaceId: 's1', mode: 'replace' },
      });

      const result = parser.parseLine(line);
      expect(result).toEqual({
        type: 'beginRendering',
        surfaceId: 's1',
        mode: 'replace',
      });
    });

    it('parses a dataModelUpdate message', () => {
      const line = JSON.stringify({
        dataModelUpdate: { surfaceId: 's1', path: 'user.name', value: 'Alice' },
      });

      const result = parser.parseLine(line);
      expect(result).toEqual({
        type: 'dataModelUpdate',
        surfaceId: 's1',
        path: 'user.name',
        value: 'Alice',
      });
    });

    it('parses a deleteSurface message', () => {
      const line = JSON.stringify({
        deleteSurface: { surfaceId: 's1' },
      });

      const result = parser.parseLine(line);
      expect(result).toEqual({
        type: 'deleteSurface',
        surfaceId: 's1',
      });
    });

    it('returns null for unrecognized message types', () => {
      const line = JSON.stringify({ unknownType: { foo: 'bar' } });
      expect(parser.parseLine(line)).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      expect(parser.parseLine('not valid json')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parser.parseLine('')).toBeNull();
    });

    it('returns null for whitespace-only string', () => {
      expect(parser.parseLine('   ')).toBeNull();
    });
  });

  describe('parseBlock', () => {
    it('parses multiple JSONL lines', () => {
      const block = [
        JSON.stringify({ beginRendering: { surfaceId: 's1' } }),
        JSON.stringify({
          surfaceUpdate: {
            surfaceId: 's1',
            components: [{ id: 'c1', type: 'Text', props: { content: 'Hi' } }],
          },
        }),
      ].join('\n');

      const results = parser.parseBlock(block);
      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('beginRendering');
      expect(results[1].type).toBe('surfaceUpdate');
    });

    it('filters out invalid lines', () => {
      const block = [
        JSON.stringify({ beginRendering: { surfaceId: 's1' } }),
        'invalid json',
        '',
        JSON.stringify({ unknownType: {} }),
        JSON.stringify({ deleteSurface: { surfaceId: 's1' } }),
      ].join('\n');

      const results = parser.parseBlock(block);
      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('beginRendering');
      expect(results[1].type).toBe('deleteSurface');
    });

    it('returns empty array for empty block', () => {
      expect(parser.parseBlock('')).toEqual([]);
    });
  });
});
