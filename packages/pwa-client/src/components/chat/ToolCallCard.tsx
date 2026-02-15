import { useState, useEffect, useRef } from 'react';
import { Terminal, FileText, Code, ChevronRight, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import type { TurnSegment } from '@/stores/chat';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/utils/format';

type ToolCallSegment = Extract<TurnSegment, { type: 'tool_call' }>;

interface ToolCallCardProps {
  segment: ToolCallSegment;
}

const TOOL_ICONS: Record<string, typeof Terminal> = {
  bash: Terminal,
  execute: Terminal,
  read_file: FileText,
  write_file: FileText,
  edit: Code,
};

const MAX_OUTPUT_LENGTH = 120_000;

function truncateOutput(output: unknown): string {
  const str = typeof output === 'string' ? output : JSON.stringify(output, null, 2);
  if (str.length > MAX_OUTPUT_LENGTH) {
    return str.slice(0, MAX_OUTPUT_LENGTH) + '\n... (truncated)';
  }
  return str;
}

export function ToolCallCard({ segment }: ToolCallCardProps) {
  const { toolName, status, args, output, startedAt, completedAt, isError } = segment;
  const [isOpen, setIsOpen] = useState(status === 'running');
  const userToggled = useRef(false);
  const prevStatus = useRef(status);

  const Icon = TOOL_ICONS[toolName] ?? Terminal;
  const duration = completedAt ? completedAt - startedAt : status === 'running' ? Date.now() - startedAt : undefined;

  // Auto-expand/collapse logic
  useEffect(() => {
    if (userToggled.current) return;

    if (status === 'running') {
      setIsOpen(true);
    } else if (prevStatus.current === 'running' && status === 'success') {
      const timer = setTimeout(() => {
        if (!userToggled.current) setIsOpen(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
    // Error stays expanded
    if (status === 'error') {
      setIsOpen(true);
    }

    prevStatus.current = status;
  }, [status]);

  const handleToggle = () => {
    userToggled.current = true;
    setIsOpen((prev) => !prev);
  };

  const StatusIcon = status === 'running' ? Loader2
    : status === 'success' ? CheckCircle2
    : XCircle;

  return (
    <Collapsible open={isOpen} onOpenChange={handleToggle}>
      <div className={cn(
        'my-2 rounded-lg border text-sm',
        status === 'error' && 'border-l-4 border-l-red-500 border-red-500/30',
        status === 'running' && 'border-blue-500/30',
        status === 'success' && 'border-border',
      )}>
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors rounded-t-lg">
          <ChevronRight className={cn('h-3.5 w-3.5 transition-transform text-muted-foreground', isOpen && 'rotate-90')} />
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono text-xs font-medium flex-1 text-left truncate">{toolName}</span>
          <StatusIcon className={cn(
            'h-3.5 w-3.5',
            status === 'running' && 'text-blue-500 animate-spin',
            status === 'success' && 'text-green-500',
            status === 'error' && 'text-red-500',
          )} />
          {duration != null && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(duration)}
            </span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t px-3 py-2 space-y-2">
            {Object.keys(args).length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Arguments</p>
                <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">
                  {JSON.stringify(args, null, 2)}
                </pre>
              </div>
            )}
            {output != null && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">
                  {isError ? 'Error' : 'Output'}
                </p>
                <pre className={cn(
                  'text-xs rounded p-2 overflow-x-auto max-h-60 overflow-y-auto',
                  isError ? 'bg-red-500/5 text-red-400' : 'bg-muted/50',
                )}>
                  {truncateOutput(output)}
                </pre>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
