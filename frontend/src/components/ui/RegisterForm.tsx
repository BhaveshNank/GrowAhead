'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { UserPlus, Mail, Lock, User, TrendingUp, AlertCircle } from "lucide-react"
import EmailVerification from "./EmailVerification"
import { useAuthStore } from '@/stores/authStore'

export default function RegisterForm() {
  console.log('🌍 Environment check:')
  console.log('API URL:', process.env.NEXT_PUBLIC_API_URL)
  console.log('Node ENV:', process.env.NODE_ENV)
  const [step, setStep] = useState<'register' | 'verify'>('register')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    riskProfile: 'balanced'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  setError('')

  console.log('🔍 Attempting registration...')
  console.log('API URL:', process.env.NEXT_PUBLIC_API_URL)
  console.log('Form data:', formData)

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    })

    console.log('🔍 DETAILED RESPONSE INFO:')
    console.log('Response status:', response.status)
    console.log('Response ok:', response.ok)
    console.log('Response statusText:', response.statusText)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    // Get response text first, then try to parse JSON
    const responseText = await response.text()
    console.log('Response text (raw):', responseText)
    
    let data
    try {
      data = JSON.parse(responseText)
      console.log('Response data (parsed):', data)
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError)
      console.error('Raw response was:', responseText)
      setError('Invalid response from server. Check console for details.')
      return
    }

    // FIXED: More flexible success condition + extra debugging
    console.log('🔍 Checking success condition...')
    console.log('response.ok:', response.ok)
    console.log('response.status:', response.status)
    console.log('data.message:', data?.message)
    
    if (response.ok || (data && data.message && data.message.includes('Registration initiated successfully'))) {
      console.log('✅ SUCCESS - Registration successful - moving to verification step')
      console.log('✅ Setting step to verify...')
      console.log('✅ Email for verification:', formData.email)
      setStep('verify')
      console.log('✅ Step has been set to verify')
    } else {
      console.error('❌ Registration failed:')
      console.error('Status:', response.status)
      console.error('Response ok:', response.ok)
      console.error('Data:', data)
      
      // Better error message extraction
      let errorMessage = 'Registration failed'
      if (data) {
        errorMessage = data.message || data.error || 'Registration failed'
        if (data.details && Array.isArray(data.details)) {
          errorMessage += ': ' + data.details.join(', ')
        }
      }
      setError(errorMessage)
    }
  } catch (error) {
    console.error('❌ Network/fetch error:', error)
    
    // FIXED: TypeScript error handling with proper type guards
    if (error instanceof Error) {
      // Check specific error types
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('Cannot connect to server. Make sure backend is running on http://localhost:5001')
      } else if (error.name === 'AbortError') {
        setError('Request timeout. Please try again.')
      } else {
        setError(`Network error: ${error.message}`)
      }
    } else {
      // Handle non-Error objects
      setError('An unexpected error occurred. Please try again.')
    }
  } finally {
    setIsLoading(false)
  }
}

  const handleVerificationSuccess = (token: string, user: any) => {
    console.log('✅ Email verification successful!')
    console.log('Token:', token)
    console.log('User:', user)
    // Set auth state and redirect to dashboard
    login(token, user)
  }

  // Add debugging for step changes
  console.log('🔍 Current step:', step)
  
  if (step === 'verify') {
    console.log('✅ Rendering EmailVerification component')
    console.log('✅ Email for verification:', formData.email)
    return (
      <EmailVerification
        email={formData.email}
        onVerificationSuccess={handleVerificationSuccess}
        onBack={() => {
          console.log('🔙 Going back to registration')
          setStep('register')
        }}
      />
    )
  }

  console.log('📝 Rendering registration form')
  return (
    <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-r from-slate-900 to-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Start learning investment concepts and exploring market trends through interactive simulations
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a secure password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* Risk Profile Field */}
            <div className="space-y-2">
              <Label htmlFor="riskProfile">Investment Strategy</Label>
              <Select
                value={formData.riskProfile}
                onValueChange={(value) => setFormData(prev => ({ ...prev, riskProfile: value }))}
              >
                <SelectTrigger>
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-slate-400" />
                    <SelectValue placeholder="Choose your investment approach" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative (5% return)</SelectItem>
                  <SelectItem value="balanced">Balanced (8% return)</SelectItem>
                  <SelectItem value="aggressive">Aggressive (12% return)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>

            {/* Terms */}
            <p className="text-xs text-slate-600 text-center">
              By creating an account, you agree to our Terms of Service and Privacy Policy.
              We'll send you a verification email to confirm your address.
            </p>
          </form>

          {/* Debug Info - Remove this in production */}
          <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
            <strong>Debug Info:</strong><br />
            Current Step: {step}<br />
            API URL: {process.env.NEXT_PUBLIC_API_URL}<br />
            Form Email: {formData.email}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}