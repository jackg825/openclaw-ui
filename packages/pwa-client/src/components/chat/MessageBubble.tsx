import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageSquare, User } from 'lucide-react';
import type { Message } from '@/stores/chat';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/format';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex w-full gap-3 animate-slide-up',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-1">
          <MessageSquare className="h-3.5 w-3.5 text-primary" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2',
          isUser
            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
            : 'bg-card border',
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        <p
          className={cn(
            'mt-1 text-[10px]',
            isUser ? 'text-primary-foreground/60' : 'text-muted-foreground',
          )}
        >
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
