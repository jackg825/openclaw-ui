import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageSquare, User, AlertCircle } from 'lucide-react';
import type { Message, TurnSegment } from '@/stores/chat';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/format';
import { ToolCallCard } from './ToolCallCard';
import { ThinkingBlock } from './ThinkingBlock';

interface MessageBubbleProps {
  message: Message;
  showThinking?: boolean;
}

function SegmentRenderer({ segment, showThinking }: { segment: TurnSegment; showThinking?: boolean }) {
  switch (segment.type) {
    case 'thinking':
      if (!showThinking) return null;
      return <ThinkingBlock content={segment.content} isStreaming={segment.isStreaming} />;

    case 'text':
      return (
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {segment.content}
          </ReactMarkdown>
        </div>
      );

    case 'tool_call':
      return <ToolCallCard segment={segment} />;

    case 'error':
      return (
        <div className="my-2 flex items-start gap-2 rounded-lg border border-red-500/50 bg-red-500/5 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{segment.message}</p>
        </div>
      );
  }
}

export function MessageBubble({ message, showThinking = true }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex w-full gap-3 animate-slide-up', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-1">
          <MessageSquare className="h-3.5 w-3.5 text-primary" />
        </div>
      )}
      <div className={cn(
        'rounded-2xl px-4 py-2',
        isUser
          ? 'max-w-[85%] bg-primary text-primary-foreground shadow-md shadow-primary/20'
          : 'max-w-[85%] md:max-w-[85%] bg-card border',
      )}>
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : message.segments && message.segments.length > 0 ? (
          <div className="space-y-1">
            {message.segments.map((segment, idx) => (
              <SegmentRenderer key={idx} segment={segment} showThinking={showThinking} />
            ))}
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        <p className={cn(
          'mt-1 text-[10px]',
          isUser ? 'text-primary-foreground/60' : 'text-muted-foreground',
        )}>
          {formatDate(message.timestamp)}
        </p>
      </div>
      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary mt-1">
          <User className="h-3.5 w-3.5 text-secondary-foreground" />
        </div>
      )}
    </div>
  );
}
