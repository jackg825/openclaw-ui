import { useState, useEffect, useCallback, useRef } from 'react';
import { Copy, Check, Loader2, Terminal, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSettingsStore } from '@/stores/settings';
import { useConnectionStore } from '@/stores/connection';
import { createRoom, checkRoomStatus } from '@/lib/webrtc/pairing';

interface OnboardingWizardProps {
  onPaired: (roomId: string) => void;
}

type Step = 1 | 2 | 3;

function detectPlatform(): 'macos' | 'linux' | 'windows' {
  const platform = navigator.platform?.toLowerCase() ?? '';
  if (platform.includes('mac')) return 'macos';
  if (platform.includes('win')) return 'windows';
  return 'linux';
}

const INSTALL_COMMANDS: Record<ReturnType<typeof detectPlatform>, string> = {
  macos: 'curl -fsSL https://get.openclaw.dev/sidecar | bash',
  linux: 'curl -fsSL https://get.openclaw.dev/sidecar | bash',
  windows: 'irm https://get.openclaw.dev/sidecar.ps1 | iex',
};

function useCountdown(expiresAt: string | null): string {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!expiresAt) {
      setRemaining('');
      return;
    }

    function update() {
      const diff = new Date(expiresAt!).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('Expired');
        return;
      }
      const mins = Math.floor(diff / 60_000);
      const secs = Math.floor((diff % 60_000) / 1000);
      setRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
    }

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return remaining;
}

export function OnboardingWizard({ onPaired }: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const pollingRef = useRef(false);
  const signalingUrl = useSettingsStore((s) => s.defaultSignalingUrl);
  const setConnectionStatus = useConnectionStore((s) => s.setStatus);
  const setStorePairingCode = useConnectionStore((s) => s.setPairingCode);
  const setStorePairingExpiresAt = useConnectionStore((s) => s.setPairingExpiresAt);

  const countdown = useCountdown(expiresAt);

  const platform = detectPlatform();
  const installCmd = INSTALL_COMMANDS[platform];

  const copyToClipboard = useCallback(async (text: string, type: 'install' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'install') {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
    } catch {
      // Clipboard API may not be available
    }
  }, []);

  // Create room when entering step 2
  useEffect(() => {
    if (step !== 2) return;
    if (roomId) return; // Already created

    let cancelled = false;
    setError(null);
    setConnectionStatus('pairing');

    async function init() {
      try {
        const session = await createRoom(signalingUrl);
        if (cancelled) return;
        setRoomId(session.roomId);
        setPairingCode(session.pairingCode);
        setExpiresAt(session.expiresAt);
        setStorePairingCode(session.pairingCode);
        setStorePairingExpiresAt(session.expiresAt);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to create room');
      }
    }

    init();
    return () => { cancelled = true; };
  }, [step, roomId, signalingUrl, setConnectionStatus, setStorePairingCode, setStorePairingExpiresAt]);

  // Poll room status when we have a roomId in step 2
  useEffect(() => {
    if (step !== 2 || !roomId) return;

    pollingRef.current = true;

    async function poll() {
      while (pollingRef.current) {
        try {
          const status = await checkRoomStatus(signalingUrl, roomId!);
          if (!pollingRef.current) return;
          if (status.hasSidecar) {
            pollingRef.current = false;
            setStep(3);
            onPaired(roomId!);
            return;
          }
        } catch {
          // Ignore polling errors
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    poll();
    return () => { pollingRef.current = false; };
  }, [step, roomId, signalingUrl, onPaired]);

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Connect to OpenClaw
          </CardTitle>
          <div className="flex gap-1">
            {([1, 2, 3] as const).map((s) => (
              <Badge
                key={s}
                variant={s === step ? 'default' : s < step ? 'secondary' : 'outline'}
                className="text-xs"
              >
                {s}
              </Badge>
            ))}
          </div>
        </div>
        <CardDescription>
          {step === 1 && 'Install the sidecar proxy on your gateway machine'}
          {step === 2 && 'Pair this browser with your sidecar'}
          {step === 3 && 'Establishing secure connection...'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {step === 1 && (
          <>
            <p className="text-sm text-muted-foreground">
              The sidecar proxy bridges your browser to the OpenClaw gateway via WebSocket relay.
              Run this command on the machine where OpenClaw is running:
            </p>
            <div className="flex items-center gap-2 rounded-md bg-muted p-3 font-mono text-sm">
              <Terminal className="h-4 w-4 shrink-0 text-muted-foreground" />
              <code className="flex-1 break-all">{installCmd}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => copyToClipboard(installCmd, 'install')}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Badge variant="outline" className="text-xs">
              {platform === 'macos' ? 'macOS' : platform === 'windows' ? 'Windows' : 'Linux'}
              {' detected'}
            </Badge>
          </>
        )}

        {step === 2 && (
          <>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!pairingCode && !error && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {pairingCode && (
              <>
                <p className="text-sm text-muted-foreground">
                  Start your sidecar with this pairing code, or enter it when prompted:
                </p>
                <div className="flex items-center justify-center gap-3 rounded-md bg-muted p-6">
                  <span className="font-mono text-3xl font-bold tracking-widest">
                    {pairingCode}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(pairingCode, 'code')}
                  >
                    {copiedCode ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Expires in {countdown}</span>
                  <span className="animate-pulse">Waiting for sidecar...</span>
                </div>
                <div className="rounded-md bg-muted p-3 font-mono text-xs">
                  <span className="text-muted-foreground">$ </span>
                  openclaw-sidecar --room-id {pairingCode}
                </div>
              </>
            )}
          </>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse">
              Establishing secure connection...
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        {step === 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(2)}
            >
              I already have the sidecar installed
            </Button>
            <Button onClick={() => setStep(2)}>
              Next
            </Button>
          </>
        )}
        {step === 2 && (
          <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
            Back
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
