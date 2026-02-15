import { useState } from 'react';
import { Brain, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ThinkingBlockProps {
  content: string;
  isStreaming: boolean;
}

export function ThinkingBlock({ content, isStreaming }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(isStreaming);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="my-2 border-l-2 border-purple-500/40">
        <CollapsibleTrigger className="flex items-center gap-1.5 px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left">
          <ChevronRight className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-90')} />
          <Brain className="h-3 w-3 text-purple-500/60" />
          <span className="italic">Thinking{isStreaming ? '...' : ''}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className={cn('px-3 pb-2', isStreaming && 'animate-pulse')}>
            <p className="text-xs text-muted-foreground italic whitespace-pre-wrap leading-relaxed">
              {content}
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
