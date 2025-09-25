// src/components/ui/OTPVerification.tsx - Fixed to show 10 minutes expiry consistently
'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Mail, 
  ArrowLeft, 
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Timer
} from 'lucide-react'

interface OTPVerificationProps {
  email: string;
  name: string;
  onVerify: (otp: string) => Promise<boolean>;
  onResend: () => Promise<boolean>;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

export default function OTPVerification({ 
  email, 
  name, 
  onVerify, 
  onResend, 
  onBack,
  isLoading,
  error 
}: OTPVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes - FIXED to match email
  const [canResend, setCanResend] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  // Fixed ref typing
  const inputRefs = useRef<HTMLInputElement[]>([])

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      
      // Allow resend after 5 minutes (when 300 seconds remain)
      if (timeLeft === 300) {
        setCanResend(true)
      }
      
      return () => clearTimeout(timer)
    }
  }, [timeLeft])

  // Handle OTP input
  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) return // Only allow single digits
    
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus()
    }

    // Auto-submit when all fields filled
    if (newOtp.every(digit => digit) && !isLoading) {
      handleSubmit(newOtp.join(''))
    }
  }

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus()
    }
  }

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('')
      setOtp(newOtp)
      handleSubmit(pastedData)
    }
  }

  const handleSubmit = async (otpString?: string) => {
    const otpCode = otpString || otp.join('')
    if (otpCode.length !== 6) return
    
    await onVerify(otpCode)
  }

  const handleResend = async () => {
    setResendLoading(true)
    setResendSuccess(false)
    
    const success = await onResend()
    
    if (success) {
      setResendSuccess(true)
      setTimeLeft(600) // Reset to 10 minutes - FIXED
      setCanResend(false) // Reset resend availability
      setOtp(['', '', '', '', '', '']) // Clear OTP
      
      // Clear success message after 3 seconds
      setTimeout(() => setResendSuccess(false), 3000)
    }
    
    setResendLoading(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate resend countdown (show countdown for first 5 minutes)
  const getResendText = () => {
    if (canResend) return "Resend Code"
    
    const resendTimeLeft = Math.max(0, 300 - (600 - timeLeft)) // 5 minutes from start
    if (resendTimeLeft > 0) {
      return `Resend in ${formatTime(resendTimeLeft)}`
    }
    return "Resend Code"
  }

  const isComplete = otp.every(digit => digit)

  return (
    <Card className="w-full max-w-md bg-white/80 backdrop-blur-lg border-white/80 shadow-2xl">
      <CardHeader className="text-center space-y-4 pb-8">
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
          <Mail className="h-8 w-8 text-white" />
        </div>
        
        <div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Verify Your Email
          </CardTitle>
          <CardDescription className="text-slate-600 mt-2">
            We've sent a 6-digit verification code to
          </CardDescription>
          <div className="mt-2">
            <Badge variant="outline" className="bg-slate-100 text-slate-700 text-sm px-3 py-1">
              {email}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Success message */}
        {resendSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
            <span className="text-sm text-green-700">New verification code sent!</span>
          </div>
        )}

        {/* OTP Input Fields */}
        <div className="space-y-4">
          <div className="flex justify-center space-x-3">
            {otp.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => {
                  if (el) {
                    inputRefs.current[index] = el
                  }
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOTPChange(index, e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={`w-12 h-12 text-center text-xl font-semibold border-2 transition-colors ${
                  digit 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-slate-200 hover:border-slate-300 focus:border-blue-500'
                }`}
                disabled={isLoading}
              />
            ))}
          </div>

          {/* Timer and Instructions */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-600">
              <Timer className="h-4 w-4" />
              <span>Code expires in {formatTime(timeLeft)}</span>
            </div>
            <p className="text-xs text-slate-500">
              Enter the 6-digit code sent to your email address
            </p>
          </div>
        </div>

        {/* Manual Verify Button (if needed) */}
        {isComplete && (
          <Button 
            onClick={() => handleSubmit()}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Verifying...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Verify Email</span>
              </div>
            )}
          </Button>
        )}

        {/* Resend Section */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-3">
              Didn't receive the code?
            </p>
            
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={!canResend || resendLoading}
              className="w-full"
            >
              {resendLoading ? (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Sending...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4" />
                  <span>{getResendText()}</span>
                </div>
              )}
            </Button>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center pt-2">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900"
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Registration
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}