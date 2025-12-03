// src/components/ui/AddTransactionModal.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/date-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { X, DollarSign, Calculator, AlertCircle, Check } from 'lucide-react'
import { transactionsAPI } from '@/lib/api'
import { calculateRoundupPreview } from '@/lib/utils'

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const CATEGORIES = [
  'Food & Dining',
  'Shopping', 
  'Transportation',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Travel',
  'Education',
  'Personal Care',
  'Other'
]

export default function AddTransactionModal({ isOpen, onClose, onSuccess }: AddTransactionModalProps) {
  const [formData, setFormData] = useState({
    merchant: '',
    amount: '',
    category: '',
    transactionDate: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  
  // Calculate roundup preview
  const amount = parseFloat(formData.amount) || 0
  const roundupAmount = amount > 0 ? calculateRoundupPreview(amount) : 0

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError(null) // Clear error when user types
  }

  const validateForm = () => {
    if (!formData.merchant.trim()) {
      return 'Merchant name is required'
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return 'Please enter a valid amount greater than 0'
    }
    if (!formData.category) {
      return 'Please select a category'
    }
    if (!formData.transactionDate) {
      return 'Transaction date is required'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await transactionsAPI.addTransaction({
        merchant: formData.merchant.trim(),
        amount: parseFloat(formData.amount),
        category: formData.category,
        transactionDate: formData.transactionDate
      })

      // Show success state briefly
      setIsSuccess(true)
      
      // Reset form
      setFormData({
        merchant: '',
        amount: '',
        category: '',
        transactionDate: new Date().toISOString().split('T')[0]
      })

      // Call success callback to refresh dashboard data
      onSuccess?.()

      // Close modal after brief success display
      setTimeout(() => {
        setIsSuccess(false)
        onClose()
      }, 1500)

    } catch (error: any) {
      setError(error.response?.data?.message || error.message || 'Failed to add transaction')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  // Success state
  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Transaction Added!</h3>
            <p className="text-slate-600 mb-2">
              ${parseFloat(formData.amount || '0').toFixed(2)} transaction at {formData.merchant}
            </p>
            <p className="text-sm text-green-600">
              +${roundupAmount.toFixed(2)} added to your savings
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <CardTitle className="text-xl font-bold flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Add Transaction
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Merchant Name */}
            <div className="space-y-2">
              <Label htmlFor="merchant">Merchant Name</Label>
              <Input
                id="merchant"
                type="text"
                value={formData.merchant}
                onChange={(e) => handleInputChange('merchant', e.target.value)}
                placeholder="e.g., Starbucks, Amazon, Target..."
                disabled={isLoading}
                className="w-full"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Transaction Amount</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="0.00"
                  disabled={isLoading}
                  className="pl-8"
                />
                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              </div>
              
              {/* Roundup Preview */}
              {amount > 0 && (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center">
                    <Calculator className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm text-green-700">Roundup Preview</span>
                  </div>
                  <span className="font-medium text-green-800">
                    +${roundupAmount.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Date */}
            <div className="space-y-2">
              <Label htmlFor="transactionDate">Transaction Date</Label>
              <DateInput
                id="transactionDate"
                value={formData.transactionDate}
                onChange={(e) => handleInputChange('transactionDate', e.target.value)}
                disabled={isLoading}
                max={new Date().toISOString().split('T')[0]} // Can't select future dates
              />
            </div>

            {/* Form Actions */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-slate-900 hover:bg-slate-800"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Add Transaction
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Helper Text */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>How it works:</strong> We'll round up your transaction to the nearest dollar and invest the spare change. 
              For example, a $4.35 coffee becomes $5.00, saving $0.65 for your investment portfolio.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}