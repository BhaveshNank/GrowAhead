import { create } from 'zustand'
import { createJSONStorage, devtools, persist } from 'zustand/middleware'
import { authAPI, transactionsAPI, walletAPI, projectionsAPI } from './api'
import type { 
  User, 
  Transaction, 
  WalletData, 
  WalletStats, 
  CategoryData, 
  ProjectionData 
} from './api'

// Types for store state
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  _hasHydrated: boolean
  isDemoMode: boolean
}

interface DashboardState {
  walletData: WalletData | null
  walletStats: WalletStats | null
  recentTransactions: Transaction[]
  categories: CategoryData[]
  projections: ProjectionData | null
  isLoading: boolean
  error: string | null
}

interface TransactionsState {
  transactions: Transaction[]
  pagination: {
    page: number
    limit: number
    totalPages: number
    totalTransactions: number
  } | null
  isLoading: boolean
  error: string | null
}

// Auth actions
interface AuthActions {
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, riskProfile?: string) => Promise<void>
  logout: () => void
  getCurrentUser: () => Promise<void>
  updateProfile: (updates: Partial<Pick<User, 'name' | 'riskProfile'>>) => Promise<void>
  clearError: () => void
  setHasHydrated: () => void
  demoLogin: () => void
}

// Dashboard actions
interface DashboardActions {
  loadDashboardData: () => Promise<void>
  refreshWalletData: () => Promise<void>
  clearError: () => void
}

// Transactions actions
interface TransactionsActions {
  loadTransactions: (params?: any) => Promise<void>
  addTransaction: (transaction: any) => Promise<void>
  uploadTransactions: (file: File) => Promise<void>
  clearError: () => void
}

// Combined store type
type Store = AuthState & AuthActions & DashboardState & DashboardActions & TransactionsState & TransactionsActions

// Create a safe localStorage wrapper for SSR
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(key, value)
    } catch {
      // ignore
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }
}

const useStore = create<Store>()(
  devtools(
    persist(
      (set, get) => ({
        // Auth state
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        _hasHydrated: false,
        isDemoMode: false,

        // Dashboard state
        walletData: null,
        walletStats: null,
        recentTransactions: [],
        categories: [],
        projections: null,

        // Transactions state
        transactions: [],
        pagination: null,

        // Set hydration flag
        setHasHydrated: () => set({ _hasHydrated: true }),

        // Simple demo login function
        demoLogin: () => {
          set({
            user: { 
              id: 1, 
              name: 'Demo User', 
              email: 'demo@growahead.com', 
              riskProfile: 'balanced' 
            } as User,
            isAuthenticated: true,
            isDemoMode: true,
            error: null
          })
          safeLocalStorage.setItem('growahead_token', 'demo-token')
          safeLocalStorage.setItem('growahead_demo', 'true')
        },

        // Auth actions
        login: async (email: string, password: string) => {
          const currentState = get()
          if (currentState.isLoading) return
          
          set({ isLoading: true, error: null })
          try {
            const response = await authAPI.login(email, password)
            set({ 
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
              isDemoMode: false
            })
          } catch (error: any) {
            set({ 
              error: error.response?.data?.message || 'Login failed',
              isLoading: false 
            })
            throw error
          }
        },

        register: async (name: string, email: string, password: string, riskProfile = 'balanced') => {
          const currentState = get()
          if (currentState.isLoading) return
          
          set({ isLoading: true, error: null })
          try {
            const response = await authAPI.register(name, email, password, riskProfile)
            set({ 
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
              isDemoMode: false
            })
          } catch (error: any) {
            set({ 
              error: error.response?.data?.message || 'Registration failed',
              isLoading: false 
            })
            throw error
          }
        },

        logout: () => {
          authAPI.logout()
          set({ 
            user: null,
            isAuthenticated: false,
            isDemoMode: false,
            walletData: null,
            walletStats: null,
            recentTransactions: [],
            categories: [],
            projections: null,
            transactions: [],
            pagination: null
          })
          safeLocalStorage.removeItem('growahead_token')
          safeLocalStorage.removeItem('growahead_demo')
        },

        getCurrentUser: async () => {
          const currentState = get()
          if (currentState.isLoading) return
          
          // Check if we're in demo mode
          const isDemoMode = safeLocalStorage.getItem('growahead_demo') === 'true'
          const token = safeLocalStorage.getItem('growahead_token')
          
          if (isDemoMode && token === 'demo-token') {
            // Set demo user directly
            set({
              user: { 
                id: 1, 
                name: 'Demo User', 
                email: 'demo@growahead.com', 
                riskProfile: 'balanced' 
              } as User,
              isAuthenticated: true,
              isDemoMode: true,
              isLoading: false
            })
            return
          }
          
          set({ isLoading: true })
          try {
            const response = await authAPI.getCurrentUser()
            set({ 
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
              isDemoMode: false
            })
          } catch (error: any) {
            set({ 
              isAuthenticated: false,
              isLoading: false,
              isDemoMode: false
            })
          }
        },

        updateProfile: async (updates) => {
          const currentState = get()
          if (currentState.isLoading) return
          
          set({ isLoading: true, error: null })
          try {
            const response = await authAPI.updateProfile(updates)
            set({ 
              user: response.user,
              isLoading: false 
            })
          } catch (error: any) {
            set({ 
              error: error.response?.data?.message || 'Profile update failed',
              isLoading: false 
            })
            throw error
          }
        },

        // Dashboard actions
        loadDashboardData: async () => {
          const currentState = get()
          if (currentState.isLoading) return
          
          // If in demo mode, set some basic demo data
          if (currentState.isDemoMode) {
            set({
              walletStats: {
                stats: {
                  totalSaved: 1247.85,
                  avgRoundup: 0.67,
                  totalTransactions: 156
                },
                monthlyTrend: [
                  { month: '2024-01', savings: 127.45 },
                  { month: '2023-12', savings: 98.23 }
                ]
              } as WalletStats,
              recentTransactions: [
                {
                  id: 1,
                  merchant: 'Starbucks Coffee',
                  amount: 4.75,
                  roundupAmount: 0.25,
                  category: 'Food & Dining'
                },
                {
                  id: 2,
                  merchant: 'Target Store',
                  amount: 23.67,
                  roundupAmount: 0.33,
                  category: 'Shopping'
                }
              ] as Transaction[],
              categories: [
                {
                  category: 'Food & Dining',
                  totalRoundups: 45.67,
                  transactionCount: 23
                },
                {
                  category: 'Shopping',
                  totalRoundups: 78.23,
                  transactionCount: 34
                }
              ] as CategoryData[],
              projections: {
                currentProfile: {
                  name: 'balanced',
                  returnRate: 8.0,
                  currentBalance: 1247.85,
                  avgMonthlyContribution: 85.67
                },
                projections: {
                  oneYear: 2156.78,
                  threeYears: 4234.56,
                  fiveYears: 7890.12,
                  tenYears: 18456.34
                }
              } as ProjectionData,
              isLoading: false
            })
            return
          }
          
          set({ isLoading: true, error: null })
          try {
            const [walletData, walletStats, recentTransactions, categories, projections] = await Promise.all([
              walletAPI.getWalletData(),
              walletAPI.getWalletStats(),
              walletAPI.getRecentRoundup(5),
              walletAPI.getCategoryBreakdown(),
              projectionsAPI.getProjections()
            ])

            set({
              walletData,
              walletStats,
              recentTransactions: recentTransactions.roundups || [],
              categories: categories.categories || [],
              projections,
              isLoading: false
            })
          } catch (error: any) {
            set({ 
              error: error.response?.data?.message || 'Failed to load dashboard data',
              isLoading: false 
            })
          }
        },

        refreshWalletData: async () => {
          const currentState = get()
          
          // If in demo mode, don't make API calls
          if (currentState.isDemoMode) {
            return
          }
          
          try {
            const walletData = await walletAPI.getWalletData()
            set({ walletData })
          } catch (error: any) {
            set({ error: error.response?.data?.message || 'Failed to refresh wallet data' })
          }
        },

        // Transactions actions
        loadTransactions: async (params = {}) => {
          set({ isLoading: true, error: null })
          try {
            const response = await transactionsAPI.getTransactions(params)
            set({
              transactions: response.transactions,
              pagination: response.pagination,
              isLoading: false
            })
          } catch (error: any) {
            set({ 
              error: error.response?.data?.message || 'Failed to load transactions',
              isLoading: false 
            })
          }
        },

        addTransaction: async (transaction) => {
          set({ isLoading: true, error: null })
          try {
            await transactionsAPI.addTransaction(transaction)
            // Refresh both transactions and dashboard data
            const actions = get()
            await Promise.all([
              actions.loadTransactions(),
              actions.loadDashboardData()
            ])
            set({ isLoading: false })
          } catch (error: any) {
            set({ 
              error: error.response?.data?.message || 'Failed to add transaction',
              isLoading: false 
            })
            throw error
          }
        },

        uploadTransactions: async (file: File) => {
          set({ isLoading: true, error: null })
          try {
            const response = await transactionsAPI.uploadTransactions(file)
            // Refresh both transactions and dashboard data
            const actions = get()
            await Promise.all([
              actions.loadTransactions(),
              actions.loadDashboardData()
            ])
            set({ isLoading: false })
            return response
          } catch (error: any) {
            set({ 
              error: error.response?.data?.message || 'Failed to upload transactions',
              isLoading: false 
            })
            throw error
          }
        },

        clearError: () => set({ error: null }),
      }),
      {
        name: 'growahead-store',
        storage: createJSONStorage(() => safeLocalStorage),
        partialize: (state) => ({ 
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          isDemoMode: state.isDemoMode
        }),
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated?.()
        },
        skipHydration: typeof window === 'undefined',
      }
    )
  )
)

// Create stable selector hooks that don't cause re-renders
export const useAuth = () => {
  const user = useStore((state) => state.user)
  const isAuthenticated = useStore((state) => state.isAuthenticated)
  const isLoading = useStore((state) => state.isLoading)
  const error = useStore((state) => state.error)
  const hasHydrated = useStore((state) => state._hasHydrated)
  const isDemoMode = useStore((state) => state.isDemoMode)
  const login = useStore((state) => state.login)
  const register = useStore((state) => state.register)
  const logout = useStore((state) => state.logout)
  const getCurrentUser = useStore((state) => state.getCurrentUser)
  const updateProfile = useStore((state) => state.updateProfile)
  const clearError = useStore((state) => state.clearError)
  const demoLogin = useStore((state) => state.demoLogin)

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    hasHydrated,
    isDemoMode,
    login,
    register,
    logout,
    getCurrentUser,
    updateProfile,
    clearError,
    demoLogin,
  }
}

export const useDashboard = () => {
  const walletData = useStore((state) => state.walletData)
  const walletStats = useStore((state) => state.walletStats)
  const recentTransactions = useStore((state) => state.recentTransactions)
  const categories = useStore((state) => state.categories)
  const projections = useStore((state) => state.projections)
  const isLoading = useStore((state) => state.isLoading)
  const error = useStore((state) => state.error)
  const loadDashboardData = useStore((state) => state.loadDashboardData)
  const refreshWalletData = useStore((state) => state.refreshWalletData)
  const clearError = useStore((state) => state.clearError)

  return {
    walletData,
    walletStats,
    recentTransactions,
    categories,
    projections,
    isLoading,
    error,
    loadDashboardData,
    refreshWalletData,
    clearError,
  }
}

export const useTransactions = () => {
  const transactions = useStore((state) => state.transactions)
  const pagination = useStore((state) => state.pagination)
  const isLoading = useStore((state) => state.isLoading)
  const error = useStore((state) => state.error)
  const loadTransactions = useStore((state) => state.loadTransactions)
  const addTransaction = useStore((state) => state.addTransaction)
  const uploadTransactions = useStore((state) => state.uploadTransactions)
  const clearError = useStore((state) => state.clearError)

  return {
    transactions,
    pagination,
    isLoading,
    error,
    loadTransactions,
    addTransaction,
    uploadTransactions,
    clearError,
  }
}

export default useStore