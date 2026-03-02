import { create } from 'zustand';
import { ApiClient } from '@/lib/api-client';

export interface StartupProfile {
  name: string;
  stage: string;
  description: string;
  target: string;
  competitiveEdge: string;
  fundingRaised: number;
  runway: number;
  currentMetrics: any;
}

export interface StrategicMemory {
  id: string;
  insight: string;
  memoryType: 'DECISION' | 'HYPOTHESIS' | 'FACT';
  isConfirmed: boolean;
  strategyWeight: number;
  evidenceScore: number;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
  priority: number;
  dueDate?: string;
}

interface StrategicState {
  profile: StartupProfile | null;
  confirmedStrategy: StrategicMemory[];
  emergingObservations: StrategicMemory[];
  tasks: Task[];
  loading: boolean;
  vaultProgress: number;
  isVaultUploading: boolean;

  // Actions
  fetchDashboardData: () => Promise<void>;
  updateVaultProgress: (progress: number, isUploading: boolean) => void;
  setProfile: (profile: StartupProfile) => void;
  setTasks: (tasks: Task[]) => void;
  addEmergingObservation: (insight: StrategicMemory) => void;
}

export const useStrategicStore = create<StrategicState>((set, get) => ({
  profile: null,
  confirmedStrategy: [],
  emergingObservations: [],
  tasks: [],
  loading: false,
  vaultProgress: 0,
  isVaultUploading: false,

  fetchDashboardData: async () => {
    set({ loading: true });
    try {
      const data = await ApiClient.get('/startup/dashboard');
      set({
        profile: data.profile,
        confirmedStrategy: data.ledger?.filter((m: any) => m.isConfirmed) || [],
        emergingObservations: data.ledger?.filter((m: any) => !m.isConfirmed) || [],
        tasks: data.tasks || [],
      });
    } catch (error) {
      console.error('Store: Failed to fetch dashboard data:', error);
    } finally {
      set({ loading: false });
    }
  },

  updateVaultProgress: (progress, isUploading) => {
    set({ vaultProgress: progress, isVaultUploading: isUploading });
  },

  setProfile: (profile) => set({ profile }),
  
  setTasks: (tasks) => set({ tasks }),

  addEmergingObservation: (insight) => {
    const exists = get().emergingObservations.some(m => m.id === insight.id);
    if (!exists) {
      set(state => ({
        emergingObservations: [insight, ...state.emergingObservations].slice(0, 10)
      }));
    }
  }
}));
