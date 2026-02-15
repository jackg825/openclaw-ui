import { Zap } from 'lucide-react';
import type { TokenUsage } from '@shared/openclaw-protocol';

interface TokenCounterProps {
  usage?: TokenUsage;
}

function formatTokens(n?: number): string {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function TokenCounter({ usage }: TokenCounterProps) {
  if (!usage) return null;

  const total = (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 text-[10px] text-muted-foreground border-t bg-background/50">
      <Zap className="h-3 w-3" />
      <span>In: {formatTokens(usage.inputTokens)}</span>
      <span>Out: {formatTokens(usage.outputTokens)}</span>
      {usage.cacheReadTokens ? <span>Cache: {formatTokens(usage.cacheReadTokens)}</span> : null}
      {usage.cost != null ? <span>${usage.cost.toFixed(4)}</span> : null}
    </div>
  );
}
