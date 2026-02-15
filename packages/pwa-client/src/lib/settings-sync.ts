let syncTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_DEBOUNCE_MS = 2000;

interface SyncableSettings {
  theme: string;
  defaultSignalingUrl: string;
  defaultRoomId: string;
  voiceEnabled: boolean;
  voiceProvider: string;
  deepgramApiKey: string | null;
  updatedAt?: string;
}

export async function pullSettings(
  workerUrl: string,
  sessionToken: string,
): Promise<SyncableSettings | null> {
  const res = await fetch(`${workerUrl}/settings`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export function pushSettings(
  workerUrl: string,
  sessionToken: string,
  settings: SyncableSettings,
): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      await fetch(`${workerUrl}/settings`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...settings,
          updatedAt: new Date().toISOString(),
        }),
      });
    } catch {
      console.warn('[settings-sync] Push failed, will retry on next change');
    }
  }, SYNC_DEBOUNCE_MS);
}
