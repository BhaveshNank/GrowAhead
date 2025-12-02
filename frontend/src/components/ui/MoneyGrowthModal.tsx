'use client'

import { useState } from 'react'
import { X, DollarSign, TrendingUp, Clock, Lightbulb, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MoneyGrowthModalProps {
  isOpen: boolean
  onClose: () => void
  totalBalance: number
  totalContributions: number
  totalGrowth: number
  roundupCount: number
  monthsActive?: number
}

export default function MoneyGrowthModal({
  isOpen,
  onClose,
  totalBalance,
  totalContributions,
  totalGrowth,
  roundupCount,
  monthsActive = 1
}: MoneyGrowthModalProps) {
  if (!isOpen) return null
  
  const growthPercentage = totalContributions > 0 
    ? ((totalGrowth / totalContributions) * 100).toFixed(1)
    : '0.0'
  
  const contributionPercentage = totalBalance > 0
    ? ((totalContributions / totalBalance) * 100).toFixed(1)
    : '0.0'

  const hasGrowth = totalGrowth > 0
  const hasLoss = totalGrowth < 0

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-700 text-white p-6 rounded-t-xl border-b border-slate-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-lg bg-slate-700/50 backdrop-blur flex items-center justify-center border border-slate-600">
                  <Lightbulb className="h-6 w-6 text-slate-200" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Understanding Your Portfolio</h2>
                  <p className="text-slate-300 text-sm mt-0.5">Portfolio Value: ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-300 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Breakdown Section */}
            <div className="space-y-4">
              <div className="flex items-start space-x-4 p-5 bg-white rounded-lg border border-slate-200 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-slate-900">Your Contributions</h4>
                    <span className="text-xl font-bold text-emerald-700">
                      ${totalContributions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">
                    Money you've invested through roundups
                  </p>
                  <div className="w-full bg-emerald-100 rounded-full h-2.5">
                    <div 
                      className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${contributionPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {contributionPercentage}% of total portfolio
                  </p>
                </div>
              </div>

              <div className={`flex items-start space-x-4 p-5 bg-white rounded-lg border shadow-sm ${
                hasGrowth ? 'border-green-200' : 
                hasLoss ? 'border-red-200' : 
                'border-slate-200'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  hasGrowth ? 'bg-green-500' : 
                  hasLoss ? 'bg-red-500' : 
                  'bg-slate-500'
                }`}>
                  {hasLoss ? (
                    <TrendingDown className="h-5 w-5 text-white" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-slate-900">
                      {hasGrowth ? 'Investment Growth' : hasLoss ? 'Investment Change' : 'No Growth Yet'}
                    </h4>
                    <span className={`text-xl font-bold ${
                      hasGrowth ? 'text-green-700' : 
                      hasLoss ? 'text-red-700' : 
                      'text-slate-700'
                    }`}>
                      {hasGrowth ? '+' : ''}${Math.abs(totalGrowth).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">
                    {hasGrowth ? 'Money your investments have earned' : 
                     hasLoss ? 'This is a simulation - real markets can fluctuate' : 
                     'Your investments need more time to grow'}
                  </p>
                  <div className={`w-full rounded-full h-2.5 ${
                    hasGrowth ? 'bg-green-100' : 
                    hasLoss ? 'bg-red-100' : 
                    'bg-slate-100'
                  }`}>
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        hasGrowth ? 'bg-green-500' : 
                        hasLoss ? 'bg-red-500' : 
                        'bg-slate-500'
                      }`}
                      style={{ width: `${Math.abs(parseFloat(growthPercentage))}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {hasGrowth ? '+' : ''}{growthPercentage}% return on your contributions
                  </p>
                </div>
              </div>
            </div>

            {/* Time Factor Section */}
            <div className="p-5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 mb-3">Time Factor</h4>
                  <ul className="space-y-2.5 text-sm text-slate-700">
                    <li className="flex items-start">
                      <span className="mr-2 text-slate-400">•</span>
                      <span>Older investments grow more than recent ones</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-slate-400">•</span>
                      <span>Your earliest roundups have had {monthsActive} {monthsActive === 1 ? 'month' : 'months'} to earn returns</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-slate-400">•</span>
                      <span>Recent transactions are just starting their growth journey</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Key Insight Section */}
            <div className="p-5 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 mb-3">Key Insight</h4>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    You've made <strong>{roundupCount} transactions</strong> without "feeling" the investment of{' '}
                    <strong className="text-emerald-700">
                      ${totalContributions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                    {hasGrowth && (
                      <>
                        , and it's already grown to{' '}
                        <strong className="text-green-700">
                          ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                        ! This is the power of micro-investing: <em>small amounts + consistency + time = significant wealth</em>.
                      </>
                    )}
                    {!hasGrowth && !hasLoss && (
                      <>
                        . Keep going! With time and consistency, your investments will start growing. This is the power of micro-investing: <em>small amounts + consistency + time = significant wealth</em>.
                      </>
                    )}
                    {hasLoss && (
                      <>
                        . Remember, this is an educational simulation. In real investing, markets can fluctuate, but micro-investing teaches the principle: <em>small amounts + consistency + time = significant wealth</em>.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Mathematical Breakdown */}
            <div className="p-5 bg-white rounded-lg border border-slate-200 shadow-sm">
              <h4 className="font-semibold text-slate-900 mb-4">Portfolio Breakdown</h4>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded">
                  <span className="text-slate-700">Your Contributions:</span>
                  <span className="font-semibold text-emerald-700">
                    ${totalContributions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className={`flex justify-between items-center p-3 rounded ${
                  hasGrowth ? 'bg-green-50' : hasLoss ? 'bg-red-50' : 'bg-slate-50'
                }`}>
                  <span className="text-slate-700">
                    {hasGrowth ? '+ Investment Growth:' : hasLoss ? '- Investment Change:' : '+ Growth (pending):'}
                  </span>
                  <span className={`font-semibold ${
                    hasGrowth ? 'text-green-700' : hasLoss ? 'text-red-700' : 'text-slate-700'
                  }`}>
                    {hasGrowth ? '+' : ''}${Math.abs(totalGrowth).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-t-2 border-slate-300 my-2"></div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded font-semibold">
                  <span className="text-slate-900">= Total Portfolio Value:</span>
                  <span className="text-blue-700 text-base">
                    ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white p-4 rounded-b-xl border-t border-slate-200">
            <Button 
              onClick={onClose}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
