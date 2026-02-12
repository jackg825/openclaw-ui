import { describe, it, expect } from 'vitest';
import { StreamSplitter } from './stream-splitter';

describe('StreamSplitter', () => {
  it('returns markdown for text without fences', () => {
    const splitter = new StreamSplitter();
    const segments = splitter.feed('Hello world');
    expect(segments).toEqual([]);

    const flushed = splitter.flush();
    expect(flushed).toEqual({ type: 'markdown', content: 'Hello world' });
  });

  it('returns a2ui for fenced content', () => {
    const splitter = new StreamSplitter();
    const segments = splitter.feed('```a2ui\n{"surfaceUpdate":{}}\n```');
    expect(segments).toEqual([
      { type: 'a2ui', content: '{"surfaceUpdate":{}}' },
    ]);
  });

  it('splits mixed markdown and a2ui', () => {
    const splitter = new StreamSplitter();
    const input = 'Some text\n```a2ui\n{"data":"value"}\n```\nMore text';
    const segments = splitter.feed(input);

    expect(segments).toEqual([
      { type: 'markdown', content: 'Some text\n' },
      { type: 'a2ui', content: '{"data":"value"}' },
    ]);

    const flushed = splitter.flush();
    expect(flushed).toEqual({ type: 'markdown', content: '\nMore text' });
  });

  it('handles partial fence across chunks', () => {
    const splitter = new StreamSplitter();

    // First chunk: start of fence but no end
    const seg1 = splitter.feed('Hello ```a2ui\n{"partial":');
    expect(seg1).toEqual([
      { type: 'markdown', content: 'Hello ' },
    ]);

    // Second chunk: rest of content + closing fence
    const seg2 = splitter.feed('"data"}\n```');
    expect(seg2).toEqual([
      { type: 'a2ui', content: '{"partial":"data"}' },
    ]);
  });

  it('handles multiple a2ui blocks', () => {
    const splitter = new StreamSplitter();
    const input =
      'Text1\n```a2ui\nblock1\n```\nText2\n```a2ui\nblock2\n```\nText3';
    const segments = splitter.feed(input);

    expect(segments).toEqual([
      { type: 'markdown', content: 'Text1\n' },
      { type: 'a2ui', content: 'block1' },
      { type: 'markdown', content: '\nText2\n' },
      { type: 'a2ui', content: 'block2' },
    ]);

    const flushed = splitter.flush();
    expect(flushed).toEqual({ type: 'markdown', content: '\nText3' });
  });

  it('flush returns null when buffer is empty', () => {
    const splitter = new StreamSplitter();
    expect(splitter.flush()).toBeNull();
  });

  it('flush returns a2ui type when inside an unclosed block', () => {
    const splitter = new StreamSplitter();
    splitter.feed('```a2ui\nincomplete data');
    const flushed = splitter.flush();
    expect(flushed).toEqual({ type: 'a2ui', content: 'incomplete data' });
  });
});
