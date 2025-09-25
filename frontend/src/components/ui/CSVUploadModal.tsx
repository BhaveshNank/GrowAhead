// src/components/ui/CSVUploadModal.tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  X, 
  Upload, 
  File, 
  Download, 
  AlertCircle, 
  Check, 
  FileText,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react'
import { transactionsAPI } from '@/lib/api'
import { formatFileSize } from '@/lib/utils'

interface CSVUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface UploadResult {
  message: string
  summary: {
    totalProcessed: number
    totalRoundups: number
    totalRoundupAmount: string
    errors: number
  }
  errors?: Array<{
    line: number
    error: string
    data: any
  }>
}

export default function CSVUploadModal({ isOpen, onClose, onSuccess }: CSVUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // File validation
  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      return 'Please select a CSV file only'
    }
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return 'File size must be less than 5MB'
    }
    
    return null
  }

  // Handle file selection
  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    
    setSelectedFile(file)
    setError(null)
    setResult(null)
  }

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [])

  // File input change handler
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  // Upload handler
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first')
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + Math.random() * 20
        })
      }, 200)

      const response = await transactionsAPI.uploadTransactions(selectedFile)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      setTimeout(() => {
        setResult(response)
        setIsUploading(false)
        onSuccess?.()
      }, 500)

    } catch (error: any) {
      setIsUploading(false)
      setUploadProgress(0)
      setError(
        error.response?.data?.message || 
        error.message || 
        'Failed to upload CSV file'
      )
    }
  }

  // Download CSV template
  const downloadTemplate = () => {
    const csvContent = `merchant,amount,category,date
Starbucks,4.65,Food & Dining,2024-01-15
Amazon,29.99,Shopping,2024-01-14
Uber,12.45,Transportation,2024-01-13
Netflix,15.99,Entertainment,2024-01-12
Target,47.82,Shopping,2024-01-11`

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'growahead_template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  // Reset modal state
  const resetModal = () => {
    setSelectedFile(null)
    setError(null)
    setResult(null)
    setUploadProgress(0)
    setIsUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Close handler
  const handleClose = () => {
    resetModal()
    onClose()
  }

  if (!isOpen) return null

  // Success state
  if (result && !isUploading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
            <CardTitle className="text-xl font-bold flex items-center text-green-600">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Upload Complete!
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
          
          <CardContent>
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">
                    {result.summary.totalProcessed}
                  </div>
                  <div className="text-sm text-green-600">Transactions</div>
                </div>
                
                <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">
                    {result.summary.totalRoundups}
                  </div>
                  <div className="text-sm text-blue-600">Roundups</div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">
                    ${result.summary.totalRoundupAmount}
                  </div>
                  <div className="text-sm text-purple-600">Total Saved</div>
                </div>
                
                <div className="text-center p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-2xl font-bold text-slate-700">
                    {result.summary.errors}
                  </div>
                  <div className="text-sm text-slate-600">Errors</div>
                </div>
              </div>

              {/* Success Message */}
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  {result.message}
                </AlertDescription>
              </Alert>

              {/* Error Details (if any) */}
              {result.errors && result.errors.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-slate-900 flex items-center">
                    <XCircle className="h-4 w-4 mr-2 text-red-500" />
                    Errors Found ({result.errors.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {result.errors.slice(0, 5).map((error, index) => (
                      <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="text-sm">
                          <span className="font-medium text-red-700">Line {error.line}:</span>
                          <span className="text-red-600 ml-2">{error.error}</span>
                        </div>
                      </div>
                    ))}
                    {result.errors.length > 5 && (
                      <div className="text-sm text-slate-600 text-center py-2">
                        And {result.errors.length - 5} more errors...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3">
                <Button
                  onClick={() => {
                    resetModal()
                    // Keep modal open for another upload
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Another File
                </Button>
                <Button
                  onClick={handleClose}
                  className="flex-1 bg-slate-900 hover:bg-slate-800"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Done
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main upload interface
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <CardTitle className="text-xl font-bold flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Upload Transactions CSV
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
            disabled={isUploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Uploading...</span>
                  <span className="text-sm text-slate-600">{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-slate-600">
                  Processing your transactions and calculating roundups...
                </p>
              </div>
            )}

            {/* File Drop Zone */}
            {!isUploading && (
              <>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-slate-400 bg-slate-50'
                      : selectedFile
                      ? 'border-green-300 bg-green-50'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {selectedFile ? (
                    <div className="space-y-4">
                      <File className="h-12 w-12 text-green-600 mx-auto" />
                      <div>
                        <p className="font-medium text-green-700">{selectedFile.name}</p>
                        <p className="text-sm text-green-600">
                          {formatFileSize(selectedFile.size)} • Ready to upload
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                      >
                        Choose Different File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 text-slate-400 mx-auto" />
                      <div>
                        <p className="text-lg font-medium text-slate-700">
                          Drop your CSV file here
                        </p>
                        <p className="text-slate-500">or click to browse</p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <File className="h-4 w-4 mr-2" />
                        Choose File
                      </Button>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </>
            )}

            {/* CSV Template Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-blue-900">CSV Format Requirements</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Your CSV should include columns: <strong>merchant</strong>, <strong>amount</strong>, <strong>category</strong>, <strong>date</strong>
                    </p>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {!isUploading && (
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile}
                  className="flex-1 bg-slate-900 hover:bg-slate-800"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Transactions
                </Button>
              </div>
            )}

            {/* Help Text */}
            <div className="text-sm text-slate-600 space-y-2">
              <p><strong>Supported formats:</strong> CSV files up to 5MB</p>
              <p><strong>Date formats:</strong> YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY</p>
              <p><strong>Amount format:</strong> Numbers with or without currency symbols</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}