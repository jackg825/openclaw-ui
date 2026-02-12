import { Link } from 'react-router-dom';
import { Plug } from 'lucide-react';
import { ChatView } from '@/components/chat/ChatView';
import { Button } from '@/components/ui/button';
import { useConnectionStore } from '@/stores/connection';
import { useOpenClaw } from '@/hooks/useOpenClaw';

export function ChatPage() {
  const status = useConnectionStore((s) => s.status);
  const { sendMessage } = useOpenClaw();

  return (
    <div className="flex h-full flex-col">
      {status === 'disconnected' && (
        <div className="flex items-center gap-3 border-b bg-muted/50 px-4 py-2">
          <Plug className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Not connected to a gateway.
          </span>
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <Link to="/connect">Connect now</Link>
          </Button>
        </div>
      )}
      <div className="flex-1">
        <ChatView onSend={sendMessage} />
      </div>
    </div>
  );
}
