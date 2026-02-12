export type StreamSegment =
  | { type: 'markdown'; content: string }
  | { type: 'a2ui'; content: string };

/**
 * Split a streaming agent response into markdown and A2UI segments.
 * A2UI blocks are delimited by ```a2ui\n ... \n``` fence markers.
 */
export class StreamSplitter {
  private buffer = '';
  private inA2UIBlock = false;

  /** Feed new text chunk, returns any complete segments */
  feed(chunk: string): StreamSegment[] {
    this.buffer += chunk;
    const segments: StreamSegment[] = [];

    while (true) {
      if (!this.inA2UIBlock) {
        const fenceStart = this.buffer.indexOf('```a2ui\n');
        if (fenceStart === -1) break;
        if (fenceStart > 0) {
          segments.push({ type: 'markdown', content: this.buffer.slice(0, fenceStart) });
        }
        this.buffer = this.buffer.slice(fenceStart + 8); // Skip ```a2ui\n
        this.inA2UIBlock = true;
      }

      if (this.inA2UIBlock) {
        const fenceEnd = this.buffer.indexOf('\n```');
        if (fenceEnd === -1) break;
        segments.push({ type: 'a2ui', content: this.buffer.slice(0, fenceEnd) });
        this.buffer = this.buffer.slice(fenceEnd + 4); // Skip \n```
        this.inA2UIBlock = false;
      }
    }

    return segments;
  }

  /** Flush remaining buffer content */
  flush(): StreamSegment | null {
    if (this.buffer.length > 0) {
      const content = this.buffer;
      this.buffer = '';
      return { type: this.inA2UIBlock ? 'a2ui' : 'markdown', content };
    }
    return null;
  }
}
