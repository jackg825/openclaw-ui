import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plug } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { MessageBubble } from './MessageBubble';
import { InputBar } from './InputBar';
import { useChatStore } from '@/stores/chat';
import { useConnectionStore } from '@/stores/connection';

interface ChatViewProps {
  onSend: (message: string) => void;
}

export function ChatView({ onSend }: ChatViewProps) {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const status = useConnectionStore((s) => s.status);
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
            <div className="flex flex-1 flex-col items-center justify-center py-20 animate-fade-in">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Welcome to OpenClaw</h2>
              <p className="text-muted-foreground text-sm text-center max-w-sm mb-6">
                Connect to your AI agent gateway and start a conversation.
              </p>
              {status !== 'connected' && (
                <Button asChild>
                  <Link to="/connect">
                    <Plug className="mr-2 h-4 w-4" />
                    Connect to Gateway
                  </Link>
                </Button>
              )}
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isStreaming && (
            <div className="flex justify-start">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="rounded-2xl bg-card border px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <InputBar onSend={onSend} />
    </div>
  );
}
