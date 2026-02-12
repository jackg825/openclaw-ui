import { useState, useCallback, useRef, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { Send, Plug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConnectionStore } from '@/stores/connection';

interface InputBarProps {
  onSend: (message: string) => void;
}

export function InputBar({ onSend }: InputBarProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const status = useConnectionStore((s) => s.status);
  const isDisabled = status !== 'connected';

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
    textareaRef.current?.focus();
  }, [value, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  if (isDisabled) {
    return (
      <div className="px-4 pb-4 pt-2">
        <Button
          variant="outline"
          className="w-full justify-center gap-2 rounded-xl border-dashed py-6"
          asChild
        >
          <Link to="/connect">
            <Plug className="h-4 w-4" />
            Connect to a gateway to start chatting
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="flex items-end gap-2 rounded-xl border bg-card p-3 shadow-lg shadow-black/10 ring-1 ring-border/50 transition-all focus-within:ring-primary/50 focus-within:border-primary/30">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Ctrl+Enter to send)"
          className="flex-1 resize-none bg-transparent px-1 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none min-h-[40px] max-h-[160px]"
          rows={1}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!value.trim()}
          aria-label="Send message"
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
