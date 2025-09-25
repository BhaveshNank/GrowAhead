'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, Clock, RefreshCw, CheckCircle, AlertCircle } from "lucide-react"

interface EmailVerificationProps {
  email: string
  onVerificationSuccess: (token: string, user: any) => void
  onBack?: () => void
}

export default function EmailVerification({ email, onVerificationSuccess, onBack }: EmailVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendTimer, setResendTimer] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer for resend button
  useEffect(() => {
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Handle OTP input change
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, 6).split('')
      const newOtp = [...otp]
      pastedCode.forEach((char, i) => {
        if (index + i < 6 && /^\d$/.test(char)) {
          newOtp[index + i] = char
        }
      })
      setOtp(newOtp)
      
      // Focus on the next empty input or the last one
      const nextIndex = Math.min(index + pastedCode.length, 5)
      inputRefs.current[nextIndex]?.focus()
    } else if (/^\d$/.test(value)) {
      const newOtp = [...otp]
      newOtp[index] = value
      setOtp(newOtp)
      
      // Move to next input
      if (index < 5) {
        inputRefs.current[index + 1]?.focus()
      }
    }
    setError('') // Clear error when user starts typing
  }

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // Verify OTP
  const handleVerify = async () => {
    const otpCode = otp.join('')
    if (otpCode.length !== 6) {
      setError('Please enter a complete 6-digit code')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp: otpCode
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Success - call parent callback with token and user data
        onVerificationSuccess(data.token, data.user)
      } else {
        setError(data.message || 'Verification failed')
        // Clear OTP on error
        setOtp(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Resend verification code
  const handleResend = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        // Reset timer and clear OTP
        setResendTimer(60)
        setCanResend(false)
        setOtp(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        
        // Show success message briefly
        setError('')
        setTimeout(() => setError(''), 3000)
      } else {
        setError(data.message || 'Failed to resend verification code')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-submit when OTP is complete
  useEffect(() => {
    if (otp.every(digit => digit !== '') && !isLoading) {
      handleVerify()
    }
  }, [otp])

  return (
    <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
          <CardDescription className="text-base">
            We sent a 6-digit verification code to<br />
            <span className="font-medium text-slate-900">{email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* OTP Input Grid */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700 text-center">
              Enter verification code
            </label>
            <div className="flex justify-center space-x-3">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el
                    }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-lg font-bold border-2 focus:border-blue-500"
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Verify Button */}
          <Button
            onClick={handleVerify}
            disabled={isLoading || otp.some(digit => digit === '')}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Verify Email
              </>
            )}
          </Button>

          {/* Resend Section */}
          <div className="text-center space-y-3">
            <p className="text-sm text-slate-600">
              Didn't receive the code?
            </p>
            
            {!canResend ? (
              <div className="flex items-center justify-center text-sm text-slate-500">
                <Clock className="h-4 w-4 mr-2" />
                Resend available in {resendTimer}s
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={handleResend}
                disabled={isLoading}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Code
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Back Button */}
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="w-full"
            >
              ← Back to Registration
            </Button>
          )}

          {/* Help Text */}
          <div className="text-xs text-slate-500 text-center space-y-1">
            <p>The verification code expires in 10 minutes.</p>
            <p>Check your spam folder if you don't see the email.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}