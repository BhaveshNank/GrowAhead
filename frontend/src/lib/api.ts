// src/lib/api.ts - Updated with email verification functions
import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Helper function to get token from Zustand store or localStorage
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    // First try the direct localStorage key (used by authAPI methods)
    let token = localStorage.getItem('growahead_token');
    
    if (!token) {
      // If not found, try getting it from the Zustand persisted store
      const authStore = localStorage.getItem('growahead-auth-storage');
      if (authStore) {
        const parsed = JSON.parse(authStore);
        token = parsed?.state?.token || null;
      }
    }
    
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('🔐 Adding auth token to request:', config.url);
  } else {
    console.warn('🔐 No auth token found for request:', config.url);
  }
  
  return config;
});

// Handle token expiration - just clear token, let AuthWrapper handle the UI
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('🔐 API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data
    });

    if (error.response?.status === 401) {
      console.warn('🔐 Unauthorized - clearing tokens');
      
      if (typeof window !== 'undefined') {
        // Clear both token storage locations
        localStorage.removeItem('growahead_token');
        
        // Also clear the Zustand store auth data
        const authStore = localStorage.getItem('growahead-auth-storage');
        if (authStore) {
          try {
            const parsed = JSON.parse(authStore);
            if (parsed?.state) {
              parsed.state.token = null;
              parsed.state.isAuthenticated = false;
              parsed.state.user = null;
              localStorage.setItem('growahead-auth-storage', JSON.stringify(parsed));
            }
          } catch (e) {
            console.error('Error clearing auth store:', e);
            localStorage.removeItem('growahead-auth-storage');
          }
        }
      }
    }
    
    return Promise.reject(error);
  }
)

// Type definitions for API responses
export interface User {
  id: number
  name: string
  email: string
  riskProfile: 'conservative' | 'balanced' | 'aggressive'
  emailVerified?: boolean  // Added for email verification
  createdAt: string
}

export interface Transaction {
  id: number
  merchant: string
  merchantName?: string  // Alternative field name
  name?: string          // Another alternative field name
  amount: number
  category?: string
  transactionDate: string
  roundupAmount?: number
  createdAt: string
  updatedAt?: string
}

export interface WalletData {
  totalBalance: number
  lastUpdated: string
}

export interface CategoryData {
  category: string
  transactionCount: number
  totalRoundups: number
  avgRoundup: number
}

export interface ProjectionData {
  currentProfile: {
    name: string
    returnRate: number
    currentBalance: number
    avgMonthlyContribution: number
  }
  projections: {
    oneYear: number
    threeYears: number
    fiveYears: number
    tenYears: number
  }
  comparisonProfiles: Array<{
    name: string
    returnRate: number
    description: string
    projections: {
      oneYear: number
      threeYears: number
      fiveYears: number
      tenYears: number
    }
  }>
}

export interface WalletStats {
  stats: {
    totalTransactions: number
    totalRoundups: number
    totalSaved: number
    avgRoundup: number
    maxRoundup: number
    firstRoundupDate?: string
  }
  monthlyTrend: Array<{
    month: string
    savings: number
  }>
}

// Authentication API
export const authAPI = {
  login: async (email: string, password: string) => {
  console.log('🔐 Attempting login for:', email);
  
  const response = await api.post('/auth/login', { email, password });
  
  if (response.data.token) {
    console.log('🔐 Login successful, storing token');
    
    // Store in both locations for compatibility
    localStorage.setItem('growahead_token', response.data.token);
    
    // Also update the Zustand store directly if it exists
    const authStore = localStorage.getItem('growahead-auth-storage');
    if (authStore) {
      try {
        const parsed = JSON.parse(authStore);
        if (parsed?.state) {
          parsed.state.token = response.data.token;
          parsed.state.isAuthenticated = true;
          parsed.state.user = response.data.user;
          localStorage.setItem('growahead-auth-storage', JSON.stringify(parsed));
        }
      } catch (e) {
        console.error('Error syncing token to auth store:', e);
      }
    }
  }
  
  return response.data;
},

  register: async (name: string, email: string, password: string, riskProfile: string = 'balanced') => {
    // Note: This now returns registration data, not necessarily auth tokens
    const response = await api.post('/auth/register', { 
      name, 
      email, 
      password, 
      riskProfile 
    })
    // Only set token if one is returned (shouldn't happen with email verification flow)
    if (response.data.token) {
      localStorage.setItem('growahead_token', response.data.token)
    }
    return response.data
  },

  // Verify email with OTP
  verifyEmail: async (email: string, otp: string) => {
  console.log('🔐 Verifying email with OTP');
  
  const response = await api.post('/auth/verify-email', { email, otp });
  
  if (response.data.token) {
    console.log('🔐 Email verification successful, storing token');
    
    // Store in both locations
    localStorage.setItem('growahead_token', response.data.token);
    
    // Sync with Zustand store
    const authStore = localStorage.getItem('growahead-auth-storage');
    if (authStore) {
      try {
        const parsed = JSON.parse(authStore);
        if (parsed?.state) {
          parsed.state.token = response.data.token;
          parsed.state.isAuthenticated = true;
          parsed.state.user = response.data.user;
          localStorage.setItem('growahead-auth-storage', JSON.stringify(parsed));
        }
      } catch (e) {
        console.error('Error syncing token after email verification:', e);
      }
    }
  }
  
  return response.data;
},

  // Resend verification OTP
  resendVerification: async (email: string) => {
    const response = await api.post('/auth/resend-verification', { email })
    return response.data
  },

  getCurrentUser: async (): Promise<{ user: User }> => {
    const response = await api.get('/auth/me')
    return response.data
  },

  updateProfile: async (updates: Partial<Pick<User, 'name' | 'riskProfile'>>) => {
    const response = await api.put('/auth/profile', updates)
    return response.data
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
  console.log('🔐 Attempting password change'); // ADD THIS LINE
  
  const response = await api.put('/auth/password', { 
    currentPassword, 
    newPassword 
  })
  
  console.log('🔐 Password change successful'); // ADD THIS LINE
  return response.data
},
  
  deleteAccount: async (password: string) => {
  console.log('🔐 Attempting account deletion'); // ADD THIS LINE
  
  const response = await api.delete('/auth/account', { 
    data: { password } 
  })
  
  console.log('🔐 Account deletion successful'); // ADD THIS LINE
  return response.data
},

  logout: () => {
  console.log('🔐 Logging out - clearing all tokens');
  
  // Clear both token storage locations
  localStorage.removeItem('growahead_token');
  localStorage.removeItem('growahead-auth-storage');
}
} // ← Correct closing brace for authAPI


// Transactions API
export const transactionsAPI = {
  getTransactions: async (params?: {
    page?: number
    limit?: number
    category?: string
    startDate?: string
    endDate?: string
  }): Promise<{
    transactions: Transaction[]
    pagination: {
      page: number
      limit: number
      totalPages: number
      totalTransactions: number
    }
  }> => {
    const response = await api.get('/transactions', { params })
    return response.data
  },

  addTransaction: async (transaction: {
    merchant: string
    amount: number
    category?: string
    transactionDate: string
  }) => {
    const payload = {
      merchant: transaction.merchant,
      amount: transaction.amount,
      category: transaction.category,
      transactionDate: transaction.transactionDate
    }

    const response = await api.post('/transactions', payload)
    return response.data
  },

  uploadTransactions: async (file: File) => {
    const formData = new FormData()
    formData.append('csvFile', file)
    
    const response = await api.post('/transactions/upload-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Update/Edit transaction
  updateTransaction: async (id: number, transaction: {
    merchant: string
    amount: number
    category?: string
    transactionDate: string
  }) => {
    const response = await api.put(`/transactions/${id}`, transaction)
    return response.data
  },

  // Delete transaction
  deleteTransaction: async (id: number) => {
    const response = await api.delete(`/transactions/${id}`)
    return response.data
  },

  // Get single transaction by ID
  getTransaction: async (id: number): Promise<{ transaction: Transaction }> => {
    const response = await api.get(`/transactions/${id}`)
    return response.data
  }
}

// Wallet API
export const walletAPI = {
  getWalletData: async (): Promise<WalletData> => {
    const response = await api.get('/wallet/summary')
    return response.data
  },

  getWalletSummary: async () => {
    const response = await api.get('/wallet/summary')
    return response.data
  },

  getWalletStats: async (): Promise<WalletStats> => {
    const response = await api.get('/wallet/stats')
    return response.data
  },

  getWalletHistory: async (period: '7d' | '30d' | '90d' | '1y' = '30d') => {
    const response = await api.get('/wallet/history', { params: { period } })
    return response.data
  },

  getRecentRoundup: async (limit: number = 10) => {
    const response = await api.get('/wallet/roundups', { params: { limit } })
    
    // Debug what we're getting back
    console.log('📊 RECENT ROUNDUPS API RESPONSE:', response.data)
    
    return response.data
  },

  getCategoryBreakdown: async (): Promise<{ categories: CategoryData[] }> => {
    const response = await api.get('/wallet/categories')
    return response.data
  }
}

// Projections API
export const projectionsAPI = {
  getProjections: async (): Promise<ProjectionData> => {
    const response = await api.get('/projections')
    return response.data
  },

  getCustomProjection: async (params: {
    currentBalance: number
    monthlyContribution: number
    annualReturnRate: number
    timeHorizonYears: number
  }) => {
    const response = await api.post('/projections/custom', params)
    return response.data
  },

  getGoals: async () => {
    const response = await api.get('/projections/goals')
    return response.data
  },

  getGoalTimeline: async (targetAmount: number, includeInterest: boolean = true) => {
    const response = await api.post('/projections/goal-timeline', {
      targetAmount,
      includeInterest
    })
    return response.data
  }
}

// Health check function for testing
export const healthCheck = async () => {
  try {
    const response = await api.get('/health')
    return response.data
  } catch (error) {
    console.error('Health check failed:', error)
    throw error
  }
}

// Add a debug function to check token status
export const debugAuthToken = () => {
  if (typeof window === 'undefined') return 'SSR - no window';
  
  const directToken = localStorage.getItem('growahead_token');
  const authStore = localStorage.getItem('growahead-auth-storage');
  let storeToken = null;
  
  if (authStore) {
    try {
      const parsed = JSON.parse(authStore);
      storeToken = parsed?.state?.token;
    } catch (e) {
      console.error('Error parsing auth store:', e);
    }
  }
  
  console.log('🔐 TOKEN DEBUG:', {
    directToken: directToken ? `${directToken.substring(0, 20)}...` : 'null',
    storeToken: storeToken ? `${storeToken.substring(0, 20)}...` : 'null',
    tokensMatch: directToken === storeToken
  });
  
  return { directToken, storeToken, tokensMatch: directToken === storeToken };
};


export default api