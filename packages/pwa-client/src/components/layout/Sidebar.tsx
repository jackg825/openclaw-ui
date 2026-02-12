import { NavLink } from 'react-router-dom';
import {
  MessageSquare,
  Plug,
  Store,
  Server,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConnectionStore } from '@/stores/connection';

const MAIN_NAV = [
  { to: '/', icon: MessageSquare, label: 'Chat' },
  { to: '/connect', icon: Plug, label: 'Connect' },
  { to: '/store', icon: Store, label: 'Store' },
  { to: '/cluster', icon: Server, label: 'Cluster' },
] as const;

const BOTTOM_NAV = [
  { to: '/settings', icon: Settings, label: 'Settings' },
] as const;

const STATUS_DOT: Record<string, string> = {
  connected: 'bg-green-500',
  connecting: 'bg-yellow-500 animate-pulse',
  authenticating: 'bg-yellow-500 animate-pulse',
  signaling: 'bg-yellow-500 animate-pulse',
  reconnecting: 'bg-yellow-500 animate-pulse',
  disconnected: 'bg-muted-foreground/40',
  failed: 'bg-red-500',
};

const STATUS_LABEL: Record<string, string> = {
  connected: 'Connected',
  connecting: 'Connecting...',
  authenticating: 'Authenticating...',
  signaling: 'Signaling...',
  reconnecting: 'Reconnecting...',
  disconnected: 'Disconnected',
  failed: 'Failed',
};

interface SidebarProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ collapsed, onNavigate }: SidebarProps) {
  const status = useConnectionStore((s) => s.status);

  return (
    <nav className="flex h-full flex-col p-3">
      <div className="flex flex-col gap-1">
        {MAIN_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground border-l-2 border-primary'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span
              className={cn(
                'transition-all duration-200',
                collapsed && 'w-0 overflow-hidden opacity-0',
              )}
            >
              {label}
            </span>
          </NavLink>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        {/* Connection status indicator */}
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-muted-foreground',
            collapsed && 'justify-center',
          )}
        >
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              STATUS_DOT[status] ?? 'bg-muted-foreground/40',
            )}
          />
          <span
            className={cn(
              'transition-all duration-200',
              collapsed && 'w-0 overflow-hidden opacity-0',
            )}
          >
            {STATUS_LABEL[status] ?? status}
          </span>
        </div>

        <div className="border-t pt-2">
          {BOTTOM_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground border-l-2 border-primary'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span
                className={cn(
                  'transition-all duration-200',
                  collapsed && 'w-0 overflow-hidden opacity-0',
                )}
              >
                {label}
              </span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
