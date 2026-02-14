import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const AUTH_WORKER_URL = import.meta.env.VITE_AUTH_WORKER_URL;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, error, setSession, setLoading, setError } =
    useAuthStore();

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname || '/connect';

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  const handleCredentialResponse = useCallback(
    async (response: google.accounts.id.CredentialResponse) => {
      setLoading(true);
      try {
        const userToken = useSettingsStore.getState().userToken;
        const res = await fetch(`${AUTH_WORKER_URL}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken: response.credential,
            userToken: userToken || undefined,
            deviceName: navigator.userAgent.slice(0, 64),
            deviceType: /mobile|android|iphone|ipad/i.test(navigator.userAgent)
              ? 'mobile'
              : 'desktop',
          }),
        });

        if (!res.ok) throw new Error('Authentication failed');

        const data = await res.json();
        setSession(data.user, data.sessionToken, data.expiresAt);

        // Sync settings from server
        if (data.settings) {
          useSettingsStore.getState().mergeFromServer(data.settings);
        }

        // Store userToken and stableRoomId for reconnection
        if (data.userToken) {
          useSettingsStore.getState().setUserToken(data.userToken);
        }
        if (data.stableRoomId) {
          useSettingsStore.getState().setStableRoomId(data.stableRoomId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Login failed');
      }
    },
    [setSession, setLoading, setError],
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      const isStandalone = window.matchMedia(
        '(display-mode: standalone)',
      ).matches;

      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: true,
        cancel_on_tap_outside: false,
        ux_mode: isStandalone ? 'redirect' : 'popup',
        login_uri: isStandalone
          ? `${AUTH_WORKER_URL}/auth/google/callback`
          : undefined,
      });

      const buttonDiv = document.getElementById('google-signin-button');
      if (buttonDiv) {
        google.accounts.id.renderButton(buttonDiv, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'signin_with',
          shape: 'rectangular',
        });
      }

      google.accounts.id.prompt();
    };
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [handleCredentialResponse]);

  return (
    <div className="flex h-dvh items-center justify-center bg-gradient-to-b from-primary/5 to-transparent p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <span className="text-3xl font-bold tracking-tight">
              <span className="text-primary">Open</span>Claw
            </span>
          </div>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>
            Sign in to connect to your AI agent gateway
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <div id="google-signin-button" />
          )}
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
