import { lazy, Suspense } from 'react';
import { resolveBindings } from '@/lib/a2ui/adapter';
import type { WidgetProps } from '../registry';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

export function CodeBlock({ component, dataModel }: WidgetProps) {
  const props = resolveBindings(component, dataModel);
  const language = (props.language as string) ?? 'typescript';
  const value = (props.value as string) ?? '';
  const filename = props.filename as string | undefined;

  return (
    <div className="rounded-lg border overflow-hidden">
      {filename && (
        <div className="px-3 py-1.5 bg-muted text-xs font-mono border-b">
          {filename}
        </div>
      )}
      <Suspense
        fallback={
          <pre className="p-4 font-mono text-sm overflow-auto">{value}</pre>
        }
      >
        <MonacoEditor
          height="auto"
          language={language}
          value={value}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
          }}
        />
      </Suspense>
    </div>
  );
}
