'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronDown, DollarSign, TrendingUp, Clock, Lightbulb } from 'lucide-react'

interface MoneyGrowthBreakdownProps {
  totalBalance: number
  totalContributions: number
  totalGrowth: number
  roundupCount: number
  monthsActive?: number
}

export default function MoneyGrowthBreakdown({
  totalBalance,
  totalContributions,
  totalGrowth,
  roundupCount,
  monthsActive = 1
}: MoneyGrowthBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const growthPercentage = totalContributions > 0 
    ? ((totalGrowth / totalContributions) * 100).toFixed(1)
    : '0.0'
  
  const contributionPercentage = totalBalance > 0
    ? ((totalContributions / totalBalance) * 100).toFixed(1)
    : '0.0'

  return (
    <Card className="border-2 border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        {/* Header - Always Visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
              <Lightbulb className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                📊 How Your Money Grows
              </h3>
              <p className="text-sm text-slate-600">
                Understanding your ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} portfolio
              </p>
            </div>
          </div>
          <ChevronDown 
            className={`h-5 w-5 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Expandable Content */}
        {isExpanded && (
          <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Breakdown Section */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-emerald-200">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-slate-900">Your Contributions</h4>
                    <span className="text-lg font-bold text-emerald-700">
                      ${totalContributions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">
                    Money you've invested through roundups
                  </p>
                  <div className="w-full bg-emerald-100 rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${contributionPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {contributionPercentage}% of total portfolio
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-green-200">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-slate-900">Investment Growth</h4>
                    <span className="text-lg font-bold text-green-700">
                      ${totalGrowth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">
                    Money your investments have earned
                  </p>
                  <div className="w-full bg-green-100 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${100 - parseFloat(contributionPercentage)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    +{growthPercentage}% return on your contributions
                  </p>
                </div>
              </div>
            </div>

            {/* Time Factor Section */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 mb-2">⏱️ Time at Work</h4>
                  <ul className="space-y-1.5 text-sm text-slate-700">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Older investments grow more than recent ones</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Your earliest roundups have had {monthsActive} {monthsActive === 1 ? 'month' : 'months'} to earn returns</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Recent transactions are just starting their growth journey</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Key Insight Section */}
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">💡</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 mb-2">🎯 Key Insight</h4>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    You've made <strong>{roundupCount} transactions</strong> without "feeling" the investment of{' '}
                    <strong className="text-emerald-700">
                      ${totalContributions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                    , and it's already grown to{' '}
                    <strong className="text-green-700">
                      ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                    ! This is the power of micro-investing: <em>small amounts + consistency + time = significant wealth</em>.
                  </p>
                </div>
              </div>
            </div>

            {/* Mathematical Breakdown */}
            <div className="p-4 bg-white rounded-lg border border-slate-200">
              <h4 className="font-semibold text-slate-900 mb-3">📐 The Math Behind Your Growth</h4>
              <div className="space-y-2 text-sm text-slate-700 font-mono">
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                  <span>Your Contributions:</span>
                  <span className="font-semibold text-emerald-700">
                    ${totalContributions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                  <span>+ Investment Growth:</span>
                  <span className="font-semibold text-green-700">
                    +${totalGrowth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-t-2 border-slate-300 my-2"></div>
                <div className="flex justify-between items-center p-2 bg-blue-50 rounded font-semibold">
                  <span>= Total Portfolio Value:</span>
                  <span className="text-blue-700 text-base">
                    ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
