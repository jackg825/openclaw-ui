import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OnboardingWizard } from '@/components/connection/OnboardingWizard';
import { PairingDialog } from '@/components/connection/PairingDialog';
import { useOpenClaw } from '@/hooks/useOpenClaw';
import { useConnectionStore } from '@/stores/connection';
import { useSettingsStore } from '@/stores/settings';
import { reconnect, resolveCode, registerDevice } from '@/lib/webrtc/pairing';
import { Loader2, Settings } from 'lucide-react';

type Mode = 'loading' | 'wizard' | 'manual';

/** Pairing code format: XXXX-XXXX (alphanumeric, uppercase) */
const PAIRING_CODE_RE = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export function ConnectPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { connect, sendDeviceRegistration } = useOpenClaw();
  const status = useConnectionStore((s) => s.status);
  const error = useConnectionStore((s) => s.error);
  const setError = useConnectionStore((s) => s.setError);

  const signalingUrl = useSettingsStore((s) => s.defaultSignalingUrl);
  const userToken = useSettingsStore((s) => s.userToken);
  const setUserToken = useSettingsStore((s) => s.setUserToken);
  const setStableRoomId = useSettingsStore((s) => s.setStableRoomId);

  const [mode, setMode] = useState<Mode>(() => {
    if (userToken) return 'loading';
    if (searchParams.get('code')) return 'loading';
    return 'wizard';
  });
  const [autoReconnectAttempted, setAutoReconnectAttempted] = useState(false);
  const [resolving, setResolving] = useState(false);

  // Navigate to chat on successful connection
  useEffect(() => {
    if (status === 'connected') {
      navigate('/');
    }
  }, [status, navigate]);

  // Fall back to wizard when connection fails
  useEffect(() => {
    if (status === 'failed' && mode === 'loading') {
      setMode('wizard');
    }
  }, [status, mode]);

  // Auto-reconnect with existing userToken
  useEffect(() => {
    if (autoReconnectAttempted) return;
    if (!userToken || mode !== 'loading') return;

    setAutoReconnectAttempted(true);

    async function tryReconnect() {
      try {
        const result = await reconnect(signalingUrl, userToken!, 'user');
        setStableRoomId(result.stableRoomId);
        connect(signalingUrl, result.stableRoomId);
      } catch {
        // Token invalid or expired - clear and fall through to wizard
        setUserToken(null);
        setStableRoomId(null);
        setMode('wizard');
      }
    }

    tryReconnect();
  }, [userToken, mode, autoReconnectAttempted, signalingUrl, connect, setUserToken, setStableRoomId]);

  // Handle ?code= URL parameter (sidecar URL sign-in)
  useEffect(() => {
    const code = searchParams.get('code');
    if (!code || userToken) return;
    if (mode !== 'loading') return;

    async function handleCode() {
      try {
        const { roomId } = await resolveCode(signalingUrl, code!);
        connect(signalingUrl, roomId);

        // Register device and send token to sidecar via DataChannel
        try {
          const reg = await registerDevice(signalingUrl, roomId);
          setUserToken(reg.userToken);
          setStableRoomId(reg.stableRoomId);
          sendDeviceRegistration(reg.deviceToken, reg.stableRoomId);
        } catch {
          // Registration is optional - connection still works
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to resolve pairing code');
        setMode('wizard');
      }
    }

    handleCode();
  }, [searchParams, userToken, mode, signalingUrl, connect, setUserToken, setStableRoomId, setError]);

  // Handle paired event from wizard
  const handlePaired = async (roomId: string) => {
    connect(signalingUrl, roomId);

    try {
      const reg = await registerDevice(signalingUrl, roomId);
      setUserToken(reg.userToken);
      setStableRoomId(reg.stableRoomId);
      sendDeviceRegistration(reg.deviceToken, reg.stableRoomId);
    } catch {
      // Registration is optional
    }
  };

  // Manual connect — resolves pairing code if needed, then connects
  const handleManualConnect = useCallback(async (url: string, codeOrRoomId: string) => {
    let roomId = codeOrRoomId;

    // Detect pairing code format and resolve to room ID
    if (PAIRING_CODE_RE.test(codeOrRoomId)) {
      setResolving(true);
      try {
        const result = await resolveCode(url, codeOrRoomId);
        roomId = result.roomId;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to resolve pairing code');
        setResolving(false);
        return;
      }
      setResolving(false);
    }

    connect(url, roomId);

    // Register device for token-based reconnection
    try {
      const reg = await registerDevice(url, roomId);
      setUserToken(reg.userToken);
      setStableRoomId(reg.stableRoomId);
      sendDeviceRegistration(reg.deviceToken, reg.stableRoomId);
    } catch {
      // Registration is optional — connection still works
    }
  }, [connect, setError, setUserToken, setStableRoomId, sendDeviceRegistration]);

  if (mode === 'loading') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-4 bg-gradient-to-b from-primary/5 to-transparent">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Connecting to your gateway...
        </p>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {mode === 'wizard' && (
          <>
            <OnboardingWizard onPaired={handlePaired} />
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <button
                className="underline hover:text-foreground"
                onClick={() => setMode('manual')}
              >
                Manual connect
              </button>
              <button
                className="flex items-center gap-1 underline hover:text-foreground"
                onClick={() => navigate('/settings')}
              >
                <Settings className="h-3 w-3" />
                Settings
              </button>
            </div>
          </>
        )}
        {mode === 'manual' && (
          <>
            <PairingDialog onConnect={handleManualConnect} resolving={resolving} />
            <div className="text-center">
              <button
                className="text-sm text-muted-foreground underline hover:text-foreground"
                onClick={() => setMode('wizard')}
              >
                Back to setup wizard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
