// src/components/ui/DeleteTransactionModal.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { X, Trash2, AlertTriangle, AlertCircle } from 'lucide-react'
import { transactionsAPI, Transaction } from '@/lib/api'

interface DeleteTransactionModalProps {
  isOpen: boolean
  transaction: Transaction
  onClose: () => void
  onSuccess?: () => void
}

export default function DeleteTransactionModal({ isOpen, transaction, onClose, onSuccess }: DeleteTransactionModalProps) {
  const [confirmText, setConfirmText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (confirmText.toLowerCase() !== transaction.merchant.toLowerCase()) {
      setError('Merchant name does not match')
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      await transactionsAPI.deleteTransaction(transaction.id)
      onSuccess?.()
      onClose()
      setConfirmText('')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to delete transaction')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setConfirmText('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  const roundupAmount = transaction.roundupAmount || 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center text-lg text-red-600">
            <Trash2 className="h-5 w-5 mr-2" />
            Delete Transaction
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Warning */}
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              This action cannot be undone. This will permanently delete the transaction and its associated roundup.
            </AlertDescription>
          </Alert>

          {/* Transaction Details */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Merchant:</span>
              <span className="font-medium text-slate-900">{transaction.merchant}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Amount:</span>
              <span className="font-medium text-slate-900">${transaction.amount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Category:</span>
              <span className="font-medium text-slate-900">{transaction.category || 'Uncategorized'}</span>
            </div>
            {roundupAmount > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-sm text-slate-600">Roundup Amount:</span>
                <span className="font-medium text-red-600">-${roundupAmount.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <span className="font-semibold">{transaction.merchant}</span> to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value)
                setError(null)
              }}
              placeholder="Enter merchant name"
              autoComplete="off"
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="flex-1"
              disabled={isLoading || confirmText.toLowerCase() !== transaction.merchant.toLowerCase()}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Transaction
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
