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
  onConnect: (signalingUrl: string, codeOrRoomId: string) => void;
  resolving?: boolean;
}

/** Pairing code format: XXXX-XXXX (alphanumeric, uppercase) */
const PAIRING_CODE_RE = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

function formatPairingInput(raw: string): string {
  // Strip non-alphanumeric, uppercase, auto-insert hyphen after 4 chars
  const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
  if (clean.length > 4) {
    return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  }
  return clean;
}

export function PairingDialog({ onConnect, resolving }: PairingDialogProps) {
  const defaultSignalingUrl = useSettingsStore((s) => s.defaultSignalingUrl);
  const { status, error } = useConnectionStore();

  const [signalingUrl, setSignalingUrl] = useState(defaultSignalingUrl);
  const [code, setCode] = useState('');

  const isConnecting =
    resolving ||
    status === 'signaling' ||
    status === 'connecting' ||
    status === 'authenticating';

  const isPairingCode = PAIRING_CODE_RE.test(code);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signalingUrl.trim() || !code.trim()) return;
    onConnect(signalingUrl.trim(), code.trim());
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-5 w-5" />
          Connect to Gateway
        </CardTitle>
        <CardDescription>
          Enter the signaling server URL and the pairing code shown by your
          sidecar to connect via WebRTC.
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
            <label htmlFor="pairing-code" className="text-sm font-medium">
              Pairing Code
            </label>
            <Input
              id="pairing-code"
              placeholder="XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(formatPairingInput(e.target.value))}
              disabled={isConnecting}
              className="font-mono text-lg tracking-widest"
              maxLength={9}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              {isPairingCode
                ? 'Pairing code detected'
                : code
                  ? 'Enter the 8-character code (e.g. GH9H-FT8Q)'
                  : 'Shown in your sidecar terminal after startup'}
            </p>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {isConnecting && (
            <p className="text-sm text-muted-foreground animate-pulse">
              {resolving && 'Resolving pairing code...'}
              {!resolving && status === 'signaling' && 'Exchanging signaling data...'}
              {!resolving && status === 'connecting' && 'Establishing WebRTC connection...'}
              {!resolving && status === 'authenticating' && 'Authenticating with gateway...'}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={isConnecting || !signalingUrl.trim() || !code.trim()}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
