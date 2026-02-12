import { Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ConnectionStatus } from '@/components/connection/ConnectionStatus';

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Chat',
  '/connect': 'Connect',
  '/store': 'Store',
  '/cluster': 'Cluster',
  '/settings': 'Settings',
};

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { pathname } = useLocation();
  const baseRoute = '/' + (pathname.split('/')[1] ?? '');
  const label = ROUTE_LABELS[baseRoute] ?? ROUTE_LABELS[pathname];

  return (
    <header className="flex h-14 items-center border-b bg-card/50 backdrop-blur-sm px-4 gap-4">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Link to="/" className="flex items-center gap-0.5 font-bold text-lg tracking-tight">
        <span className="text-primary">Open</span>
        <span>Claw</span>
      </Link>
      {label && (
        <span className="text-sm text-muted-foreground">
          / {label}
        </span>
      )}
      <div className="flex-1" />
      <ConnectionStatus />
    </header>
  );
}
