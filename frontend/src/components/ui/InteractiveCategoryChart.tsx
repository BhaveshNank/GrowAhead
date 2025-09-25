// src/components/ui/InteractiveCategoryChart.tsx - Fixed Pie Chart
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { Target, PieChart, BarChart3, TrendingUp, CreditCard } from "lucide-react"
import { 
  PieChart as RechartsPieChart, 
  Pie,
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'
import { walletAPI } from '@/lib/api'

interface CategoryData {
  category: string
  transactionCount: number
  totalRoundups: number
  avgRoundup: number
}

interface InteractiveCategoryChartProps {
  className?: string
}

const COLORS = [
  '#0f172a', // slate-900
  '#475569', // slate-600
  '#64748b', // slate-500
  '#94a3b8', // slate-400
  '#cbd5e1', // slate-300
  '#e2e8f0', // slate-200
  '#f1f5f9', // slate-100
  '#1e293b', // slate-800
  '#334155', // slate-700
]

export default function InteractiveCategoryChart({ className }: InteractiveCategoryChartProps) {
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [viewMode, setViewMode] = useState<'pie' | 'bar'>('pie')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCategoryData()
  }, [])

  const fetchCategoryData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await walletAPI.getCategoryBreakdown()
      setCategoryData(response.categories || [])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load category data')
      console.error('Category breakdown error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate totals for percentages
  const totalRoundups = categoryData.reduce((sum, cat) => sum + cat.totalRoundups, 0)
  const totalTransactions = categoryData.reduce((sum, cat) => sum + cat.transactionCount, 0)

  // Format data for charts
  const chartData = categoryData.map((cat, index) => ({
    ...cat,
    percentage: totalRoundups > 0 ? (cat.totalRoundups / totalRoundups * 100) : 0,
    color: COLORS[index % COLORS.length]
  }))

  // Find top category
  const topCategory = chartData.reduce((max, cat) => 
    cat.totalRoundups > max.totalRoundups ? cat : max, 
    chartData[0] || { category: 'None', totalRoundups: 0, percentage: 0 }
  )

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Target className="h-12 w-12 text-red-300 mx-auto mb-4" />
          <p className="text-red-600 mb-2">Unable to load category data</p>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <Button onClick={fetchCategoryData} size="sm" variant="outline">
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
              <Target className="h-5 w-5 mr-2 text-blue-600" />
              Category Analytics
            </CardTitle>
            <CardDescription>
              Interactive breakdown of your savings by spending category
            </CardDescription>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex space-x-1 bg-slate-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'pie' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('pie')}
              className={`h-8 px-3 text-xs font-medium transition-all ${
                viewMode === 'pie'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <PieChart className="h-3 w-3 mr-1" />
              Pie
            </Button>
            <Button
              variant={viewMode === 'bar' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('bar')}
              className={`h-8 px-3 text-xs font-medium transition-all ${
                viewMode === 'bar'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <BarChart3 className="h-3 w-3 mr-1" />
              Bar
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 mb-1">Categories</p>
              <p className="text-lg font-bold text-slate-900">{chartData.length}</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-slate-600 mb-1">Top Category</p>
              <p className="text-lg font-bold text-blue-600 truncate">
                {topCategory.category}
              </p>
              <p className="text-xs text-slate-500">
                {topCategory.percentage.toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-slate-600 mb-1">Avg per Category</p>
              <p className="text-lg font-bold text-green-600">
                ${(totalRoundups / chartData.length).toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
              <p className="text-slate-600 text-sm">Loading category data...</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">No category data available</p>
              <p className="text-sm text-slate-500">
                Add transactions with categories to see the breakdown
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {viewMode === 'pie' ? (
                  <RechartsPieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalRoundups"
                    >
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          stroke={selectedCategory === entry.category ? '#0f172a' : 'transparent'}
                          strokeWidth={selectedCategory === entry.category ? 3 : 0}
                          style={{ 
                            cursor: 'pointer',
                            filter: selectedCategory === entry.category ? 'brightness(1.1)' : 'none'
                          }}
                          onClick={() => setSelectedCategory(
                            selectedCategory === entry.category ? null : entry.category
                          )}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-lg">
                              <p className="text-sm font-medium text-slate-900 mb-2">
                                {data.category}
                              </p>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-slate-600">Total Saved:</span>
                                  <span className="text-sm font-semibold text-slate-900">
                                    ${data.totalRoundups.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-slate-600">Percentage:</span>
                                  <span className="text-sm font-semibold text-blue-600">
                                    {data.percentage.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-slate-600">Transactions:</span>
                                  <span className="text-sm font-semibold text-slate-900">
                                    {data.transactionCount}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                  </RechartsPieChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="category" 
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={60}
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
                                  <span className="text-xs text-slate-600">Total Saved:</span>
                                  <span className="text-sm font-semibold text-slate-900">
                                    ${data.totalRoundups.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-slate-600">Avg per Transaction:</span>
                                  <span className="text-sm font-semibold text-green-600">
                                    ${data.avgRoundup.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-slate-600">Transactions:</span>
                                  <span className="text-sm font-semibold text-slate-900">
                                    {data.transactionCount}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar 
                      dataKey="totalRoundups" 
                      fill="#0f172a"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Category List */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">
                Category Breakdown
              </h4>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {chartData
                  .sort((a, b) => b.totalRoundups - a.totalRoundups)
                  .map((category, index) => (
                  <div 
                    key={category.category}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedCategory === category.category
                        ? 'border-slate-400 bg-slate-50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                    onClick={() => setSelectedCategory(
                      selectedCategory === category.category ? null : category.category
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {category.category}
                          </p>
                          <p className="text-xs text-slate-600">
                            {category.transactionCount} transaction{category.transactionCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          ${category.totalRoundups.toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-600">
                          {category.percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2">
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${category.percentage}%`,
                            backgroundColor: category.color
                          }}
                        />
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {selectedCategory === category.category && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-600">Avg per transaction:</span>
                            <span className="ml-1 font-semibold text-green-600">
                              ${category.avgRoundup.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600">Rank:</span>
                            <span className="ml-1 font-semibold text-slate-900">
                              #{index + 1} of {chartData.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Summary Footer */}
        {chartData.length > 0 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center space-x-2">
              <Badge className="bg-slate-100 text-slate-800">
                {chartData.length} Categories
              </Badge>
              <span className="text-sm text-slate-600">
                Total: ${totalRoundups.toFixed(2)} from {totalTransactions} transactions
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="text-slate-600 hover:text-slate-800"
            >
              Clear Selection
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}