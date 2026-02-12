import { useConnectionStore } from '@/stores/connection';
import { formatLatency } from '@/utils/format';
import { Separator } from '@/components/ui/separator';

export function StatusBar() {
  const { status, transport, latency, gatewayInfo } = useConnectionStore();

  if (status === 'disconnected') return null;

  return (
    <div className="flex h-7 items-center gap-3 border-t bg-muted/50 px-4 text-xs text-muted-foreground">
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
      {status === 'reconnecting' && (
        <span className="ml-auto text-yellow-500">Reconnecting...</span>
      )}
    </div>
  );
}
