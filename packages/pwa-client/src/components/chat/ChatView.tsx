import { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plug, ArrowDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { MessageBubble } from './MessageBubble';
import { InputBar } from './InputBar';
import { ApprovalBanner } from './ApprovalBanner';
import { TokenCounter } from './TokenCounter';
import { useChatStore } from '@/stores/chat';
import { useConnectionStore } from '@/stores/connection';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface ChatViewProps {
  onSend: (message: string) => void;
  onAbort?: () => void;
}

export function ChatView({ onSend, onAbort }: ChatViewProps) {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const status = useConnectionStore((s) => s.status);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewReplies, setShowNewReplies] = useState(false);

  // IntersectionObserver: track whether sentinel (bottom) is visible
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsAtBottom(visible);
        if (visible) setShowNewReplies(false);
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Auto-scroll when new content arrives and user is at bottom
  useEffect(() => {
    if (isAtBottom) {
      sentinelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } else if (isStreaming) {
      // User scrolled up during streaming — show FAB
      setShowNewReplies(true);
    }
  }, [messages, isStreaming, isAtBottom]);

  const scrollToBottom = useCallback(() => {
    sentinelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    setShowNewReplies(false);
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onAbortRun: onAbort,
  });

  return (
    <div className="flex h-full flex-col">
      <ApprovalBanner />
      <ScrollArea className="flex-1 p-4">
        <div ref={scrollContainerRef} className="flex flex-col gap-4">
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
          {/* Sentinel div for IntersectionObserver */}
          <div ref={sentinelRef} className="h-1" aria-hidden />
        </div>
      </ScrollArea>

      {/* Floating "New replies" button when user scrolled up */}
      {showNewReplies && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full shadow-lg gap-1.5"
            onClick={scrollToBottom}
          >
            <ArrowDown className="h-3.5 w-3.5" />
            New replies
          </Button>
        </div>
      )}

      <TokenCounter usage={messages.length > 0 ? messages[messages.length - 1].usage : undefined} />
      <InputBar onSend={onSend} />
    </div>
  );
}
