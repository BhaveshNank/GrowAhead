'use client'

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  DollarSign, 
  PlusCircle, 
  Upload, 
  Calendar, 
  CreditCard, 
  Target, 
  Wallet,
  Activity,
  AlertCircle,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Bell
} from "lucide-react"
import { useAuthStore } from '@/stores/authStore'
import { useDashboardStore } from '@/stores/dashboardStore'
import AuthWrapper from '@/components/ui/AuthWrapper'
import AddTransactionModal from '@/components/ui/AddTransactionModal'
import CSVUploadModal from '@/components/ui/CSVUploadModal'
import PortfolioGrowthChart from '@/components/ui/PortfolioGrowthChart'
import InteractiveCategoryChart from '@/components/ui/InteractiveCategoryChart'
import SavingsTrendsChart from '@/components/ui/SavingsTrendsChart'
import GoalProgressTracker from '@/components/ui/GoalProgressTracker'
import InvestmentProjections from '@/components/ui/InvestmentProjections'
import NotificationSystem from '@/components/ui/NotificationSystem'

// Simplified User Dropdown Component
function UserDropdown() {
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = () => {
    logout()
    setIsOpen(false)
  }

  const handleAccountSettings = () => {
    router.push('/settings')
    setIsOpen(false)
  }

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="relative">
      {/* User Button - No rectangular box, just round avatar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
      >
        {/* Larger, more visible user avatar */}
        <div className="w-9 h-9 bg-gradient-to-r from-slate-900 to-slate-700 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm">
          {user?.name ? getInitials(user.name) : <User className="h-4 w-4" />}
        </div>
        <span className="text-sm font-medium text-slate-700">
          {user?.name?.split(' ')[0] || 'User'}
        </span>
        <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
            {/* User Info Header */}
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-slate-900 to-slate-700 rounded-full flex items-center justify-center text-white font-medium">
                  {user?.name ? getInitials(user.name) : <User className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{user?.name || 'User'}</p>
                  <p className="text-xs text-slate-600">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <button
                onClick={handleAccountSettings}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-3"
              >
                <Settings className="h-4 w-4" />
                <span>Account Settings</span>
              </button>
              
              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-3"
              >
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
              </button>
              
              <div className="border-t border-slate-100 mt-2 pt-2">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function DashboardContent() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { 
    walletData,
    recentTransactions, 
    categoryBreakdown,
    projections,
    isLoading,
    error,
    refreshAllData,
    clearError
  } = useDashboardStore()

  // Modal states
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false)
  const [isCSVUploadOpen, setIsCSVUploadOpen] = useState(false)

  useEffect(() => {
    console.log('Loading enhanced dashboard data...')
    refreshAllData()
  }, [refreshAllData])

  const handleTransactionSuccess = () => {
    refreshAllData()
  }

  // Calculate derived data from real backend response
  const totalBalance = walletData?.wallet?.totalBalance || 0
  const thisWeekSavings = walletData?.summary?.thisWeek || 0
  const thisMonthSavings = walletData?.summary?.thisMonth || 0
  const avgMonthlyContribution = walletData?.summary?.avgMonthlyContribution || 0
  const riskProfile = walletData?.investment?.riskProfile || 'balanced'
  const oneYearProjection = walletData?.investment?.projections?.oneYear || 0

  // Mock monthly growth calculation (you can enhance this with real data)
  const monthlyGrowth = walletData?.summary?.monthlyGrowthRate || 0

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Something went wrong</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <Button onClick={() => {
              clearError()
              refreshAllData()
            }}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your enhanced GrowAhead dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50/50">
        {/* Header */}
        <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-slate-900 to-slate-700 rounded-lg flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900">GrowAhead</h1>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <NotificationSystem 
                  goals={[]} // Will be populated with actual goals
                  currentBalance={totalBalance}
                  monthlyContribution={avgMonthlyContribution}
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsAddTransactionOpen(true)}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
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
                {/* Updated User Dropdown */}
                <UserDropdown />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Welcome{user?.name ? `, ${user.name}` : ''}!
            </h2>
            <p className="text-slate-600">
              Analytics dashboard to explore investment trends and learn how micro-investing builds wealth over time
            </p>
          </div>

          {/* Hero Section */}
          <div className="mb-8">
            <Card className="bg-gradient-to-r from-slate-900 to-slate-700 text-white border-0 shadow-xl">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm mb-2">Total Portfolio Value</p>
                    <h2 className="text-5xl font-bold mb-3">
                      ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center text-green-400">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        <span className="text-sm font-medium">
                          {monthlyGrowth > 0 ? '+' : ''}{monthlyGrowth.toFixed(1)}% this month
                        </span>
                      </div>
                      <div className="text-slate-300 text-sm">
                        ${thisMonthSavings.toFixed(2)} added this month
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-300 text-sm mb-2">Investment Strategy</p>
                    <Badge className="bg-green-600/90 text-white mb-3 capitalize">
                      {riskProfile} Portfolio
                    </Badge>
                    <div className="text-slate-300 text-xs">
                      Projected 1yr: ${oneYearProjection.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  This Week
                </CardTitle>
                <Calendar className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  ${thisWeekSavings.toFixed(2)}
                </div>
                <p className="text-xs text-slate-600">
                  Roundup savings
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  This Month
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  ${thisMonthSavings.toFixed(2)}
                </div>
                <p className="text-xs text-slate-600">
                  {monthlyGrowth > 0 ? '+' : ''}{monthlyGrowth.toFixed(0)}% growth
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Monthly Avg
                </CardTitle>
                <DollarSign className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  ${avgMonthlyContribution.toFixed(2)}
                </div>
                <p className="text-xs text-slate-600">
                  Average contribution
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Strategy
                </CardTitle>
                <Activity className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 capitalize">
                  {riskProfile}
                </div>
                <p className="text-xs text-slate-600">
                  Investment profile
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Analytics Section */}
          <div className="space-y-8">
            {/* Full Analytics Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <PortfolioGrowthChart />
              <SavingsTrendsChart />
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <InteractiveCategoryChart />
              <GoalProgressTracker 
                currentBalance={totalBalance}
                monthlyContribution={avgMonthlyContribution}
              />
            </div>

            {/* Investment Projections - Full Width */}
            <InvestmentProjections className="col-span-full" />
            
            {/* Recent Activity - Full Width */}
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg text-slate-900 flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    Recent Activity • Detailed View
                  </CardTitle>
                  <CardDescription>
                    Complete transaction history with enhanced details
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/transactions')}
                >
                  View All Transactions
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentTransactions && recentTransactions.length > 0 ? (
                    recentTransactions.slice(0, 6).map((transactionItem, index) => (
                      <div 
                        key={transactionItem.id || index} 
                        className="p-4 border border-slate-200 rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
                        onClick={() => router.push('/transactions')}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 flex items-center justify-center">
                            <CreditCard className="h-3 w-3 text-slate-600" />
                          </div>
                          <Badge variant="outline" className="text-xs">
                            +${transactionItem.roundupAmount?.toFixed(2) || '0.00'}
                          </Badge>
                        </div>
                        <p className="font-medium text-slate-900 text-sm mb-1">
                          {transactionItem.transaction?.merchant || 'Unknown Merchant'}
                        </p>
                        <p className="text-xs text-slate-600 mb-2">
                          ${transactionItem.transaction?.originalAmount?.toFixed(2) || '0.00'} • {transactionItem.transaction?.category || 'Uncategorized'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(transactionItem.transaction?.date || transactionItem.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8">
                      <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-600 mb-2">No transactions yet</p>
                      <p className="text-sm text-slate-500 mb-4">Add your first transaction to start growing your savings</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddTransactionOpen}
        onClose={() => setIsAddTransactionOpen(false)}
        onSuccess={handleTransactionSuccess}
      />
      
      <CSVUploadModal
        isOpen={isCSVUploadOpen}
        onClose={() => setIsCSVUploadOpen(false)}
        onSuccess={handleTransactionSuccess}
      />
    </>
  )
}

export default function Dashboard() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthWrapper>
      <DashboardContent />
    </AuthWrapper>
  )
}// CD Pipeline Test
