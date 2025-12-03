// src/components/ui/EditTransactionModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/date-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { X, Edit, Calculator, AlertCircle, Check } from 'lucide-react'
import { transactionsAPI, Transaction } from '@/lib/api'

interface EditTransactionModalProps {
  isOpen: boolean
  transaction: Transaction
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

export default function EditTransactionModal({ isOpen, transaction, onClose, onSuccess }: EditTransactionModalProps) {
  const [formData, setFormData] = useState({
    merchant: '',
    amount: '',
    category: '',
    transactionDate: ''
  })
  const [newRoundup, setNewRoundup] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form with transaction data
  useEffect(() => {
    if (transaction) {
      setFormData({
        merchant: transaction.merchant,
        amount: transaction.amount.toString(),
        category: transaction.category || '',
        transactionDate: transaction.transactionDate.split('T')[0]
      })
    }
  }, [transaction])

  // Calculate new roundup when amount changes
  useEffect(() => {
    if (formData.amount) {
      const amount = parseFloat(formData.amount)
      if (!isNaN(amount) && amount > 0) {
        const roundup = Math.ceil(amount) === amount ? 1.00 : Math.ceil(amount) - amount
        setNewRoundup(roundup)
      } else {
        setNewRoundup(0)
      }
    }
  }, [formData.amount])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const amount = parseFloat(formData.amount)
      
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount')
      }

      await transactionsAPI.updateTransaction(transaction.id, {
        merchant: formData.merchant,
        amount,
        category: formData.category || undefined,
        transactionDate: formData.transactionDate
      })

      onSuccess?.()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to update transaction')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const oldRoundup = transaction.roundupAmount || 0
  const roundupChange = newRoundup - oldRoundup

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center text-lg">
            <Edit className="h-5 w-5 mr-2" />
            Edit Transaction
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="merchant">Merchant *</Label>
              <Input
                id="merchant"
                value={formData.merchant}
                onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                placeholder="Starbucks, Amazon, etc."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="pl-7"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Transaction Date *</Label>
              <DateInput
                id="date"
                value={formData.transactionDate}
                onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                required
              />
            </div>

            {/* Roundup Preview */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Current Roundup:</span>
                <span className="font-medium text-slate-900">${oldRoundup.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">New Roundup:</span>
                <span className="font-medium text-green-600">${newRoundup.toFixed(2)}</span>
              </div>
              {roundupChange !== 0 && (
                <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-200">
                  <span className="text-slate-600">Change:</span>
                  <span className={`font-medium ${roundupChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {roundupChange > 0 ? '+' : ''}{roundupChange.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

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
                type="submit"
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Update Transaction
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
