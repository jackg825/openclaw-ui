import type { A2UIMessage } from '@shared/a2ui';

export class A2UIParser {
  /** Parse a single JSONL line into a typed A2UI message */
  parseLine(line: string): A2UIMessage | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    try {
      const obj = JSON.parse(trimmed);
      if (obj.beginRendering) {
        return { type: 'beginRendering', ...obj.beginRendering };
      }
      if (obj.surfaceUpdate) {
        return { type: 'surfaceUpdate', ...obj.surfaceUpdate };
      }
      if (obj.dataModelUpdate) {
        return { type: 'dataModelUpdate', ...obj.dataModelUpdate };
      }
      if (obj.deleteSurface) {
        return { type: 'deleteSurface', ...obj.deleteSurface };
      }
      return null;
    } catch {
      return null;
    }
  }

  /** Parse multiple JSONL lines */
  parseBlock(block: string): A2UIMessage[] {
    return block
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => this.parseLine(line))
      .filter((msg): msg is A2UIMessage => msg !== null);
  }
}
