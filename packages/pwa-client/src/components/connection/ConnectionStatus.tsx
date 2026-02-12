import { useConnectionStore, type ConnectionStatus as Status } from '@/stores/connection';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<Status, { color: string; label: string }> = {
  disconnected: { color: 'bg-gray-500', label: 'Disconnected' },
  pairing: { color: 'bg-purple-500 animate-pulse', label: 'Pairing' },
  signaling: { color: 'bg-blue-500 animate-pulse', label: 'Signaling' },
  connecting: { color: 'bg-blue-500 animate-pulse', label: 'Connecting' },
  authenticating: { color: 'bg-yellow-500 animate-pulse', label: 'Authenticating' },
  connected: { color: 'bg-green-500', label: 'Connected' },
  reconnecting: { color: 'bg-yellow-500 animate-pulse', label: 'Reconnecting' },
  failed: { color: 'bg-red-500', label: 'Failed' },
};

export function ConnectionStatus() {
  const status = useConnectionStore((s) => s.status);
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={cn('h-2 w-2 rounded-full', config.color)}
        aria-hidden="true"
      />
      <span className="text-muted-foreground">{config.label}</span>
    </div>
  );
}
