import { useState } from 'react';
import { Plug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { useConnectionStore } from '@/stores/connection';
import { useSettingsStore } from '@/stores/settings';

interface PairingDialogProps {
  onConnect: (signalingUrl: string, roomId: string) => void;
}

export function PairingDialog({ onConnect }: PairingDialogProps) {
  const defaultSignalingUrl = useSettingsStore((s) => s.defaultSignalingUrl);
  const defaultRoomId = useSettingsStore((s) => s.defaultRoomId);
  const { status, error } = useConnectionStore();

  const [signalingUrl, setSignalingUrl] = useState(defaultSignalingUrl);
  const [roomId, setRoomId] = useState(defaultRoomId);

  const isConnecting =
    status === 'signaling' ||
    status === 'connecting' ||
    status === 'authenticating';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signalingUrl.trim() || !roomId.trim()) return;
    onConnect(signalingUrl.trim(), roomId.trim());
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-5 w-5" />
          Connect to Gateway
        </CardTitle>
        <CardDescription>
          Enter the signaling server URL and room ID to connect to your
          OpenClaw gateway via WebRTC.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="signaling-url" className="text-sm font-medium">
              Signaling URL
            </label>
            <Input
              id="signaling-url"
              placeholder="https://signal.example.com"
              value={signalingUrl}
              onChange={(e) => setSignalingUrl(e.target.value)}
              disabled={isConnecting}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="room-id" className="text-sm font-medium">
              Room ID
            </label>
            <Input
              id="room-id"
              placeholder="my-room-id"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              disabled={isConnecting}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {isConnecting && (
            <p className="text-sm text-muted-foreground animate-pulse">
              {status === 'signaling' && 'Exchanging signaling data...'}
              {status === 'connecting' && 'Establishing WebRTC connection...'}
              {status === 'authenticating' && 'Authenticating with gateway...'}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={isConnecting || !signalingUrl.trim() || !roomId.trim()}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
