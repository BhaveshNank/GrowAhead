'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  User, 
  Lock, 
  Trash2, 
  Shield, 
  AlertTriangle,
  Eye,
  EyeOff,
  Settings,
  Mail,
  Calendar,
  CheckCircle
} from "lucide-react"
import { useAuthStore } from '@/stores/authStore'
import { authAPI } from '@/lib/api'
import AuthWrapper from '@/components/ui/AuthWrapper'

function AccountSettingsContent() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null) // For showing API errors
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })

  // Form states
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [deleteForm, setDeleteForm] = useState({
    confirmEmail: '',
    confirmPassword: ''
  })

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Clear any API errors
  const clearError = () => {
    setApiError(null)
  }

  // Enhanced error message extraction
  const getErrorMessage = (error: any): string => {
    console.error('🔐 Full error details:', {
      error: error,
      response: error?.response,
      status: error?.response?.status,
      data: error?.response?.data
    })

    // Check for response data message first
    if (error?.response?.data?.message) {
      return error.response.data.message
    }

    // Check for specific status codes
    if (error?.response?.status) {
      const status = error.response.status
      switch (status) {
        case 400:
          return 'Invalid input provided. Please check your information.'
        case 401:
          return 'Current password is incorrect. Please try again.'
        case 403:
          return 'Access denied. Please log in again.'
        case 404:
          return 'Account not found. Please log in again.'
        case 500:
          return 'Server error. Please try again later.'
        default:
          return `Server error (${status}). Please try again.`
      }
    }

    // Network errors
    if (error?.request) {
      return 'Network error. Please check your internet connection.'
    }

    // Generic error
    if (error?.message) {
      return `Error: ${error.message}`
    }

    return 'An unexpected error occurred. Please try again.'
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    
    // Client-side validation
    if (!passwordForm.currentPassword.trim()) {
      setApiError('Please enter your current password')
      return
    }

    if (!passwordForm.newPassword.trim()) {
      setApiError('Please enter a new password')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setApiError('New passwords do not match')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setApiError('New password must be at least 6 characters long')
      return
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setApiError('New password must be different from current password')
      return
    }

    setIsLoading(true)

    try {
      console.log('🔐 Starting password change process...')
      
      const result = await authAPI.changePassword(
        passwordForm.currentPassword, 
        passwordForm.newPassword
      )
      
      console.log('🔐 Password change successful:', result)
      
      // Success! Clear form and show success
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setIsChangingPassword(false)
      setApiError(null)
      
      // Show success message
      alert('✅ Password changed successfully!')
      
    } catch (error: any) {
      console.error('🔐 Password change error:', error)
      
      const errorMessage = getErrorMessage(error)
      setApiError(errorMessage)
      
      // Don't clear the form on error - let user retry
      // Just clear the current password for security
      setPasswordForm(prev => ({ ...prev, currentPassword: '' }))
      
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    // Client-side validation
    if (!deleteForm.confirmEmail.trim()) {
      setApiError('Please enter your email address')
      return
    }

    if (!deleteForm.confirmPassword.trim()) {
      setApiError('Please enter your password')
      return
    }

    if (deleteForm.confirmEmail !== user?.email) {
      setApiError('Email confirmation does not match your account email')
      return
    }

    // Final confirmation dialog
    const finalConfirmation = prompt(
      '⚠️ FINAL WARNING: Are you absolutely sure you want to permanently delete your account?\n\n' +
      'This will:\n' +
      '• Delete all your transactions\n' +
      '• Remove all your investment data\n' +
      '• Permanently close your account\n\n' +
      'This action CANNOT be undone!\n\n' +
      'Type "DELETE" to confirm:'
    )
    
    if (finalConfirmation !== 'DELETE') {
      setApiError('Account deletion cancelled - confirmation not provided')
      return
    }

    setIsLoading(true)

    try {
      console.log('🗑️ Starting account deletion process...')
      
      await authAPI.deleteAccount(deleteForm.confirmPassword)
      
      console.log('🗑️ Account deletion successful')
      
      // Success - logout and redirect
      alert('✅ Account deleted successfully. Redirecting to home page...')
      logout()
      router.push('/')
      
    } catch (error: any) {
      console.error('🗑️ Account deletion error:', error)
      
      const errorMessage = getErrorMessage(error)
      setApiError(errorMessage)
      
      // Clear password for security but keep email
      setDeleteForm(prev => ({ ...prev, confirmPassword: '' }))
      
    } finally {
      setIsLoading(false)
    }
  }

  const riskProfiles = {
    conservative: { label: 'Conservative', description: '5% return - Low risk', color: 'bg-blue-100 text-blue-800' },
    balanced: { label: 'Balanced', description: '8% return - Medium risk', color: 'bg-green-100 text-green-800' },
    aggressive: { label: 'Aggressive', description: '12% return - High risk', color: 'bg-red-100 text-red-800' }
  }

  const currentProfile = riskProfiles[user?.riskProfile as keyof typeof riskProfiles] || riskProfiles.balanced

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
              disabled={isLoading}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-slate-600" />
              <h1 className="text-xl font-semibold text-slate-900">Account Settings</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Global Error Display */}
          {apiError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-red-800 font-medium">Error</p>
                    <p className="text-sm text-red-700 mt-1">{apiError}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearError}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    ✕
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile Information</span>
              </CardTitle>
              <CardDescription>
                Your basic account information and current settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User Info Display */}
              <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-lg">
                <div className="w-16 h-16 bg-gradient-to-r from-slate-900 to-slate-700 rounded-full flex items-center justify-center text-white font-medium text-lg">
                  {user?.name ? getInitials(user.name) : <User className="h-8 w-8" />}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">{user?.name}</h3>
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <Mail className="h-4 w-4" />
                    <span>{user?.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-slate-600 mt-1">
                    <Calendar className="h-4 w-4" />
                    <span>Member since {new Date(user?.createdAt || '').toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Investment Profile Display */}
              <div className="p-4 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-slate-600" />
                    <span className="font-medium text-slate-900">Investment Profile</span>
                  </div>
                  <Badge className={currentProfile.color}>
                    {currentProfile.label}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600">{currentProfile.description}</p>
                <p className="text-xs text-slate-500 mt-2">
                  To change your investment strategy, contact our support team or use the investment settings in your dashboard.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5" />
                <span>Change Password</span>
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isChangingPassword ? (
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Password</p>
                    <p className="text-sm text-slate-600">Keep your account secure</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsChangingPassword(true)
                      clearError()
                    }}
                    disabled={isLoading}
                  >
                    Change Password
                  </Button>
                </div>
              ) : (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(e) => {
                          setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))
                          clearError()
                        }}
                        placeholder="Enter your current password"
                        required
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                        disabled={isLoading}
                      >
                        {showPasswords.current ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => {
                          setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))
                          clearError()
                        }}
                        placeholder="Enter your new password (min. 6 characters)"
                        required
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        disabled={isLoading}
                      >
                        {showPasswords.new ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => {
                          setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))
                          clearError()
                        }}
                        placeholder="Confirm your new password"
                        required
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        disabled={isLoading}
                      >
                        {showPasswords.confirm ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Updating...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4" />
                          <span>Update Password</span>
                        </div>
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsChangingPassword(false)
                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                        clearError()
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Delete Account */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                <span>Delete Account</span>
              </CardTitle>
              <CardDescription>
                Permanently delete your account and all associated data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showDeleteConfirm ? (
                <div className="space-y-4">
                  <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-900">Warning: This action cannot be undone</h4>
                      <p className="text-sm text-red-700 mt-1">
                        Deleting your account will permanently remove all your transactions, savings data, 
                        and investment history. This action is irreversible.
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setShowDeleteConfirm(true)
                      clearError()
                    }}
                    disabled={isLoading}
                  >
                    I understand, delete my account
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleDeleteAccount} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="confirmEmail">
                      Confirm your email address: <span className="font-mono text-sm">{user?.email}</span>
                    </Label>
                    <Input
                      id="confirmEmail"
                      type="email"
                      placeholder="Enter your email address"
                      value={deleteForm.confirmEmail}
                      onChange={(e) => {
                        setDeleteForm(prev => ({ ...prev, confirmEmail: e.target.value }))
                        clearError()
                      }}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmDeletePassword">Enter your password to confirm</Label>
                    <Input
                      id="confirmDeletePassword"
                      type="password"
                      placeholder="Enter your password"
                      value={deleteForm.confirmPassword}
                      onChange={(e) => {
                        setDeleteForm(prev => ({ ...prev, confirmPassword: e.target.value }))
                        clearError()
                      }}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <Button 
                      type="submit" 
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Deleting...</span>
                        </div>
                      ) : (
                        'Delete Account Permanently'
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowDeleteConfirm(false)
                        setDeleteForm({ confirmEmail: '', confirmPassword: '' })
                        clearError()
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function AccountSettings() {
  return (
    <AuthWrapper>
      <AccountSettingsContent />
    </AuthWrapper>
  )
}