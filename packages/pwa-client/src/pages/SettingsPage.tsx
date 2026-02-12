import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore, type Theme } from '@/stores/settings';

export function SettingsPage() {
  const {
    theme,
    setTheme,
    defaultSignalingUrl,
    setDefaultSignalingUrl,
    defaultRoomId,
    setDefaultRoomId,
    voiceEnabled,
    setVoiceEnabled,
    voiceProvider,
    setVoiceProvider,
  } = useSettingsStore();

  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your OpenClaw client preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Customize the look and feel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Theme</label>
            <div className="flex gap-2">
              {(['dark', 'light', 'system'] as Theme[]).map((t) => (
                <Button
                  key={t}
                  variant={theme === t ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connection</CardTitle>
          <CardDescription>Default connection settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="default-url" className="text-sm font-medium">
              Default Signaling URL
            </label>
            <Input
              id="default-url"
              placeholder="https://signal.example.com"
              value={defaultSignalingUrl}
              onChange={(e) => setDefaultSignalingUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="default-room" className="text-sm font-medium">
              Default Room ID
            </label>
            <Input
              id="default-room"
              placeholder="my-room-id"
              value={defaultRoomId}
              onChange={(e) => setDefaultRoomId(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Voice</CardTitle>
          <CardDescription>Speech-to-text configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Voice Input</label>
            <Button
              variant={voiceEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
            >
              {voiceEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
          <Separator />
          <div className="space-y-2">
            <label className="text-sm font-medium">STT Provider</label>
            <div className="flex gap-2">
              <Button
                variant={voiceProvider === 'web-speech' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVoiceProvider('web-speech')}
              >
                Web Speech (Free)
              </Button>
              <Button
                variant={voiceProvider === 'deepgram' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVoiceProvider('deepgram')}
              >
                Deepgram (Pro)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
