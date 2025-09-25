import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authAPI, type User } from '@/lib/api';

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean;
  
  // NEW: Email verification state
  pendingVerification: {
    email: string;
    userId: number;
    name: string;
  } | null;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<{ needsVerification: boolean; email?: string }>;
  verifyEmail: (email: string, otp: string) => Promise<boolean>;
  resendVerification: (email: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  clearPendingVerification: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  checkAuthStatus: () => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  riskProfile?: 'conservative' | 'balanced' | 'aggressive';
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      _hasHydrated: false,
      pendingVerification: null,

      // Set hydration status
      setHasHydrated: (hasHydrated: boolean) => {
        set({ _hasHydrated: hasHydrated });
      },

      // Clear error messages
      clearError: () => set({ error: null }),

      // Clear pending verification
      clearPendingVerification: () => set({ pendingVerification: null }),

      // Login with real API
      login: async (email: string, password: string): Promise<boolean> => {
        set({ isLoading: true, error: null });

        try {
          const response = await authAPI.login(email, password);
          
          if (response.token && response.user) {
            set({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              pendingVerification: null,
            });
            return true;
          } else if (response.error === 'Email not verified') {
            // Handle unverified email on login
            set({
              pendingVerification: {
                email: email,
                userId: 0, // We don't have userId from login error
                name: 'User'
              },
              error: null,
              isLoading: false,
            });
            return false;
          } else {
            set({
              error: response.error || response.message || 'Login failed',
              isLoading: false,
            });
            return false;
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Login failed';
          
          // Check if it's an email verification error
          if (error.response?.data?.action === 'verify_email') {
            set({
              pendingVerification: {
                email: error.response.data.email || email,
                userId: 0,
                name: 'User'
              },
              error: null,
              isLoading: false,
            });
          } else {
            set({
              error: errorMessage,
              isLoading: false,
            });
          }
          return false;
        }
      },

      // Register new user (Step 1)
      register: async (userData: RegisterData): Promise<{ needsVerification: boolean; email?: string }> => {
        set({ isLoading: true, error: null });

        try {
          const response = await authAPI.register(
            userData.name,
            userData.email, 
            userData.password,
            userData.riskProfile || 'balanced'
          );
          
          // Check if registration was successful but needs verification
          if (response.data && response.data.nextStep === 'verify_email') {
            set({
              pendingVerification: {
                email: response.data.email,
                userId: response.data.userId,
                name: response.data.name,
              },
              isLoading: false,
              error: null,
            });
            return { needsVerification: true, email: response.data.email };
          }
          
          // If we somehow get a token directly (shouldn't happen with current backend)
          if (response.token && response.user) {
            set({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              pendingVerification: null,
            });
            return { needsVerification: false };
          }
          
          // Registration failed
          set({
            error: response.error || response.message || 'Registration failed',
            isLoading: false,
          });
          return { needsVerification: false };
          
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
          set({
            error: errorMessage,
            isLoading: false,
          });
          return { needsVerification: false };
        }
      },

      // Verify email with OTP (Step 2)
      verifyEmail: async (email: string, otp: string): Promise<boolean> => {
        set({ isLoading: true, error: null });

        try {
          const response = await authAPI.verifyEmail(email, otp);
          
          if (response.token && response.user) {
            set({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              pendingVerification: null,
            });
            return true;
          } else {
            set({
              error: response.error || response.message || 'Verification failed',
              isLoading: false,
            });
            return false;
          }
        } catch (error: any) {
          set({
            error: error.response?.data?.message || error.message || 'Verification failed',
            isLoading: false,
          });
          return false;
        }
      },

      // Resend verification email
      resendVerification: async (email: string): Promise<boolean> => {
        set({ isLoading: true, error: null });

        try {
          const response = await authAPI.resendVerification(email);
          
          set({
            isLoading: false,
            error: null,
          });
          
          return true;
        } catch (error: any) {
          set({
            error: error.response?.data?.message || error.message || 'Failed to resend verification',
            isLoading: false,
          });
          return false;
        }
      },

      // Logout
      logout: () => {
        authAPI.logout();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          pendingVerification: null,
        });
      },

      // Check authentication status on app startup
      checkAuthStatus: async () => {
        const { token } = get();
        
        if (!token) {
          return;
        }

        try {
          const response = await authAPI.getCurrentUser();
          
          if (response.user) {
            set({
              user: response.user,
              isAuthenticated: true,
            });
          } else {
            get().logout();
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          get().logout();
        }
      },
    }),
    {
      name: 'growahead-auth-storage',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        state?.checkAuthStatus();
      },
    }
  )
);

// Selector hooks for better performance
export const useAuth = () => useAuthStore((state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
  error: state.error,
  pendingVerification: state.pendingVerification,
}));

export const useAuthActions = () => useAuthStore((state) => ({
  login: state.login,
  register: state.register,
  verifyEmail: state.verifyEmail,
  resendVerification: state.resendVerification,
  logout: state.logout,
  clearError: state.clearError,
  clearPendingVerification: state.clearPendingVerification,
}));

export const useAuthHydration = () => useAuthStore((state) => state._hasHydrated);