import { Settings, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ConnectionStatus } from '@/components/connection/ConnectionStatus';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  return (
    <header className="flex h-14 items-center border-b px-4 gap-4">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Link to="/" className="font-bold text-lg tracking-tight">
        OpenClaw
      </Link>
      <div className="flex-1" />
      <ConnectionStatus />
      <Button variant="ghost" size="icon" asChild>
        <Link to="/settings" aria-label="Settings">
          <Settings className="h-5 w-5" />
        </Link>
      </Button>
    </header>
  );
}
