// src/components/ui/PortfolioGrowthChart.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { TrendingUp, Calendar, DollarSign, Activity } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { format, parseISO } from 'date-fns'
import { walletAPI } from '@/lib/api'

interface HistoryData {
  date: string
  amountAdded: number
  totalBalance: number
  growth: number
  contributions: number
  growthRate: number
}

interface PortfolioGrowthChartProps {
  className?: string
}

export default function PortfolioGrowthChart({ className }: PortfolioGrowthChartProps) {
  const [historyData, setHistoryData] = useState<HistoryData[]>([])
  const [summaryData, setSummaryData] = useState<any>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const periods = [
    { key: '7d', label: '7 Days', shortLabel: '7D' },
    { key: '30d', label: '30 Days', shortLabel: '30D' },
    { key: '90d', label: '90 Days', shortLabel: '90D' },
    { key: '1y', label: '1 Year', shortLabel: '1Y' }
  ] as const

  useEffect(() => {
    fetchHistoryData()
  }, [selectedPeriod])

  const fetchHistoryData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await walletAPI.getWalletHistory(selectedPeriod)
      setHistoryData(response.history || [])
      setSummaryData(response.summary || {})
      
      console.log('📊 Backend Summary Data:', response.summary)
      console.log('📈 Backend Total Growth:', response.summary?.totalGrowth)
      console.log('📈 Backend Period Growth:', response.summary?.growthThisPeriod)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load chart data')
      console.error('Portfolio history error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Format data for chart
  const chartData = historyData.map(item => ({
    ...item,
    date: format(parseISO(item.date), selectedPeriod === '1y' ? 'MMM yyyy' : 'MMM dd'),
    formattedBalance: `$${item.totalBalance.toFixed(2)}`,
    formattedAdded: `$${item.amountAdded.toFixed(2)}`,
    formattedGrowth: `$${item.growth?.toFixed(2) || '0.00'}`
  }))

  // ✅ USE BACKEND CALCULATED VALUES INSTEAD OF FRONTEND MATH
  const totalGrowth = summaryData?.totalGrowth || 0
  const periodGrowth = summaryData?.growthThisPeriod || 0
  const currentBalance = summaryData?.currentBalance || 0
  const totalContributions = summaryData?.totalContributions || 0
  
  // Calculate growth percentage using CORRECT values
  const growthPercentage = totalContributions > 0 
  ? (periodGrowth / totalContributions) * 100  
  : 0

  const totalAdded = historyData.reduce((sum, item) => sum + item.amountAdded, 0)

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Activity className="h-12 w-12 text-red-300 mx-auto mb-4" />
          <p className="text-red-600 mb-2">Unable to load portfolio data</p>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <Button onClick={fetchHistoryData} size="sm" variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl text-slate-900 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
              Portfolio Growth
            </CardTitle>
            <CardDescription>
              Track your micro-investment growth over time
            </CardDescription>
          </div>
          
          {/* Period Selector */}
          <div className="flex space-x-1 bg-slate-100 rounded-lg p-1">
            {periods.map((period) => (
              <Button
                key={period.key}
                variant={selectedPeriod === period.key ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedPeriod(period.key)}
                className={`h-8 px-3 text-xs font-medium transition-all ${
                  selectedPeriod === period.key
                    ? 'bg-white shadow-sm text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {period.shortLabel}
              </Button>
            ))}
          </div>
        </div>

        {/* Growth Summary - NOW USING CORRECT BACKEND VALUES */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-600 mb-1">Current Balance</p>
            <p className="text-lg font-bold text-slate-900">
              ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-slate-600 mb-1">Period Growth</p>
            <p className="text-lg font-bold text-green-600">
              {periodGrowth >= 0 ? '+' : ''}${periodGrowth.toFixed(2)}
            </p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-slate-600 mb-1">Added This Period</p>
            <p className="text-lg font-bold text-blue-600">
              ${totalAdded.toFixed(2)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
              <p className="text-slate-600 text-sm">Loading chart data...</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">No data available</p>
              <p className="text-sm text-slate-500">
                Add some transactions to see your portfolio growth
              </p>
            </div>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-lg">
                          <p className="text-sm font-medium text-slate-900 mb-2">{label}</p>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-600">Total Balance:</span>
                              <span className="text-sm font-semibold text-slate-900">
                                {data.formattedBalance}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-600">Growth:</span>
                              <span className="text-sm font-semibold text-green-600">
                                {data.formattedGrowth}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-600">Added:</span>
                              <span className="text-sm font-semibold text-blue-600">
                                {data.formattedAdded}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalBalance"
                  stroke="#0f172a"
                  strokeWidth={2}
                  fill="url(#balanceGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Growth Indicator - NOW USING CORRECT BACKEND VALUES */}
        {chartData.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center space-x-2">
              <Badge 
                variant={totalGrowth >= 0 ? "default" : "destructive"}
                className={totalGrowth >= 0 ? "bg-green-100 text-green-800" : ""}
              >
                {totalGrowth >= 0 ? '+' : ''}{growthPercentage.toFixed(3)}%
              </Badge>
              <span className="text-sm text-slate-600">
                over {periods.find(p => p.key === selectedPeriod)?.label.toLowerCase()}
              </span>
            </div>
            
            <div className="text-right">
              <p className="text-xs text-slate-600">
                Total growth: ${totalGrowth.toFixed(2)} | Contributions: ${totalContributions.toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}