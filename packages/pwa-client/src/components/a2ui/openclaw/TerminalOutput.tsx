import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { resolveBindings } from '@/lib/a2ui/adapter';
import type { WidgetProps } from '../registry';

export function TerminalOutput({ component, dataModel }: WidgetProps) {
  const props = resolveBindings(component, dataModel);
  const content = (props.content as string) ?? '';
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      disableStdin: true,
      convertEol: true,
      rows: 15,
      theme: {
        background: '#1e1e1e',
      },
    });
    terminal.open(containerRef.current);
    terminalRef.current = terminal;

    return () => {
      terminal.dispose();
      terminalRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (terminalRef.current && content) {
      terminalRef.current.clear();
      terminalRef.current.write(content);
    }
  }, [content]);

  return (
    <div
      ref={containerRef}
      className="rounded-lg border overflow-hidden"
      style={{ height: 300 }}
    />
  );
}
