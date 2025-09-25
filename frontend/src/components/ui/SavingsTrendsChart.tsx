// src/components/ui/SavingsTrendsChart.tsx - Simplified Version
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { TrendingUp, Calendar, BarChart3 } from "lucide-react"
import { walletAPI } from '@/lib/api'

interface MonthlyTrend {
  month: string
  savings: number
}

interface StatsData {
  stats: {
    totalTransactions: number
    totalRoundups: number
    totalSaved: number
    avgRoundup: number
    maxRoundup: number
    firstRoundupDate?: string
  }
  monthlyTrend: MonthlyTrend[]
}

interface SavingsTrendsChartProps {
  className?: string
}

export default function SavingsTrendsChart({ className }: SavingsTrendsChartProps) {
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStatsData()
  }, [])

  const fetchStatsData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await walletAPI.getWalletStats()
      setStatsData(response)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load savings trends')
      console.error('Savings trends error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!statsData) {
    if (error) {
      return (
        <Card className={className}>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-12 w-12 text-red-300 mx-auto mb-4" />
            <p className="text-red-600 mb-2">Unable to load trends data</p>
            <p className="text-sm text-slate-500 mb-4">{error}</p>
            <Button onClick={fetchStatsData} size="sm" variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600 text-sm">Loading trends data...</p>
        </CardContent>
      </Card>
    )
  }

  const { stats, monthlyTrend } = statsData

  // Process monthly trend data
  const chartData = monthlyTrend
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
    .map((item, index, array) => {
      const previousMonth = index > 0 ? array[index - 1].savings : 0
      const change = index > 0 ? item.savings - previousMonth : 0

      return {
        ...item,
        formattedMonth: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        change,
        isIncreasing: change > 0,
      }
    })

  // Calculate trend metrics
  const latestMonth = chartData[chartData.length - 1]
  const previousMonth = chartData[chartData.length - 2]
  const monthlyGrowth = latestMonth && previousMonth 
    ? ((latestMonth.savings - previousMonth.savings) / previousMonth.savings) * 100
    : 0

  const averageMonthlySavings = chartData.length > 0 
    ? chartData.reduce((sum, item) => sum + item.savings, 0) / chartData.length
    : 0

  const bestMonth = chartData.reduce((max, item) => 
    item.savings > max.savings ? item : max, 
    chartData[0] || { formattedMonth: 'N/A', savings: 0 }
  )

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl text-slate-900 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
              Savings Trends
            </CardTitle>
            <CardDescription>
              Monthly patterns and growth analysis of your micro-investments
            </CardDescription>
          </div>
        </div>

        {/* Trend Summary */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-600 mb-1">This Month</p>
            <p className="text-lg font-bold text-slate-900">
              ${latestMonth?.savings.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {monthlyGrowth > 0 ? '+' : ''}{monthlyGrowth.toFixed(1)}%
            </p>
          </div>
          
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-slate-600 mb-1">Monthly Avg</p>
            <p className="text-lg font-bold text-blue-600">
              ${averageMonthlySavings.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {chartData.length} months
            </p>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-slate-600 mb-1">Best Month</p>
            <p className="text-lg font-bold text-green-600">
              ${bestMonth.savings.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {bestMonth.formattedMonth}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="h-60 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
              <p className="text-slate-600 text-sm">Loading trends...</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-60 flex items-center justify-center">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">No trend data available</p>
              <p className="text-sm text-slate-500">
                Continue adding transactions to see monthly trends
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Simple bar visualization */}
            <div className="space-y-3">
              {chartData.slice(-6).map((item, index) => {
                const maxValue = Math.max(...chartData.map(d => d.savings))
                const width = maxValue > 0 ? (item.savings / maxValue) * 100 : 0
                
                return (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-16 text-xs text-slate-600 text-right">
                      {item.formattedMonth}
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-6 relative">
                      <div 
                        className="bg-slate-700 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(width, 5)}%` }}
                      >
                        <span className="text-xs text-white font-medium">
                          ${item.savings.toFixed(0)}
                        </span>
                      </div>
                    </div>
                    <div className="w-12 text-xs text-slate-600">
                      {item.change > 0 && '+'}
                      {item.change.toFixed(0)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Summary Footer */}
        {chartData.length > 0 && (
          <div className="border-t border-slate-100 pt-4 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {chartData.length} months tracked
                </Badge>
                <Badge 
                  variant={monthlyGrowth > 0 ? "default" : "destructive"}
                  className={`text-xs ${monthlyGrowth > 0 ? 'bg-green-100 text-green-800' : ''}`}
                >
                  {monthlyGrowth > 0 ? '+' : ''}{monthlyGrowth.toFixed(1)}% this month
                </Badge>
              </div>
              
              <p className="text-xs text-slate-600">
                Total: ${chartData.reduce((sum, item) => sum + item.savings, 0).toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}