import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { InputBar } from './InputBar';
import { useChatStore } from '@/stores/chat';

interface ChatViewProps {
  onSend: (message: string) => void;
}

export function ChatView({ onSend }: ChatViewProps) {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 p-4">
        <div ref={scrollRef} className="flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="flex flex-1 items-center justify-center py-20">
              <p className="text-muted-foreground text-sm">
                No messages yet. Start a conversation.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isStreaming && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-card border px-4 py-2">
                <span className="text-sm text-muted-foreground animate-pulse">
                  Thinking...
                </span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <InputBar onSend={onSend} />
    </div>
  );
}
