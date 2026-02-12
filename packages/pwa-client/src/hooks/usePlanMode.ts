import { useCallback } from 'react';
import { usePlanStore, type PlanStep } from '@/stores/plan';

interface UsePlanModeReturn {
  active: boolean;
  transcript: string;
  pendingPlan: PlanStep[] | null;
  isExecuting: boolean;
  activate: () => void;
  deactivate: () => void;
  setTranscript: (text: string) => void;
  approvePlan: () => void;
  rejectPlan: () => void;
}

export function usePlanMode(): UsePlanModeReturn {
  const store = usePlanStore();

  const activate = useCallback(() => {
    store.setActive(true);
  }, [store]);

  const deactivate = useCallback(() => {
    store.reset();
  }, [store]);

  const setTranscript = useCallback(
    (text: string) => {
      store.setTranscript(text);
    },
    [store],
  );

  const approvePlan = useCallback(() => {
    if (!store.pendingPlan) return;
    store.setExecuting(true);
    // Will send the approved plan to the agent via protocol
  }, [store]);

  const rejectPlan = useCallback(() => {
    store.setPendingPlan(null);
    store.setTranscript('');
  }, [store]);

  return {
    active: store.active,
    transcript: store.transcript,
    pendingPlan: store.pendingPlan,
    isExecuting: store.isExecuting,
    activate,
    deactivate,
    setTranscript,
    approvePlan,
    rejectPlan,
  };
}
