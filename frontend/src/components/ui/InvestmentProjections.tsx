// src/components/ui/InvestmentProjections.tsx - Updated with Blue Colors
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { Input } from "./input"
import { Label } from "./label"
import { 
  TrendingUp, 
  Calculator, 
  Target, 
  DollarSign, 
  Calendar,
  BarChart3,
  Sliders,
  ArrowRight,
  PiggyBank,
  TrendingDown,
  AlertCircle
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { projectionsAPI } from '@/lib/api'

interface ProjectionData {
  currentProfile: {
    name: string
    returnRate: number
    currentBalance: number
    avgMonthlyContribution: number
  }
  projections: {
    oneYear: number
    threeYears: number
    fiveYears: number
    tenYears: number
  }
  comparisonProfiles: Array<{
    name: string
    returnRate: number
    description: string
    projections: {
      oneYear: number
      threeYears: number
      fiveYears: number
      tenYears: number
    }
  }>
}

interface CustomProjection {
  currentBalance: string
  monthlyContribution: string
  annualReturnRate: string
  timeHorizonYears: string
}

interface InvestmentProjectionsProps {
  className?: string
}

export default function InvestmentProjections({ className }: InvestmentProjectionsProps) {
  const [projectionData, setProjectionData] = useState<ProjectionData | null>(null)
  const [customProjection, setCustomProjection] = useState<CustomProjection>({
    currentBalance: '',
    monthlyContribution: '',
    annualReturnRate: '7',
    timeHorizonYears: '10'
  })
  const [customResult, setCustomResult] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'calculator' | 'comparison'>('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjectionData()
  }, [])

  useEffect(() => {
    if (projectionData && customProjection.currentBalance === '') {
      setCustomProjection(prev => ({
        ...prev,
        currentBalance: projectionData.currentProfile.currentBalance.toString(),
        monthlyContribution: projectionData.currentProfile.avgMonthlyContribution.toString()
      }))
    }
  }, [projectionData])

  const fetchProjectionData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await projectionsAPI.getProjections()
      setProjectionData(response)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load projections')
      console.error('Projections error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateCustomProjection = async () => {
    setIsCalculating(true)
    setError(null)

    try {
      const params = {
        currentBalance: parseFloat(customProjection.currentBalance) || 0,
        monthlyContribution: parseFloat(customProjection.monthlyContribution) || 0,
        annualReturnRate: parseFloat(customProjection.annualReturnRate) / 100,
        timeHorizonYears: parseFloat(customProjection.timeHorizonYears) || 1
      }

      const result = await projectionsAPI.getCustomProjection(params)
      setCustomResult(result)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to calculate projection')
    } finally {
      setIsCalculating(false)
    }
  }

  const tabs = [
    { key: 'overview', label: 'Overview', icon: TrendingUp },
    { key: 'calculator', label: 'Calculator', icon: Calculator },
    { key: 'comparison', label: 'Compare Profiles', icon: BarChart3 }
  ] as const

  if (error && !projectionData) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-300 mx-auto mb-4" />
          <p className="text-red-600 mb-2">Unable to load projections</p>
          <p className="text-sm text-slate-900 mb-4">{error}</p>
          <Button onClick={fetchProjectionData} size="sm" variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600 text-sm">Loading investment projections...</p>
        </CardContent>
      </Card>
    )
  }

  // Generate compound growth chart data
  const generateGrowthData = (balance: number, monthly: number, rate: number, years: number) => {
    const data = []
    let currentBalance = balance
    const monthlyRate = rate / 12

    for (let year = 0; year <= years; year++) {
      const totalContributions = balance + (monthly * 12 * year)
      
      if (year === 0) {
        data.push({
          year,
          balance: currentBalance,
          contributions: balance,
          growth: 0
        })
      } else {
        // Calculate compound growth for this year
        for (let month = 0; month < 12; month++) {
          currentBalance = currentBalance * (1 + monthlyRate) + monthly
        }
        
        const totalGrowth = currentBalance - totalContributions
        
        data.push({
          year,
          balance: currentBalance,
          contributions: totalContributions,
          growth: totalGrowth
        })
      }
    }
    
    return data
  }

  const currentProfile = projectionData?.currentProfile
  const projections = projectionData?.projections

  // Overview chart data
  const overviewData = projections ? [
    { period: '1 Year', value: projections.oneYear, years: 1 },
    { period: '3 Years', value: projections.threeYears, years: 3 },
    { period: '5 Years', value: projections.fiveYears, years: 5 },
    { period: '10 Years', value: projections.tenYears, years: 10 }
  ] : []

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl text-slate-900 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-slate-900" />
              Investment Projections
            </CardTitle>
            <CardDescription>
              Detailed projection calculator with "What if" scenarios
            </CardDescription>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-slate-100 rounded-lg p-1 mt-4">
          {tabs.map((tab) => {
            const TabIcon = tab.icon
            return (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.key)}
                className={`h-8 px-3 text-xs font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-white shadow-sm text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <TabIcon className="h-3 w-3 mr-1" />
                {tab.label}
              </Button>
            )
          })}
        </div>
      </CardHeader>

      <CardContent>
        {/* Overview Tab */}
        {activeTab === 'overview' && currentProfile && (
          <div className="space-y-6">
            {/* Current Profile Summary */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-600 mb-1">Current Balance</p>
                <p className="text-lg font-bold text-slate-900">
                  ${currentProfile.currentBalance.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-slate-600 mb-1">Monthly Avg</p>
                <p className="text-lg font-bold text-slate-600">
                  ${currentProfile.avgMonthlyContribution.toFixed(2)}
                </p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-slate-600 mb-1">Return Rate</p>
                <p className="text-lg font-bold text-green-600">
                  {(currentProfile.returnRate * 100).toFixed(1)}%
                </p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-slate-600 mb-1">Risk Profile</p>
                <p className="text-lg font-bold text-purple-600 capitalize">
                  {currentProfile.name}
                </p>
              </div>
            </div>

            {/* Projection Timeline - Changed green bars to blue */}
            <div className="h-80">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Growth Projections</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overviewData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="period" 
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
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        const contributions = currentProfile.currentBalance + (currentProfile.avgMonthlyContribution * 12 * data.years)
                        const growth = data.value - contributions
                        
                        return (
                          <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-lg">
                            <p className="text-sm font-medium text-slate-900 mb-2">{label}</p>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-600">Total Value:</span>
                                <span className="text-sm font-semibold text-slate-900">
                                  ${data.value.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-600">Contributions:</span>
                                <span className="text-sm font-semibold text-blue-600">
                                  ${contributions.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-600">Growth:</span>
                                <span className="text-sm font-semibold text-green-600">
                                  ${growth.toLocaleString()}
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
                    dataKey="value" 
                    fill="#1f2937"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Key Insights - Updated to focus on dollar amounts instead of percentages */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center">
                <PiggyBank className="h-4 w-4 mr-2" />
                Key Insights
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-700">
                <div>
                  • In 10 years, your portfolio could reach <strong>${projections?.tenYears.toLocaleString()}</strong>
                </div>
                <div>
                  • Investment growth of <strong>${((projections?.tenYears || 0) - currentProfile.currentBalance - (currentProfile.avgMonthlyContribution * 12 * 10)).toLocaleString()}</strong> over 10 years
                </div>
                <div>
                  • Monthly contributions of <strong>${currentProfile.avgMonthlyContribution.toFixed(2)}</strong> compound significantly
                </div>
                <div>
                  • Small amounts invested consistently can build substantial wealth
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calculator Tab */}
        {activeTab === 'calculator' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Panel */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 flex items-center">
                  <Sliders className="h-4 w-4 mr-2" />
                  Adjust Parameters
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="current-balance" className="text-xs">Current Balance ($)</Label>
                    <Input
                      id="current-balance"
                      type="number"
                      placeholder="1000"
                      value={customProjection.currentBalance}
                      onChange={(e) => setCustomProjection(prev => ({ ...prev, currentBalance: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="monthly-contribution" className="text-xs">Monthly Contribution ($)</Label>
                    <Input
                      id="monthly-contribution"
                      type="number"
                      placeholder="100"
                      value={customProjection.monthlyContribution}
                      onChange={(e) => setCustomProjection(prev => ({ ...prev, monthlyContribution: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="return-rate" className="text-xs">Annual Return Rate (%)</Label>
                    <Input
                      id="return-rate"
                      type="number"
                      min="0"
                      max="20"
                      step="0.1"
                      placeholder="7.0"
                      value={customProjection.annualReturnRate}
                      onChange={(e) => setCustomProjection(prev => ({ ...prev, annualReturnRate: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="time-horizon" className="text-xs">Time Horizon (Years)</Label>
                    <Input
                      id="time-horizon"
                      type="number"
                      min="1"
                      max="50"
                      placeholder="10"
                      value={customProjection.timeHorizonYears}
                      onChange={(e) => setCustomProjection(prev => ({ ...prev, timeHorizonYears: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <Button 
                    onClick={calculateCustomProjection}
                    disabled={isCalculating}
                    className="w-full"
                  >
                    {isCalculating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Calculating...
                      </>
                    ) : (
                      <>
                        <Calculator className="h-4 w-4 mr-2" />
                        Calculate Projection
                      </>
                    )}
                  </Button>
                </div>

                {/* Quick Scenarios */}
                <div className="mt-6">
                  <h5 className="text-xs font-semibold text-slate-900 mb-2">Quick Scenarios</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomProjection(prev => ({ ...prev, monthlyContribution: (parseFloat(prev.monthlyContribution) * 2).toString() }))}
                      className="text-xs"
                    >
                      Double Contributions
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomProjection(prev => ({ ...prev, annualReturnRate: '10' }))}
                      className="text-xs"
                    >
                      Aggressive Growth
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomProjection(prev => ({ ...prev, annualReturnRate: '4' }))}
                      className="text-xs"
                    >
                      Conservative
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomProjection(prev => ({ ...prev, timeHorizonYears: '20' }))}
                      className="text-xs"
                    >
                      Long Term
                    </Button>
                  </div>
                </div>
              </div>

              {/* Results Panel */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900">Results</h4>
                
                {customResult ? (
                  <div className="space-y-4">
                    {/* Key Metrics - Changed green to blue */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-blue-50 rounded-lg text-center">
                        <p className="text-xs text-slate-600 mb-1">Future Value</p>
                        <p className="text-lg font-bold text-blue-600">
                          ${parseFloat(customResult.projection.futureValue).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg text-center">
                        <p className="text-xs text-slate-600 mb-1">Total Growth</p>
                        <p className="text-lg font-bold text-green-600">
                          ${parseFloat(customResult.projection.totalGrowth).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="p-4 border border-slate-200 rounded-lg">
                      <h5 className="text-sm font-semibold text-slate-900 mb-3">Breakdown</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Initial Balance:</span>
                          <span className="font-medium">${parseFloat(customProjection.currentBalance).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total Contributions:</span>
                          <span className="font-medium">${parseFloat(customResult.projection.totalContributions).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Investment Growth:</span>
                          <span className="font-medium text-green-600">${parseFloat(customResult.projection.totalGrowth).toLocaleString()}</span>
                        </div>
                        <hr className="my-2" />
                        <div className="flex justify-between font-semibold">
                          <span>Final Value:</span>
                          <span className="text-slate-600">${parseFloat(customResult.projection.futureValue).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Growth Chart - Changed green line to blue */}
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                          data={generateGrowthData(
                            parseFloat(customProjection.currentBalance),
                            parseFloat(customProjection.monthlyContribution),
                            parseFloat(customProjection.annualReturnRate) / 100,
                            parseFloat(customProjection.timeHorizonYears)
                          )}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="year" 
                            stroke="#1f2937"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="#1f2937"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                          />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload
                                return (
                                  <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                                    <p className="text-sm font-medium text-slate-900 mb-2">Year {label}</p>
                                    <div className="space-y-1 text-xs">
                                      <div className="flex justify-between">
                                        <span className="text-slate-600">Balance:</span>
                                        <span className="font-semibold">${data.balance.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-600">Growth:</span>
                                        <span className="font-semibold text-green-600">${data.growth.toLocaleString()}</span>
                                      </div>
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="balance"
                            stroke="#64748b"
                            strokeWidth={2}
                            dot={{ fill: '#1f2937', strokeWidth: 2, r: 3 }}
                            activeDot={{ r: 5, stroke: '#1f2937', strokeWidth: 2 }}

                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
                    <div className="text-center">
                      <Calculator className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-900 text-sm">Enter parameters and calculate to see results</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Comparison Tab */}
        {activeTab === 'comparison' && projectionData?.comparisonProfiles && (
          <div className="space-y-6">
            <h4 className="text-sm font-semibold text-slate-900">Risk Profile Comparison</h4>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {projectionData.comparisonProfiles.map((profile, index) => {
                const isCurrentProfile = profile.name === projectionData.currentProfile.name
                const growth10Year = profile.projections.tenYears - projectionData.currentProfile.currentBalance
                
                return (
                  <Card 
                    key={profile.name} 
                    className={`relative ${isCurrentProfile ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''}`}
                  >
                    {isCurrentProfile && (
                      <Badge className="absolute -top-2 left-3 bg-blue-600 text-white">
                        Current
                      </Badge>
                    )}
                    
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg capitalize">{profile.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {profile.description}
                      </CardDescription>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-900">
                          {(profile.returnRate * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-900">Annual Return</p>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">1 Year:</span>
                          <span className="font-semibold">${profile.projections.oneYear.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">5 Years:</span>
                          <span className="font-semibold">${profile.projections.fiveYears.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">10 Years:</span>
                          <span className="font-semibold text-slate-600">${profile.projections.tenYears.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-slate-200">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">10-Year Growth:</span>
                          <span className={`font-semibold ${growth10Year > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${growth10Year.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Comparison Chart */}
            <div className="h-80">
              <h5 className="text-sm font-semibold text-slate-900 mb-3">10-Year Projection Comparison</h5>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={projectionData.comparisonProfiles.map(profile => ({
                    name: profile.name,
                    value: profile.projections.tenYears,
                    rate: (profile.returnRate * 100).toFixed(1)
                  }))}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
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
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-lg">
                            <p className="text-sm font-medium text-slate-900 mb-2 capitalize">{label} Profile</p>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-600">10-Year Value:</span>
                                <span className="text-sm font-semibold text-slate-900">
                                  ${data.value.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-600">Return Rate:</span>
                                <span className="text-sm font-semibold text-green-600">
                                  {data.rate}%
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
                    dataKey="value"
                    radius={[4, 4, 0, 0]}
                  >
                    {projectionData.comparisonProfiles.map((entry, index) => (
                      <Bar 
                        key={`cell-${index}`}
                        fill={entry.name === projectionData.currentProfile.name ? '#2563eb' : '#64748b'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}