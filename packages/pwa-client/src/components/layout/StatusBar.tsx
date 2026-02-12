import { useConnectionStore } from '@/stores/connection';
import { formatLatency } from '@/utils/format';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export function StatusBar() {
  const { status, transport, latency, gatewayInfo } = useConnectionStore();

  if (status === 'disconnected') return null;

  const isReconnecting = status === 'reconnecting';

  return (
    <div
      className={cn(
        'flex h-7 items-center gap-3 border-t px-4 text-xs text-muted-foreground font-mono',
        isReconnecting
          ? 'bg-yellow-500/5 border-t-yellow-500/30'
          : 'bg-card/80 backdrop-blur-sm',
      )}
    >
      {transport && (
        <>
          <span>Transport: {transport.toUpperCase()}</span>
          <Separator orientation="vertical" className="h-3" />
        </>
      )}
      {latency !== null && (
        <>
          <span>Latency: {formatLatency(latency)}</span>
          <Separator orientation="vertical" className="h-3" />
        </>
      )}
      {gatewayInfo && (
        <span>
          Gateway: {gatewayInfo.name} v{gatewayInfo.version}
        </span>
      )}
      {isReconnecting && (
        <span className="ml-auto flex items-center gap-2 text-yellow-500">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
          Reconnecting...
        </span>
      )}
    </div>
  );
}
