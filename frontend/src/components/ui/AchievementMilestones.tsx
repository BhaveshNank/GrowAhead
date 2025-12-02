'use client'

import { Trophy, Lock, CheckCircle2, TrendingUp, Calendar, DollarSign, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Achievement {
  id: string
  title: string
  description: string
  educationalTip: string
  threshold: number
  type: 'balance' | 'transactions' | 'growth' | 'streak'
  icon: React.ReactNode
  unlocked: boolean
  progress?: number
}

interface AchievementMilestonesProps {
  totalBalance: number
  totalContributions: number
  totalGrowth: number
  roundupCount: number
  daysActive?: number
}

export default function AchievementMilestones({
  totalBalance,
  totalContributions,
  totalGrowth,
  roundupCount,
  daysActive = 0
}: AchievementMilestonesProps) {
  
  // Define achievements
  const achievements: Achievement[] = [
    {
      id: 'first-investment',
      title: 'First Investment',
      description: 'Made your first roundup contribution',
      educationalTip: "You've started building wealth through micro-investing!",
      threshold: 1,
      type: 'transactions',
      icon: <DollarSign className="h-4 w-4" />,
      unlocked: roundupCount >= 1,
      progress: roundupCount
    },
    {
      id: 'milestone-10',
      title: '$10 Milestone',
      description: 'Accumulated $10 in contributions',
      educationalTip: 'In 10 years at 8%, this $10 could become $21.59',
      threshold: 10,
      type: 'balance',
      icon: <Target className="h-4 w-4" />,
      unlocked: totalContributions >= 10,
      progress: totalContributions
    },
    {
      id: 'consistent-saver',
      title: '10 Transactions',
      description: 'Completed 10 roundup transactions',
      educationalTip: 'Consistency is the foundation of wealth building',
      threshold: 10,
      type: 'transactions',
      icon: <CheckCircle2 className="h-4 w-4" />,
      unlocked: roundupCount >= 10,
      progress: roundupCount
    },
    {
      id: 'milestone-50',
      title: '$50 Milestone',
      description: 'Reached $50 in contributions',
      educationalTip: 'At 8% return, this could grow to $108 in 10 years',
      threshold: 50,
      type: 'balance',
      icon: <TrendingUp className="h-4 w-4" />,
      unlocked: totalContributions >= 50,
      progress: totalContributions
    },
    {
      id: 'first-growth',
      title: 'First Growth Earned',
      description: 'Earned your first investment return',
      educationalTip: 'This is compound interest at work!',
      threshold: 0.01,
      type: 'growth',
      icon: <TrendingUp className="h-4 w-4" />,
      unlocked: totalGrowth >= 0.01,
      progress: totalGrowth
    },
    {
      id: 'milestone-100',
      title: '$100 Milestone',
      description: 'Built a $100 investment portfolio',
      educationalTip: 'You\'re building serious wealth. Keep the momentum!',
      threshold: 100,
      type: 'balance',
      icon: <Trophy className="h-4 w-4" />,
      unlocked: totalContributions >= 100,
      progress: totalContributions
    },
    {
      id: '30-days-active',
      title: '30 Days Active',
      description: 'Been investing for 30 days',
      educationalTip: 'Time in the market beats timing the market',
      threshold: 30,
      type: 'streak',
      icon: <Calendar className="h-4 w-4" />,
      unlocked: daysActive >= 30,
      progress: daysActive
    },
    {
      id: 'milestone-250',
      title: '$250 Milestone',
      description: 'Accumulated $250 through roundups',
      educationalTip: 'At this rate, you could have $3,000+ in 5 years',
      threshold: 250,
      type: 'balance',
      icon: <Trophy className="h-4 w-4" />,
      unlocked: totalContributions >= 250,
      progress: totalContributions
    }
  ]

  // Get unlocked and locked achievements
  const unlockedAchievements = achievements.filter(a => a.unlocked)
  const nextAchievement = achievements.find(a => !a.unlocked)
  
  // Calculate progress for next achievement
  const getProgress = (achievement: Achievement) => {
    if (!achievement.progress) return 0
    return Math.min((achievement.progress / achievement.threshold) * 100, 100)
  }

  return (
    <Card className="shadow-sm border border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-slate-700" />
            <CardTitle className="text-lg text-slate-900">Achievements</CardTitle>
          </div>
          <Badge variant="outline" className="text-slate-600">
            {unlockedAchievements.length}/{achievements.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recently Unlocked */}
        {unlockedAchievements.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Recently Unlocked</p>
            <div className="space-y-2">
              {unlockedAchievements.slice(-2).reverse().map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-start space-x-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    {achievement.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-semibold text-slate-900">{achievement.title}</h4>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{achievement.educationalTip}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Achievement */}
        {nextAchievement && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Next Milestone</p>
            <div className="flex items-start space-x-3 p-3 bg-white border border-slate-200 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <Lock className="h-4 w-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-900">{nextAchievement.title}</h4>
                <p className="text-xs text-slate-600 mt-0.5 mb-2">{nextAchievement.description}</p>
                
                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                  <div
                    className="bg-slate-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getProgress(nextAchievement)}%` }}
                  />
                </div>
                
                <p className="text-xs text-slate-500">
                  {nextAchievement.type === 'balance' && 
                    `$${(nextAchievement.threshold - (nextAchievement.progress || 0)).toFixed(2)} away`
                  }
                  {nextAchievement.type === 'transactions' && 
                    `${nextAchievement.threshold - (nextAchievement.progress || 0)} transactions to go`
                  }
                  {nextAchievement.type === 'streak' && 
                    `${nextAchievement.threshold - (nextAchievement.progress || 0)} days remaining`
                  }
                  {nextAchievement.type === 'growth' && 
                    `Keep investing to earn growth`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* All Achievements Unlocked */}
        {unlockedAchievements.length === achievements.length && (
          <div className="text-center p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg">
            <Trophy className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-900">All Achievements Unlocked!</p>
            <p className="text-xs text-slate-600 mt-1">You're a micro-investing champion</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
