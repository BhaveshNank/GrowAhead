// src/components/ui/AuthWrapper.tsx - Updated with Enhanced Investment Strategy Dropdown
'use client'

import { useEffect, ReactNode, useRef, useCallback, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import OTPVerification from '@/components/ui/OTPVerification'
import InvestmentStrategyDropdown from '@/components/ui/InvestmentStrategyDropdown'
import { 
  Wallet, 
  LogIn, 
  UserPlus, 
  AlertCircle,
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  TrendingUp, 
  Shield, 
  Users,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronRight,
  BookOpen,
  BarChart3,
  GraduationCap
} from 'lucide-react'

interface AuthWrapperProps {
  children: ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    error,
    _hasHydrated,
    pendingVerification,
    login,
    register,
    verifyEmail,
    resendVerification,
    clearError,
    clearPendingVerification,
    checkAuthStatus
  } = useAuthStore()
  
  const [showRegister, setShowRegister] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    riskProfile: 'balanced' as 'conservative' | 'balanced' | 'aggressive'
  })
  
  const hasCheckedAuth = useRef(false)

  // Check auth status on mount
  const checkAuth = useCallback(() => {
    if (!_hasHydrated || hasCheckedAuth.current) return
    
    hasCheckedAuth.current = true
    checkAuthStatus()
  }, [_hasHydrated, checkAuthStatus])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    try {
      if (showRegister) {
        const result = await register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          riskProfile: formData.riskProfile
        })
        
        // Registration successful, OTP verification should now be showing
        if (result.needsVerification) {
          console.log('Registration successful, check email for OTP')
        }
      } else {
        const success = await login(formData.email, formData.password)
        if (success) {
          console.log('Login successful!')
        }
      }
    } catch (err) {
      console.error('Auth error:', err)
    }
  }

  // Handle OTP verification
  const handleOTPVerify = async (otp: string): Promise<boolean> => {
    if (!pendingVerification) return false
    
    const success = await verifyEmail(pendingVerification.email, otp)
    return success
  }

  // Handle resend OTP
  const handleResendOTP = async (): Promise<boolean> => {
    if (!pendingVerification) return false
    
    const success = await resendVerification(pendingVerification.email)
    return success
  }

  // Handle back from OTP screen
  const handleBackFromOTP = () => {
    clearPendingVerification()
    clearError()
  }

  // Handle input changes
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }


  // Show loading until hydration
  if (!_hasHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">
            {!_hasHydrated ? 'Loading...' : 'Checking authentication...'}
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-green-400/20 to-blue-400/20 rounded-full blur-3xl"></div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 relative">
            {/* Left side - Branding & Features (Hidden on mobile and when showing OTP) */}
            {!pendingVerification && (
              <div className="hidden lg:flex flex-col justify-center space-y-8 px-8">
                {/* Logo & Brand */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-slate-900 to-slate-700 rounded-xl flex items-center justify-center shadow-lg">
                      <Wallet className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900">GrowAhead</h1>
                      <p className="text-slate-600">Educational Investment Learning Platform</p>
                    </div>
                  </div>
                  
                  <p className="text-lg text-slate-700 leading-relaxed">
                    Learn investment concepts through interactive simulations. Understand how micro-investing and market trends work.
                  </p>
                </div>

                {/* Feature highlights */}
                <div className="flex items-center space-x-3 p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-white/80">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Interactive Learning Modules</h3>
                    <p className="text-sm text-slate-600">Explore investment concepts through hands-on simulations</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-white/80">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Market Trend Analysis</h3>
                    <p className="text-sm text-slate-600">Study different investment strategies and their outcomes</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-white/80">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Portfolio Growth Simulations</h3>
                    <p className="text-sm text-slate-600">Visualize how investments grow over time with real data patterns</p>
                  </div>
                </div>

                {/* Honest social proof */}
                <div className="flex items-center space-x-4 text-sm text-slate-600">
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="h-4 w-4" />
                    <span>Built for learning</span>
                  </div>
                  <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                  <span>3 investment strategies</span>
                  <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                  <span>Safe demo environment</span>
                </div>
              </div>
            )}

            {/* Right side - Show OTP verification or Login/Register Form */}
            <div className="flex items-center justify-center">
              {pendingVerification ? (
                // OTP Verification Screen
                <OTPVerification
                  email={pendingVerification.email}
                  name={pendingVerification.name}
                  onVerify={handleOTPVerify}
                  onResend={handleResendOTP}
                  onBack={handleBackFromOTP}
                  isLoading={isLoading}
                  error={error}
                />
              ) : (
                // Login/Register Form
                <Card className="w-full max-w-md bg-white/80 backdrop-blur-lg border-white/80 shadow-2xl">
                  <CardHeader className="text-center space-y-4 pb-8">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center justify-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-slate-900 to-slate-700 rounded-lg flex items-center justify-center">
                        <Wallet className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-xl font-bold text-slate-900">GrowAhead</span>
                    </div>
                    
                    <div>
                      <CardTitle className="text-2xl font-bold text-slate-900">
                        {showRegister ? 'Create Account' : 'Welcome to GrowAhead'}
                      </CardTitle>
                      <CardDescription className="text-slate-600 mt-2">
                        {showRegister 
                          ? 'Start learning investment concepts and exploring market trends through interactive simulations'
                          : 'Access your learning dashboard to explore investment trends and discover how micro-investing works'
                        }
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Error message */}
                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                        <span className="text-sm text-red-700">{error}</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                      {/* Name field (Register only) */}
                      {showRegister && (
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                            Full Name
                          </Label>
                          <div className="relative">
                            <Input
                              id="name"
                              type="text"
                              placeholder="Enter your full name"
                              value={formData.name}
                              onChange={(e) => handleChange('name', e.target.value)}
                              className="h-12 border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                              required
                            />
                          </div>
                        </div>
                      )}

                      {/* Email field */}
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                          Email Address
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            className="pl-10 h-12 border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                            required
                          />
                        </div>
                      </div>

                      {/* Password field */}
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                          Password
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            className="pl-10 pr-10 h-12 border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-slate-100"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-slate-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-slate-400" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Enhanced Investment Strategy Dropdown (Register only) */}
                      {showRegister && (
                        <div className="space-y-2">
                          <Label htmlFor="riskProfile" className="text-sm font-medium text-slate-700">
                            Investment Strategy
                          </Label>
                          <InvestmentStrategyDropdown
                            value={formData.riskProfile}
                            onChange={(value) => handleChange('riskProfile', value)}
                            disabled={isLoading}
                          />
                        </div>
                      )}

                      {/* Submit button */}
                      <Button 
                        type="submit" 
                        className="w-full h-12 bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>{showRegister ? 'Creating account...' : 'Signing in...'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            {showRegister ? (
                              <>
                                <UserPlus className="h-4 w-4" />
                                <span>Create Account</span>
                              </>
                            ) : (
                              <>
                                <span>Sign In</span>
                                <ArrowRight className="h-4 w-4" />
                              </>
                            )}
                          </div>
                        )}
                      </Button>
                    </form>

                    {/* Toggle between login/register */}
                    <div className="text-center pt-4 border-t border-slate-200">
                      <p className="text-sm text-slate-600">
                        {showRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setShowRegister(!showRegister)
                            clearError()
                            setFormData({
                              email: '',
                              password: '',
                              name: '',
                              riskProfile: 'balanced'
                            })
                          }}
                          className="text-slate-900 font-medium hover:underline"
                        >
                          {showRegister ? 'Sign in' : 'Create one'}
                        </button>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Owner Credit Footer */}
        <div className="relative z-10 py-4 text-center">
          <p className="text-xs text-slate-500 italic">
            Developed by Bhavesh Nankani
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}