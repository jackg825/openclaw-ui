import { useEffect, useState } from 'react';
import { Smartphone, Monitor, Tablet, HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

const AUTH_WORKER_URL = import.meta.env.VITE_AUTH_WORKER_URL;

interface DeviceInfo {
  deviceToken: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  lastSeen: string;
  registeredAt: string;
}

const DEVICE_ICONS = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  unknown: HelpCircle,
} as const;

export function DeviceList() {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionToken) return;

    fetch(`${AUTH_WORKER_URL}/devices`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setDevices(data.devices || []))
      .catch(() => setDevices([]))
      .finally(() => setLoading(false));
  }, [sessionToken]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading devices...</p>;
  }

  if (devices.length === 0) {
    return <p className="text-sm text-muted-foreground">No registered devices</p>;
  }

  return (
    <div className="space-y-3">
      {devices.map((device) => {
        const Icon = DEVICE_ICONS[device.type];
        return (
          <div
            key={device.deviceToken}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{device.name}</p>
              <p className="text-xs text-muted-foreground">
                Last seen: {new Date(device.lastSeen).toLocaleDateString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
