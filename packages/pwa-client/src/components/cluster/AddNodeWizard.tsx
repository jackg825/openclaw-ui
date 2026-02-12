import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AddNodeWizardProps {
  open: boolean;
  onClose: () => void;
  onAdd: (config: { name: string; signalingUrl: string; roomId: string }) => void;
}

export function AddNodeWizard({ open, onClose, onAdd }: AddNodeWizardProps) {
  const [name, setName] = useState('');
  const [signalingUrl, setSignalingUrl] = useState('');
  const [roomId, setRoomId] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult('idle');
    try {
      const response = await fetch(`${signalingUrl}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, peerId: 'test', role: 'client' }),
      });
      setTestResult(response.ok ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  const handleAdd = () => {
    onAdd({ name, signalingUrl, roomId });
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setSignalingUrl('');
    setRoomId('');
    setTestResult('idle');
    onClose();
  };

  const isValid = name.trim() && signalingUrl.trim() && roomId.trim();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Node</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Node Name</label>
            <Input
              placeholder="e.g., Home Server"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Signaling URL</label>
            <Input
              placeholder="https://signaling.example.com"
              value={signalingUrl}
              onChange={(e) => setSignalingUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Room ID</label>
            <Input
              placeholder="my-room-id"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={!signalingUrl || !roomId || testing}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
            {testResult === 'success' && (
              <span className="text-sm text-green-500">Connection OK</span>
            )}
            {testResult === 'error' && (
              <span className="text-sm text-red-500">Connection failed</span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!isValid}>
            Save & Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
