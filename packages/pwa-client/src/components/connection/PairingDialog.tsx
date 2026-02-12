import { useState, useRef, useCallback, Fragment } from 'react';
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
const CODE_LENGTH = 8;

function formatCode(chars: string[]): string {
  const joined = chars.join('');
  if (joined.length > 4) return `${joined.slice(0, 4)}-${joined.slice(4)}`;
  return joined;
}

function isComplete(chars: string[]): boolean {
  return chars.every((c) => c !== '') && chars.length === CODE_LENGTH;
}

// --- Segmented OTP-style pairing code input ---

function PairingCodeInput({
  value,
  onChange,
  disabled,
  onComplete,
}: {
  value: string;
  onChange: (formatted: string) => void;
  disabled?: boolean;
  onComplete?: () => void;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Parse "XXXX-XXXX" or raw string into 8-char array
  const chars = value
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .split('')
    .concat(Array(CODE_LENGTH).fill(''))
    .slice(0, CODE_LENGTH);

  const emit = useCallback(
    (next: string[]) => {
      onChange(formatCode(next));
      if (isComplete(next)) onComplete?.();
    },
    [onChange, onComplete],
  );

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!raw) {
      const next = [...chars];
      next[index] = '';
      emit(next);
      return;
    }
    // Take last char (handles overwrite when field is selected)
    const char = raw.slice(-1);
    const next = [...chars];
    next[index] = char;
    emit(next);

    // Auto-advance
    if (index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!chars[index] && index > 0) {
        // Empty box — move back and clear previous
        const next = [...chars];
        next[index - 1] = '';
        emit(next);
        inputRefs.current[index - 1]?.focus();
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .slice(0, CODE_LENGTH);
    const next = pasted
      .split('')
      .concat(Array(CODE_LENGTH).fill(''))
      .slice(0, CODE_LENGTH);
    emit(next);
    // Focus last filled box or the next empty one
    const focusIdx = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-1.5" onPaste={handlePaste}>
      {chars.map((char, i) => (
        <Fragment key={i}>
          {i === 4 && (
            <span className="text-xl font-bold text-muted-foreground select-none mx-0.5">
              –
            </span>
          )}
          <input
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="text"
            maxLength={2}
            value={char}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            aria-label={`Pairing code digit ${i + 1}`}
            autoComplete="off"
            spellCheck={false}
            className="w-10 h-12 text-center font-mono text-lg uppercase rounded-md border border-input bg-background
              focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-shadow"
          />
        </Fragment>
      ))}
    </div>
  );
}

// --- Main dialog ---

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

  const codeComplete = isComplete(
    code
      .replace(/[^A-Za-z0-9]/g, '')
      .split('')
      .concat(Array(CODE_LENGTH).fill(''))
      .slice(0, CODE_LENGTH),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signalingUrl.trim() || !codeComplete) return;
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
            <label className="text-sm font-medium">Pairing Code</label>
            <PairingCodeInput
              value={code}
              onChange={setCode}
              disabled={isConnecting}
            />
            <p className="text-xs text-muted-foreground text-center">
              {codeComplete
                ? 'Ready to connect'
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
            disabled={isConnecting || !signalingUrl.trim() || !codeComplete}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
