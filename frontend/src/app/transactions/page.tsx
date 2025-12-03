// src/app/transactions/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft,
  Search,
  Filter,
  Plus,
  Upload,
  Edit,
  Trash2,
  Calendar,
  CreditCard,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  Home
} from 'lucide-react'
import { transactionsAPI, Transaction } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { formatRelativeTime, formatCurrency, debounce } from '@/lib/utils'
import AuthWrapper from '@/components/ui/AuthWrapper'
import AddTransactionModal from '@/components/ui/AddTransactionModal'
import CSVUploadModal from '@/components/ui/CSVUploadModal'
import EditTransactionModal from '@/components/ui/EditTransactionModal'
import DeleteTransactionModal from '@/components/ui/DeleteTransactionModal'

interface PaginationInfo {
  page: number
  limit: number
  totalPages: number
  totalTransactions: number
}

const CATEGORIES = [
  'All Categories',
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

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

function TransactionsPageContent() {
  const router = useRouter()
  const { user } = useAuthStore()

  // Data state
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 25,
    totalPages: 1,
    totalTransactions: 0
  })
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Categories')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modal states
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false)
  const [isCSVUploadOpen, setIsCSVUploadOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null)

  // Success message state
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Fetch transactions with filters
  const fetchTransactions = useCallback(async (resetPage = false) => {
    try {
      setIsLoading(true)
      setError(null)

      const params: any = {
        page: resetPage ? 1 : pagination.page,
        limit: pagination.limit
      }

      // Add filters if they exist
      if (selectedCategory !== 'All Categories') {
        params.category = selectedCategory
      }
      if (startDate) {
        params.startDate = startDate
      }
      if (endDate) {
        params.endDate = endDate
      }

      const response = await transactionsAPI.getTransactions(params)
      
      // Filter by search term on frontend
      let filteredTransactions = response.transactions
      if (searchTerm.trim()) {
        filteredTransactions = response.transactions.filter(transaction =>
          transaction.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.category?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      setTransactions(filteredTransactions)
      setPagination({
        ...response.pagination,
        page: resetPage ? 1 : response.pagination.page
      })

    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to fetch transactions')
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.limit, selectedCategory, startDate, endDate, searchTerm])

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(() => {
      fetchTransactions(true) // Reset to page 1 when searching
    }, 500),
    [fetchTransactions]
  )

  // Initial load
  useEffect(() => {
    fetchTransactions()
  }, [])

  // Search effect
  useEffect(() => {
    if (searchTerm !== '') {
      debouncedSearch()
    } else {
      fetchTransactions(true)
    }
  }, [searchTerm, debouncedSearch])

  // Filter effects
  useEffect(() => {
    fetchTransactions(true)
  }, [selectedCategory, startDate, endDate, pagination.limit])

  // Pagination effect
  useEffect(() => {
    if (pagination.page > 1) {
      fetchTransactions()
    }
  }, [pagination.page])

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  // Handle items per page change
  const handleLimitChange = (newLimit: string) => {
    setPagination(prev => ({ 
      ...prev, 
      limit: parseInt(newLimit), 
      page: 1 
    }))
  }

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchTransactions()
    setIsRefreshing(false)
  }

  // Handle successful operations
  const handleOperationSuccess = (message: string) => {
    setSuccessMessage(message)
    fetchTransactions() // Refresh the list
    setTimeout(() => setSuccessMessage(null), 5000)
  }

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCategory('All Categories')
    setStartDate('')
    setEndDate('')
  }

  // Export to CSV
  const exportToCSV = () => {
    const csvContent = [
      ['Merchant', 'Amount', 'Category', 'Date', 'Roundup'],
      ...transactions.map(t => [
        t.merchant,
        t.amount,
        t.category || '',
        t.transactionDate,
        t.roundupAmount || 0
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `growahead-transactions-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Transactions</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <div className="flex space-x-2">
              <Button onClick={() => router.push('/')} variant="outline" className="flex-1">
                Back to Dashboard
              </Button>
              <Button onClick={handleRefresh} className="flex-1">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50/50">
        {/* Header - Improved with better styling */}
        <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Improved Back Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/')}
                  className="flex items-center hover:bg-slate-100 transition-all"
                >
                  <Home className="h-4 w-4 mr-2" />
                  <span className="font-medium">Dashboard</span>
                </Button>
                <div className="border-l border-slate-300 h-8"></div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
                  <p className="text-sm text-slate-600">
                    {pagination.totalTransactions} total transactions
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={transactions.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsAddTransactionOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
                <Button 
                  size="sm" 
                  className="bg-slate-900 hover:bg-slate-800"
                  onClick={() => setIsCSVUploadOpen(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CSV
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          {/* Success Message */}
          {successMessage && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Search & Filter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search merchants, categories..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
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

                {/* Date Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex items-center justify-between mt-4">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Select value={pagination.limit.toString()} onValueChange={handleLimitChange}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option.toString()}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-slate-600">per page</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Transaction History</CardTitle>
                  <CardDescription>
                    Showing {transactions.length} of {pagination.totalTransactions} transactions
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading transactions...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 mb-2">No transactions found</p>
                  <p className="text-sm text-slate-500 mb-4">
                    {searchTerm || selectedCategory !== 'All Categories' || startDate || endDate
                      ? 'Try adjusting your filters or search terms'
                      : 'Add your first transaction to get started'
                    }
                  </p>
                  <div className="flex space-x-2 justify-center">
                    <Button 
                      onClick={() => setIsAddTransactionOpen(true)}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Transaction
                    </Button>
                    <Button 
                      onClick={() => setIsCSVUploadOpen(true)}
                      size="sm"
                      variant="outline"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload CSV
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Transaction Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 font-medium text-slate-700">Merchant</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-700">Amount</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-700">Category</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-700">Date</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-700">Roundup</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((transaction, index) => (
                          <tr 
                            key={transaction.id} 
                            className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 flex items-center justify-center">
                                  <CreditCard className="h-4 w-4 text-slate-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">{transaction.merchant}</p>
                                  <p className="text-xs text-slate-500">
                                    {formatRelativeTime(transaction.transactionDate)}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-medium text-slate-900">
                                {formatCurrency(transaction.amount)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {transaction.category && (
                                <Badge variant="outline" className="text-xs">
                                  {transaction.category}
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center text-sm text-slate-600">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(transaction.transactionDate).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-medium text-green-600">
                                +{formatCurrency(transaction.roundupAmount || 0)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-1">
                                {/* Edit Button - Wired up! */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingTransaction(transaction)}
                                  className="h-8 w-8 p-0 hover:bg-slate-100"
                                  title="Edit transaction"
                                >
                                  <Edit className="h-4 w-4 text-slate-600" />
                                </Button>
                                {/* Delete Button - Wired up! */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingTransaction(transaction)}
                                  className="h-8 w-8 p-0 hover:bg-red-50"
                                  title="Delete transaction"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
                      <div className="text-sm text-slate-600">
                        Page {pagination.page} of {pagination.totalPages}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page === 1}
                        >
                          Previous
                        </Button>
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          const pageNum = i + 1
                          return (
                            <Button
                              key={pageNum}
                              variant={pagination.page === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page === pagination.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddTransactionOpen}
        onClose={() => setIsAddTransactionOpen(false)}
        onSuccess={() => handleOperationSuccess('Transaction added successfully!')}
      />
      
      <CSVUploadModal
        isOpen={isCSVUploadOpen}
        onClose={() => setIsCSVUploadOpen(false)}
        onSuccess={() => handleOperationSuccess('CSV uploaded successfully!')}
      />

      {/* Edit Modal - Wired up! */}
      {editingTransaction && (
        <EditTransactionModal
          isOpen={!!editingTransaction}
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSuccess={() => {
            handleOperationSuccess('Transaction updated successfully!')
            setEditingTransaction(null)
          }}
        />
      )}

      {/* Delete Modal - Wired up! */}
      {deletingTransaction && (
        <DeleteTransactionModal
          isOpen={!!deletingTransaction}
          transaction={deletingTransaction}
          onClose={() => setDeletingTransaction(null)}
          onSuccess={() => {
            handleOperationSuccess('Transaction deleted successfully!')
            setDeletingTransaction(null)
          }}
        />
      )}
    </>
  )
}

export default function TransactionsPage() {
  return (
    <AuthWrapper>
      <TransactionsPageContent />
    </AuthWrapper>
  )
}
