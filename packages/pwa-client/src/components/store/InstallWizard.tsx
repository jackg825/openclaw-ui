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
import type { CatalogEntry } from '@shared/store';

type WizardStep = 'review' | 'permissions' | 'configure' | 'activate';

const STEPS: WizardStep[] = ['review', 'permissions', 'configure', 'activate'];

interface InstallWizardProps {
  skill: CatalogEntry;
  open: boolean;
  onClose: () => void;
  onInstall: (slug: string, config: Record<string, string>) => void;
}

function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
              i <= current
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-6 ${i < current ? 'bg-primary' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export function InstallWizard({ skill, open, onClose, onInstall }: InstallWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [installing, setInstalling] = useState(false);

  const currentStep = STEPS[stepIndex];

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  };

  const handleInstall = () => {
    setInstalling(true);
    onInstall(skill.slug, config);
  };

  const handleClose = () => {
    setStepIndex(0);
    setConfig({});
    setInstalling(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Install {skill.name}</DialogTitle>
          <StepIndicator current={stepIndex} steps={STEPS} />
        </DialogHeader>

        <div className="min-h-[200px] py-4">
          {currentStep === 'review' && (
            <div className="space-y-3">
              <p className="text-sm">{skill.description}</p>
              <div className="text-sm text-muted-foreground">
                <p>Author: {skill.author}</p>
                <p>Version: {skill.version}</p>
                <p>Category: {skill.category}</p>
              </div>
            </div>
          )}

          {currentStep === 'permissions' && (
            <div className="space-y-3">
              <p className="text-sm font-medium">This skill requires the following permissions:</p>
              {skill.permissions?.length ? (
                <ul className="space-y-1.5">
                  {skill.permissions.map((perm) => (
                    <li key={perm} className="flex items-center gap-2 text-sm">
                      <span className="text-yellow-500">&#9888;</span>
                      {perm}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No special permissions required.</p>
              )}
            </div>
          )}

          {currentStep === 'configure' && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Configuration (optional)</p>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">API Key</label>
                <Input
                  placeholder="Enter API key if required..."
                  value={config.apiKey ?? ''}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                />
              </div>
            </div>
          )}

          {currentStep === 'activate' && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Ready to install</p>
              <p className="text-sm text-muted-foreground">
                {skill.name} v{skill.version} will be installed and activated on your gateway.
              </p>
              {installing && (
                <p className="text-sm text-blue-500">Installing...</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {stepIndex > 0 && (
            <Button variant="outline" onClick={handleBack} disabled={installing}>
              Back
            </Button>
          )}
          {stepIndex < STEPS.length - 1 ? (
            <Button onClick={handleNext}>Next</Button>
          ) : (
            <Button onClick={handleInstall} disabled={installing}>
              {installing ? 'Installing...' : 'Install & Activate'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
