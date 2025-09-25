import { create } from 'zustand';
import { walletAPI, transactionsAPI, projectionsAPI } from '@/lib/api';

interface DashboardState {
  // State
  walletData: any | null;
  recentTransactions: any[];
  categoryBreakdown: any[];
  projections: any | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  
  // Actions
  fetchWalletData: () => Promise<void>;
  fetchRecentTransactions: (limit?: number) => Promise<void>;
  fetchCategoryBreakdown: () => Promise<void>;
  fetchProjections: () => Promise<void>;
  refreshAllData: () => Promise<void>;
  clearError: () => void;
  clearData: () => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Initial State
  walletData: null,
  recentTransactions: [],
  categoryBreakdown: [],
  projections: null,
  isLoading: false,
  error: null,
  lastFetched: null,

  // Clear error
  clearError: () => set({ error: null }),

  // Clear all data
  clearData: () => set({
    walletData: null,
    recentTransactions: [],
    categoryBreakdown: [],
    projections: null,
    error: null,
    lastFetched: null,
  }),

  // Fetch wallet data
  fetchWalletData: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await walletAPI.getWalletData();
      
      set({
        walletData: response,
        isLoading: false,
        lastFetched: Date.now(),
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Failed to fetch wallet data',
        isLoading: false,
      });
    }
  },

  // Fetch recent transactions
  fetchRecentTransactions: async (limit = 10) => {
    try {
      const response = await walletAPI.getRecentRoundup(limit);
      set({ recentTransactions: response.roundups || [] });
    } catch (error: any) {
      console.error('Failed to fetch recent transactions:', error);
    }
  },

  // Fetch category breakdown
  fetchCategoryBreakdown: async () => {
    try {
      const response = await walletAPI.getCategoryBreakdown();
      set({ categoryBreakdown: response.categories || [] });
    } catch (error: any) {
      console.error('Failed to fetch category breakdown:', error);
    }
  },

  // Fetch projections
  fetchProjections: async () => {
    try {
      const response = await projectionsAPI.getProjections();
      set({ projections: response });
    } catch (error: any) {
      console.error('Failed to fetch projections:', error);
    }
  },

  // Refresh all dashboard data
  refreshAllData: async () => {
    const { 
      fetchWalletData, 
      fetchRecentTransactions, 
      fetchCategoryBreakdown, 
      fetchProjections 
    } = get();
    
    await Promise.all([
      fetchWalletData(),
      fetchRecentTransactions(),
      fetchCategoryBreakdown(),
      fetchProjections(),
    ]);
  },
}));

// Selector hooks for better performance
export const useDashboardData = () => useDashboardStore((state) => ({
  walletData: state.walletData,
  recentTransactions: state.recentTransactions,
  categoryBreakdown: state.categoryBreakdown,
  projections: state.projections,
  isLoading: state.isLoading,
  error: state.error,
  lastFetched: state.lastFetched,
}));

export const useDashboardActions = () => useDashboardStore((state) => ({
  fetchWalletData: state.fetchWalletData,
  fetchRecentTransactions: state.fetchRecentTransactions,
  fetchCategoryBreakdown: state.fetchCategoryBreakdown,
  fetchProjections: state.fetchProjections,
  refreshAllData: state.refreshAllData,
  clearError: state.clearError,
  clearData: state.clearData,
}));