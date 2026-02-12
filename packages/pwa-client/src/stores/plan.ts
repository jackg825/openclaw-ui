import { create } from 'zustand';

export interface PlanStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

interface PlanState {
  active: boolean;
  transcript: string;
  pendingPlan: PlanStep[] | null;
  isExecuting: boolean;

  setActive: (active: boolean) => void;
  setTranscript: (transcript: string) => void;
  setPendingPlan: (plan: PlanStep[] | null) => void;
  updateStepStatus: (stepId: string, status: PlanStep['status']) => void;
  setExecuting: (executing: boolean) => void;
  reset: () => void;
}

export const usePlanStore = create<PlanState>((set) => ({
  active: false,
  transcript: '',
  pendingPlan: null,
  isExecuting: false,

  setActive: (active) => set({ active }),
  setTranscript: (transcript) => set({ transcript }),
  setPendingPlan: (pendingPlan) => set({ pendingPlan }),
  updateStepStatus: (stepId, status) =>
    set((state) => ({
      pendingPlan: state.pendingPlan?.map((step) =>
        step.id === stepId ? { ...step, status } : step,
      ) ?? null,
    })),
  setExecuting: (isExecuting) => set({ isExecuting }),
  reset: () =>
    set({
      active: false,
      transcript: '',
      pendingPlan: null,
      isExecuting: false,
    }),
}));
