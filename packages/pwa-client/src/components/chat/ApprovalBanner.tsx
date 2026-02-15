import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ApprovalBannerProps {
  toolName?: string;
  description?: string;
  onApprove?: () => void;
  onDeny?: () => void;
}

export function ApprovalBanner({ toolName, description, onApprove, onDeny }: ApprovalBannerProps) {
  // Don't render if no pending approval
  if (!toolName) return null;

  return (
    <div
      role="alertdialog"
      aria-label={`Approve ${toolName}`}
      className="mx-4 mb-2 flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 shadow-lg"
    >
      <ShieldAlert className="h-5 w-5 text-yellow-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{toolName}</p>
        {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" variant="outline" onClick={onDeny} className="h-8">
          Deny
        </Button>
        <Button size="sm" onClick={onApprove} className="h-8">
          Approve
        </Button>
      </div>
    </div>
  );
}
