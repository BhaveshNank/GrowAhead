// src/components/ui/ChangeRiskProfileModal.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  TrendingUp, 
  AlertCircle, 
  Info, 
  Check,
  ArrowRight,
  BookOpen,
  Lightbulb
} from 'lucide-react'
import { authAPI } from '@/lib/api'

interface ChangeRiskProfileModalProps {
  isOpen: boolean
  currentProfile: 'conservative' | 'balanced' | 'aggressive'
  onClose: () => void
  onSuccess?: () => void
}

const RISK_PROFILES = [
  {
    id: 'conservative' as const,
    label: 'Conservative',
    rate: '5%',
    description: 'Lower risk, steady growth',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    hoverColor: 'hover:bg-blue-50',
    selectedColor: 'bg-blue-600 text-white',
    icon: '🛡️'
  },
  {
    id: 'balanced' as const,
    label: 'Balanced',
    rate: '8%',
    description: 'Moderate risk, balanced returns',
    color: 'bg-green-100 text-green-800 border-green-300',
    hoverColor: 'hover:bg-green-50',
    selectedColor: 'bg-green-600 text-white',
    icon: '⚖️'
  },
  {
    id: 'aggressive' as const,
    label: 'Aggressive',
    rate: '12%',
    description: 'Higher risk, maximum growth',
    color: 'bg-red-100 text-red-800 border-red-300',
    hoverColor: 'hover:bg-red-50',
    selectedColor: 'bg-red-600 text-white',
    icon: '🚀'
  }
]

export default function ChangeRiskProfileModal({ 
  isOpen, 
  currentProfile, 
  onClose, 
  onSuccess 
}: ChangeRiskProfileModalProps) {
  const [selectedProfile, setSelectedProfile] = useState<'conservative' | 'balanced' | 'aggressive'>(currentProfile)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEducationalNote, setShowEducationalNote] = useState(true)

  const handleSubmit = async () => {
    if (selectedProfile === currentProfile) {
      setError('Please select a different investment strategy')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await authAPI.updateProfile({ riskProfile: selectedProfile })
      onSuccess?.()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to update investment strategy')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const currentProfileData = RISK_PROFILES.find(p => p.id === currentProfile)
  const selectedProfileData = RISK_PROFILES.find(p => p.id === selectedProfile)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl my-8">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center text-lg">
            <TrendingUp className="h-5 w-5 mr-2" />
            Change Investment Strategy
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Educational Note - Simulation vs Real World */}
          {showEducationalNote && (
            <Alert className="border-amber-200 bg-amber-50">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              <div className="ml-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-amber-900 text-sm">
                    📚 Educational Note: How This Works
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEducationalNote(false)}
                    className="h-6 w-6 p-0 text-amber-700 hover:text-amber-900"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-sm text-amber-800 space-y-2">
                  <p className="font-medium">
                    <strong>In This Simulation:</strong>
                  </p>
                  <p className="ml-4">
                    When you change your investment strategy, we recalculate ALL your past transactions 
                    using the new growth rate. This shows you "what if I had been using this strategy 
                    from day one?" It's a powerful learning tool to compare different investment approaches.
                  </p>
                  
                  <p className="font-medium mt-3">
                    <strong>In Real Investment Apps:</strong>
                  </p>
                  <p className="ml-4">
                    Real platforms like Betterment, Wealthfront, or Acorns work differently. When you 
                    change your risk profile in real apps, your past investments stay as-is, and only 
                    <strong> future contributions</strong> use the new strategy. Your previous investments 
                    keep growing at the rate they were allocated.
                  </p>

                  <div className="mt-3 p-3 bg-amber-100 rounded-md border border-amber-200">
                    <p className="text-xs font-medium">
                      💡 <strong>Why the difference?</strong> This is an educational simulator designed to help you 
                      understand and compare investment strategies. Real apps can't retroactively change 
                      how your money was invested in the past!
                    </p>
                  </div>
                </div>
              </div>
            </Alert>
          )}

          {/* Current Strategy */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center">
              <Info className="h-4 w-4 mr-1" />
              Current Strategy
            </label>
            <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
              <span className="text-2xl">{currentProfileData?.icon}</span>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-slate-900">{currentProfileData?.label}</h3>
                  <Badge className={currentProfileData?.color}>
                    {currentProfileData?.rate} Annual Return
                  </Badge>
                </div>
                <p className="text-sm text-slate-600">{currentProfileData?.description}</p>
              </div>
            </div>
          </div>

          {/* Arrow Indicator */}
          <div className="flex justify-center">
            <ArrowRight className="h-6 w-6 text-slate-400" />
          </div>

          {/* Select New Strategy */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 flex items-center">
              <TrendingUp className="h-4 w-4 mr-1" />
              Select New Strategy
            </label>
            <div className="grid gap-3">
              {RISK_PROFILES.map((profile) => {
                const isSelected = selectedProfile === profile.id
                const isCurrent = currentProfile === profile.id
                
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setSelectedProfile(profile.id)}
                    disabled={isCurrent || isLoading}
                    className={`
                      w-full p-4 rounded-lg border-2 text-left transition-all
                      ${isCurrent 
                        ? 'border-slate-300 bg-slate-100 cursor-not-allowed opacity-60' 
                        : isSelected
                          ? 'border-slate-900 bg-slate-900 shadow-lg'
                          : 'border-slate-200 hover:border-slate-400 hover:shadow-md cursor-pointer'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{profile.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {profile.label}
                          </h3>
                          {isCurrent && (
                            <Badge variant="outline" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className={`text-sm ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                          {profile.description} • {profile.rate} annual return
                        </p>
                      </div>
                      {isSelected && !isCurrent && (
                        <Check className="h-5 w-5 text-white" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* What Happens Next */}
          {selectedProfile !== currentProfile && (
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>What happens next:</strong> All your transactions will be recalculated using the{' '}
                <strong>{selectedProfileData?.label}</strong> growth rate ({selectedProfileData?.rate}). 
                Your portfolio balance will update to reflect what it would be worth if you had been 
                using this strategy from the beginning.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="flex-1"
              disabled={isLoading || selectedProfile === currentProfile}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Change to {selectedProfileData?.label}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
