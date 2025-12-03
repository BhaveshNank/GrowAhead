'use client'

import { useState, useEffect } from 'react'
import { Lightbulb, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface EducationalTipProps {
  totalBalance: number
  totalContributions: number
  totalGrowth: number
  roundupCount: number
  monthsActive: number
  riskProfile: string
}

interface Tip {
  id: string
  title: string
  content: string
  stage: 'beginner' | 'intermediate' | 'advanced' | 'all'
}

export default function EducationalTip({
  totalBalance,
  totalContributions,
  totalGrowth,
  roundupCount,
  monthsActive,
  riskProfile
}: EducationalTipProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const [currentTipIndex, setCurrentTipIndex] = useState(0)

  // Determine user's portfolio stage
  const getPortfolioStage = (): 'beginner' | 'intermediate' | 'advanced' => {
    if (totalContributions < 10) return 'beginner'
    if (totalContributions < 100) return 'intermediate'
    return 'advanced'
  }

  const stage = getPortfolioStage()

  // Get return rate for risk profile
  const getReturnRate = () => {
    const rates = { conservative: '5%', balanced: '8%', aggressive: '12%' }
    return rates[riskProfile as keyof typeof rates] || '8%'
  }

  // Define educational tips with personalization
  const allTips: Tip[] = [
    {
      id: 'compound-interest',
      title: 'The Power of Compound Interest',
      content: `Your $${totalContributions.toFixed(2)} investment isn't just sitting idle - it's earning returns. And those returns will earn returns too. This compounding effect is why your portfolio has grown to $${totalBalance.toFixed(2)}.`,
      stage: 'intermediate'
    },
    {
      id: 'time-weighted-growth',
      title: 'Why Time in Market Matters',
      content: `Your earliest investments have grown more than recent ones because they've had more time to compound. Starting early matters more than investing large amounts all at once.`,
      stage: 'intermediate'
    },
    {
      id: 'dollar-cost-averaging',
      title: 'Dollar-Cost Averaging',
      content: `By investing small amounts regularly through roundups, you're automatically practicing dollar-cost averaging - a proven strategy used by professional investors to reduce risk.`,
      stage: 'all'
    },
    {
      id: 'risk-return',
      title: 'Understanding Risk & Return',
      content: `Your ${riskProfile} portfolio aims for ${getReturnRate()} annual returns. Conservative (5%) is safer but slower. Balanced (8%) offers steady growth. Aggressive (12%) targets higher returns with more volatility.`,
      stage: 'all'
    },
    {
      id: 'micro-investing',
      title: 'The Magic of Micro-Investing',
      content: `You've made ${roundupCount} transactions without "feeling" the investment of $${totalContributions.toFixed(2)}. This proves that small, consistent amounts can build wealth without impacting your daily life.`,
      stage: 'beginner'
    },
    {
      id: 'consistency',
      title: 'Consistency Beats Timing',
      content: `You've been investing for ${monthsActive} ${monthsActive === 1 ? 'month' : 'months'}. Regular, consistent investing typically outperforms trying to time the market. Keep going!`,
      stage: 'intermediate'
    },
    {
      id: 'patience',
      title: 'Investment Growth Takes Time',
      content: `Your $${totalGrowth.toFixed(2)} in growth might seem small now, but compound interest accelerates over time. In 10 years, your current balance could more than double at ${getReturnRate()} annual returns.`,
      stage: 'intermediate'
    },
    {
      id: 'starting-small',
      title: 'Every Journey Starts Small',
      content: `Your current portfolio of $${totalBalance.toFixed(2)} started with just spare change. The hardest part is starting - and you've already done it. Now time will do the heavy lifting.`,
      stage: 'beginner'
    },
    {
      id: 'emergency-fund',
      title: 'Building an Emergency Fund',
      content: `While you're building investment wealth, financial experts recommend also maintaining 3-6 months of expenses in a liquid emergency fund for unexpected situations.`,
      stage: 'advanced'
    },
    {
      id: 'diversification',
      title: 'The Importance of Diversification',
      content: `In real investing, diversification (spreading investments across different assets) reduces risk. Your micro-investing habits are building the discipline for future diversified portfolios.`,
      stage: 'advanced'
    },
    {
      id: 'real-investing',
      title: 'From Simulation to Reality',
      content: `This platform teaches you micro-investing concepts in a risk-free environment. When you're ready for real investing, these principles apply to actual platforms like Acorns, Stash, or Robinhood.`,
      stage: 'all'
    }
  ]

  // Filter tips based on stage
  const relevantTips = allTips.filter(tip => tip.stage === stage || tip.stage === 'all')

  // Load dismissed state from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('educationalTipDismissed')
    if (dismissed === 'true') {
      setIsDismissed(true)
    }

    // Load saved tip index
    const savedIndex = localStorage.getItem('currentTipIndex')
    if (savedIndex) {
      setCurrentTipIndex(parseInt(savedIndex) % relevantTips.length)
    }
  }, [relevantTips.length])

  // Rotate to next tip
  useEffect(() => {
    if (!isDismissed) {
      // Rotate tip every visit or after some time
      const rotationInterval = setInterval(() => {
        setCurrentTipIndex((prev) => {
          const newIndex = (prev + 1) % relevantTips.length
          localStorage.setItem('currentTipIndex', newIndex.toString())
          return newIndex
        })
      }, 30000) // Rotate every 30 seconds

      return () => clearInterval(rotationInterval)
    }
  }, [isDismissed, relevantTips.length])

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('educationalTipDismissed', 'true')
  }

  const handleNextTip = () => {
    const newIndex = (currentTipIndex + 1) % relevantTips.length
    setCurrentTipIndex(newIndex)
    localStorage.setItem('currentTipIndex', newIndex.toString())
  }

  if (isDismissed || relevantTips.length === 0) return null

  const currentTip = relevantTips[currentTipIndex]

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="h-5 w-5 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-900 mb-1">
                  {currentTip.title}
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {currentTip.content}
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="ml-3 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                aria-label="Dismiss tip"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-1">
                {relevantTips.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === currentTipIndex 
                        ? 'w-6 bg-blue-500' 
                        : 'w-1.5 bg-blue-200'
                    }`}
                  />
                ))}
              </div>
              
              {relevantTips.length > 1 && (
                <button
                  onClick={handleNextTip}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Next Tip →
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
