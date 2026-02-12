import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { ChatView } from '@/components/chat/ChatView';
import { useConnectionStore } from '@/stores/connection';
import { useOpenClaw } from '@/hooks/useOpenClaw';

export function ChatPage() {
  const status = useConnectionStore((s) => s.status);
  const { sendMessage } = useOpenClaw();

  return (
    <div className="flex h-full flex-col">
      {status === 'disconnected' && (
        <div className="flex items-center gap-3 border-b border-yellow-500/20 bg-yellow-500/5 px-4 py-2 animate-fade-in">
          <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-500" />
          <span className="text-sm text-muted-foreground">
            Not connected to a gateway.
          </span>
          <Link
            to="/connect"
            className="text-sm font-medium text-primary hover:underline"
          >
            Connect now
          </Link>
        </div>
      )}
      <div className="flex-1">
        <ChatView onSend={sendMessage} />
      </div>
    </div>
  );
}
