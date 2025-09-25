// src/components/ui/GoalProgressTracker.tsx - Phase 3 Enhanced
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { Progress } from "./progress"
import { Input } from "./input"
import { Label } from "./label"
import { 
  Target, 
  Plus, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2,
  Trophy,
  Star,
  Award,
  Settings,
  Filter,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import { format, differenceInDays, addMonths } from 'date-fns'

interface Goal {
  id: string
  title: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  createdAt: string
  category: 'emergency' | 'vacation' | 'investment' | 'purchase' | 'education' | 'other'
  description?: string
  priority: 'high' | 'medium' | 'low'
  milestones: Milestone[]
  achievements: Achievement[]
}

interface Milestone {
  id: string
  percentage: number
  amount: number
  reached: boolean
  reachedDate?: string
}

interface Achievement {
  id: string
  type: 'milestone' | 'completion' | 'streak' | 'speed'
  title: string
  description: string
  icon: string
  unlockedDate: string
  points: number
}

interface GoalProgressTrackerProps {
  className?: string
  currentBalance: number
  monthlyContribution: number
}

const goalCategories = [
  { value: 'emergency', label: 'Emergency Fund', color: 'bg-red-50 text-red-800' },
  { value: 'vacation', label: 'Vacation', color: 'bg-blue-50 text-blue-800' },
  { value: 'investment', label: 'Investment', color: 'bg-green-50 text-green-800' },
  { value: 'purchase', label: 'Major Purchase', color: 'bg-purple-50 text-purple-800' },
  { value: 'education', label: 'Education', color: 'bg-yellow-50 text-yellow-800' },
  { value: 'other', label: 'Other', color: 'bg-slate-50 text-slate-800' }
]

const priorityLevels = [
  { value: 'high', label: 'High Priority', color: 'bg-red-100 text-red-800', icon: ArrowUp },
  { value: 'medium', label: 'Medium Priority', color: 'bg-yellow-100 text-yellow-800', icon: Target },
  { value: 'low', label: 'Low Priority', color: 'bg-green-100 text-green-800', icon: ArrowDown }
]

export default function GoalProgressTracker({ 
  className, 
  currentBalance = 0, 
  monthlyContribution = 0 
}: GoalProgressTrackerProps) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [isAddingGoal, setIsAddingGoal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'progress' | 'deadline' | 'priority' | 'created'>('progress')
  const [showCelebration, setShowCelebration] = useState<Achievement | null>(null)
  const [newGoal, setNewGoal] = useState({
    title: '',
    targetAmount: '',
    targetDate: '',
    description: '',
    category: 'other' as const,
    priority: 'medium' as const
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalPoints, setTotalPoints] = useState(0)

  useEffect(() => {
    loadGoals()
  }, [])

  useEffect(() => {
    // Update goal progress when currentBalance changes
    updateGoalProgress()
  }, [currentBalance])

  const loadGoals = async () => {
    setIsLoading(true)
    try {
      // Check for enhanced goals first, fallback to basic goals
      let savedGoals = localStorage.getItem('growahead_enhanced_goals')
      if (!savedGoals) {
        // Migrate from basic goals if they exist
        const basicGoals = localStorage.getItem('growahead_goals')
        if (basicGoals) {
          const parsedBasicGoals = JSON.parse(basicGoals)
          const enhancedGoals = parsedBasicGoals.map((goal: any) => ({
            ...goal,
            category: goal.category || 'other',
            priority: 'medium',
            milestones: createMilestones(goal.targetAmount),
            achievements: []
          }))
          localStorage.setItem('growahead_enhanced_goals', JSON.stringify(enhancedGoals))
          setGoals(enhancedGoals)
        }
      } else {
        setGoals(JSON.parse(savedGoals))
      }

      const savedPoints = localStorage.getItem('growahead_goal_points')
      if (savedPoints) {
        setTotalPoints(parseInt(savedPoints))
      }
    } catch (err) {
      console.error('Failed to load goals:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const saveGoals = (updatedGoals: Goal[]) => {
    localStorage.setItem('growahead_enhanced_goals', JSON.stringify(updatedGoals))
    setGoals(updatedGoals)
    
    // Calculate total points
    const points = updatedGoals.reduce((sum, goal) => 
      sum + goal.achievements.reduce((achievementSum, achievement) => 
        achievementSum + achievement.points, 0), 0)
    setTotalPoints(points)
    localStorage.setItem('growahead_goal_points', points.toString())
  }

  const createMilestones = (targetAmount: number): Milestone[] => {
    const percentages = [25, 50, 75, 90]
    return percentages.map((percentage, index) => ({
      id: `milestone_${index}`,
      percentage,
      amount: (targetAmount * percentage) / 100,
      reached: false
    }))
  }

  const addGoal = () => {
    if (!newGoal.title || !newGoal.targetAmount || !newGoal.targetDate) {
      setError('Please fill in all required fields')
      return
    }

    const goal: Goal = {
      id: Date.now().toString(),
      title: newGoal.title,
      targetAmount: parseFloat(newGoal.targetAmount),
      currentAmount: currentBalance,
      targetDate: newGoal.targetDate,
      createdAt: new Date().toISOString(),
      category: newGoal.category,
      description: newGoal.description,
      priority: newGoal.priority,
      milestones: createMilestones(parseFloat(newGoal.targetAmount)),
      achievements: []
    }

    // Check for immediate achievements (but don't show celebrations)
    const achievements = checkForAchievements(goal, [...goals, goal])
    goal.achievements = achievements

    const updatedGoals = [...goals, goal]
    saveGoals(updatedGoals)
    
    setNewGoal({ title: '', targetAmount: '', targetDate: '', description: '', category: 'other', priority: 'medium' })
    setIsAddingGoal(false)
    setError(null)
  }

  const deleteGoal = (goalId: string) => {
    const updatedGoals = goals.filter(goal => goal.id !== goalId)
    saveGoals(updatedGoals)
  }

  const updateGoalProgress = () => {
    const updatedGoals = goals.map(goal => {
      const progress = (currentBalance / goal.targetAmount) * 100
      const updatedMilestones = goal.milestones.map(milestone => {
        if (!milestone.reached && progress >= milestone.percentage) {
          milestone.reached = true
          milestone.reachedDate = new Date().toISOString()
          
          // Add milestone achievement (but don't show celebration)
          const achievement: Achievement = {
            id: `milestone_${goal.id}_${milestone.percentage}`,
            type: 'milestone',
            title: `${milestone.percentage}% Milestone Reached!`,
            description: `Reached ${milestone.percentage}% of your ${goal.title} goal`,
            icon: '🎯',
            unlockedDate: new Date().toISOString(),
            points: milestone.percentage === 25 ? 10 : milestone.percentage === 50 ? 20 : milestone.percentage === 75 ? 30 : 50
          }
          
          goal.achievements.push(achievement)
        }
        return milestone
      })

      // Check for goal completion (but don't show celebration)
      if (progress >= 100 && !goal.achievements.some(a => a.type === 'completion')) {
        const completionAchievement: Achievement = {
          id: `completion_${goal.id}`,
          type: 'completion',
          title: 'Goal Completed! 🎉',
          description: `Congratulations! You've reached your ${goal.title} goal!`,
          icon: '🏆',
          unlockedDate: new Date().toISOString(),
          points: 100
        }
        
        goal.achievements.push(completionAchievement)
      }

      return {
        ...goal,
        currentAmount: currentBalance,
        milestones: updatedMilestones
      }
    })

    if (updatedGoals.some(goal => goal.achievements.length !== goals.find(g => g.id === goal.id)?.achievements.length)) {
      saveGoals(updatedGoals)
    }
  }

  const checkForAchievements = (goal: Goal, allGoals: Goal[]): Achievement[] => {
    const achievements: Achievement[] = []

    // First goal achievement
    if (allGoals.length === 1) {
      achievements.push({
        id: 'first_goal',
        type: 'milestone',
        title: 'Goal Setter!',
        description: 'Created your first savings goal',
        icon: '🎯',
        unlockedDate: new Date().toISOString(),
        points: 25
      })
    }

    // Multiple goals achievement
    if (allGoals.length === 3) {
      achievements.push({
        id: 'multiple_goals',
        type: 'milestone',
        title: 'Goal Collector!',
        description: 'Created 3 different savings goals',
        icon: '🎖️',
        unlockedDate: new Date().toISOString(),
        points: 50
      })
    }

    return achievements
  }

  const calculateProgress = (goal: Goal) => {
    const progress = (currentBalance / goal.targetAmount) * 100
    return Math.min(progress, 100)
  }

  const calculateTimeToGoal = (goal: Goal) => {
    const remaining = goal.targetAmount - currentBalance
    if (remaining <= 0) return 0
    if (monthlyContribution <= 0) return Infinity
    
    return Math.ceil(remaining / monthlyContribution)
  }

  const getGoalStatus = (goal: Goal) => {
    const progress = calculateProgress(goal)
    const daysLeft = differenceInDays(new Date(goal.targetDate), new Date())
    const monthsToGoal = calculateTimeToGoal(goal)
    
    if (progress >= 100) return 'completed'
    if (daysLeft < 0) return 'overdue'
    if (monthsToGoal > (daysLeft / 30)) return 'behind'
    if (monthsToGoal <= (daysLeft / 30) && progress > 50) return 'on-track'
    return 'needs-attention'
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { 
          color: 'bg-green-100 text-green-800', 
          icon: CheckCircle, 
          label: 'Completed' 
        }
      case 'on-track':
        return { 
          color: 'bg-blue-100 text-blue-800', 
          icon: TrendingUp, 
          label: 'On Track' 
        }
      case 'behind':
        return { 
          color: 'bg-yellow-100 text-yellow-800', 
          icon: Clock, 
          label: 'Behind Schedule' 
        }
      case 'overdue':
        return { 
          color: 'bg-red-100 text-red-800', 
          icon: AlertCircle, 
          label: 'Overdue' 
        }
      default:
        return { 
          color: 'bg-slate-100 text-slate-800', 
          icon: Target, 
          label: 'Needs Attention' 
        }
    }
  }

  const filteredAndSortedGoals = goals
    .filter(goal => filterCategory === 'all' || goal.category === filterCategory)
    .sort((a, b) => {
      switch (sortBy) {
        case 'progress':
          return calculateProgress(b) - calculateProgress(a)
        case 'deadline':
          return differenceInDays(new Date(a.targetDate), new Date()) - differenceInDays(new Date(b.targetDate), new Date())
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        default:
          return 0
      }
    })

  // Enhanced goal suggestions with categories and priorities
  const goalSuggestions = [
    { title: 'Emergency Fund', amount: 1000, months: 12, category: 'emergency', priority: 'high' },
    { title: 'Dream Vacation', amount: 2500, months: 18, category: 'vacation', priority: 'medium' },
    { title: 'New Laptop', amount: 800, months: 8, category: 'purchase', priority: 'medium' },
    { title: 'Investment Fund', amount: 5000, months: 24, category: 'investment', priority: 'high' }
  ]

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-slate-900 flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-orange-600" />
                Savings Goals
              </CardTitle>
              <CardDescription>
                Set targets and track your progress with milestones & achievements
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-3">
              
              <Button
                onClick={() => setIsAddingGoal(true)}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            </div>
          </div>

          {/* Enhanced Summary Stats */}
          {goals.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-600 mb-1">Total Goals</p>
                <p className="text-lg font-bold text-slate-900">{goals.length}</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-slate-600 mb-1">Completed</p>
                <p className="text-lg font-bold text-green-600">
                  {goals.filter(g => getGoalStatus(g) === 'completed').length}
                </p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-slate-600 mb-1">On Track</p>
                <p className="text-lg font-bold text-blue-600">
                  {goals.filter(g => getGoalStatus(g) === 'on-track').length}
                </p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-xs text-slate-600 mb-1">Total Target</p>
                <p className="text-lg font-bold text-orange-600">
                  ${goals.reduce((sum, goal) => sum + goal.targetAmount, 0).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Filters and Sorting */}
          {goals.length > 0 && (
            <div className="flex items-center justify-between mt-4 p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-slate-600" />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="text-sm border border-slate-200 rounded px-2 py-1"
                  >
                    <option value="all">All Categories</option>
                    {goalCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Settings className="h-4 w-4 text-slate-600" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="text-sm border border-slate-200 rounded px-2 py-1"
                  >
                    <option value="progress">Sort by Progress</option>
                    <option value="deadline">Sort by Deadline</option>
                    <option value="priority">Sort by Priority</option>
                    <option value="created">Sort by Created</option>
                  </select>
                </div>
              </div>

              <div className="text-xs text-slate-600">
                Showing {filteredAndSortedGoals.length} of {goals.length} goals
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {/* Enhanced Add Goal Form */}
          {isAddingGoal && (
            <div className="mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Create New Goal</h4>
              
              {error && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="goal-title" className="text-xs">Goal Title *</Label>
                  <Input
                    id="goal-title"
                    placeholder="e.g., Emergency Fund"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="goal-amount" className="text-xs">Target Amount *</Label>
                  <Input
                    id="goal-amount"
                    type="number"
                    placeholder="1000"
                    value={newGoal.targetAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <Label htmlFor="goal-date" className="text-xs">Target Date *</Label>
                  <Input
                    id="goal-date"
                    type="date"
                    value={newGoal.targetDate}
                    onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="goal-category" className="text-xs">Category *</Label>
                  <select
                    id="goal-category"
                    value={newGoal.category}
                    onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value as any })}
                    className="mt-1 w-full border border-slate-200 rounded px-3 py-2 text-sm"
                  >
                    {goalCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="goal-priority" className="text-xs">Priority *</Label>
                  <select
                    id="goal-priority"
                    value={newGoal.priority}
                    onChange={(e) => setNewGoal({ ...newGoal, priority: e.target.value as any })}
                    className="mt-1 w-full border border-slate-200 rounded px-3 py-2 text-sm"
                  >
                    {priorityLevels.map(priority => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <Label htmlFor="goal-description" className="text-xs">Description (Optional)</Label>
                <Input
                  id="goal-description"
                  placeholder="Why is this goal important to you?"
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  className="mt-1"
                />
              </div>

              {/* Enhanced Quick Suggestions */}
              <div className="mb-4">
                <p className="text-xs text-slate-600 mb-2">Quick suggestions:</p>
                <div className="grid grid-cols-2 gap-2">
                  {goalSuggestions.map((suggestion, index) => {
                    const category = goalCategories.find(c => c.value === suggestion.category)
                    return (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewGoal({
                            title: suggestion.title,
                            targetAmount: suggestion.amount.toString(),
                            targetDate: format(addMonths(new Date(), suggestion.months), 'yyyy-MM-dd'),
                            description: '',
                            category: suggestion.category as any,
                            priority: suggestion.priority as any
                          })
                        }}
                        className="text-xs h-auto py-2 flex items-center justify-start"
                      >
                        {/* <span className="mr-2">{category?.icon}</span> */}
                        <div className="text-left">
                          <div className="font-medium">{suggestion.title}</div>
                          <div className="text-xs text-slate-500">${suggestion.amount} • {suggestion.months}mo</div>
                        </div>
                      </Button>
                    )
                  })}
                </div>
              </div>

              <div className="flex space-x-2">
                <Button onClick={addGoal} size="sm">
                  <Target className="h-4 w-4 mr-2" />
                  Create Goal
                </Button>
                <Button 
                  onClick={() => {
                    setIsAddingGoal(false)
                    setError(null)
                    setNewGoal({ title: '', targetAmount: '', targetDate: '', description: '', category: 'other', priority: 'medium' })
                  }} 
                  variant="outline" 
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Enhanced Goals List */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
              <p className="text-slate-600 text-sm">Loading goals...</p>
            </div>
          ) : filteredAndSortedGoals.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">
                {goals.length === 0 ? 'No savings goals yet' : 'No goals match your filters'}
              </p>
              <p className="text-sm text-slate-500 mb-4">
                {goals.length === 0 
                  ? 'Set your first goal to start your savings journey'
                  : 'Try adjusting your filters to see more goals'
                }
              </p>
              {goals.length === 0 && (
                <Button onClick={() => setIsAddingGoal(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Goal
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedGoals.map((goal) => {
                const progress = calculateProgress(goal)
                const status = getGoalStatus(goal)
                const statusConfig = getStatusConfig(status)
                const StatusIcon = statusConfig.icon
                const monthsToGoal = calculateTimeToGoal(goal)
                const daysLeft = differenceInDays(new Date(goal.targetDate), new Date())
                const category = goalCategories.find(c => c.value === goal.category)
                const priority = priorityLevels.find(p => p.value === goal.priority)
                const PriorityIcon = priority?.icon || Target

                return (
                  <Card
                    key={goal.id}
                    className="hover:shadow-md transition-shadow border-l-4"
                    style={{ borderLeftColor: status === 'completed' ? '#10b981' : status === 'on-track' ? '#3b82f6' : status === 'behind' ? '#f59e0b' : '#ef4444' }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-semibold text-slate-900 flex items-center">
                              {/* <span className="mr-2">{category?.icon}</span> */}
                              {goal.title}
                            </h4>
                            <Badge className={`text-xs ${statusConfig.color}`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                            <Badge className={`text-xs ${priority?.color}`}>
                              <PriorityIcon className="h-3 w-3 mr-1" />
                              {priority?.label}
                            </Badge>
                          </div>
                          
                          {goal.description && (
                            <p className="text-sm text-slate-600 mb-2">{goal.description}</p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-xs text-slate-600">
                            <div className="flex items-center">
                              <DollarSign className="h-3 w-3 mr-1" />
                              <span>
                                ${currentBalance.toFixed(2)} of ${goal.targetAmount.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>
                                {daysLeft > 0 
                                  ? `${daysLeft} days left`
                                  : `${Math.abs(daysLeft)} days overdue`
                                }
                              </span>
                            </div>

                          </div>
                        </div>
                        
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingGoal(goal.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteGoal(goal.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Enhanced Progress Section */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700">
                            {progress.toFixed(1)}% Complete
                          </span>
                          <span className="text-sm text-slate-600">
                            ${(goal.targetAmount - currentBalance).toFixed(2)} to go
                          </span>
                        </div>
                        <Progress value={progress} className="h-3" />
                      </div>

                      {/* Milestones */}
                      <div className="grid grid-cols-4 gap-2">
                        {goal.milestones.map((milestone, index) => (
                          <div 
                            key={milestone.id}
                            className={`text-center p-2 rounded-lg border-2 transition-all ${
                              milestone.reached 
                                ? 'border-green-500 bg-green-50' 
                                : progress >= milestone.percentage 
                                  ? 'border-green-300 bg-green-25' 
                                  : 'border-slate-200 bg-slate-50'
                            }`}
                          >
                            <div className={`text-xs font-semibold ${
                              milestone.reached ? 'text-green-700' : 'text-slate-600'
                            }`}>
                              {milestone.percentage}%
                            </div>
                            <div className="text-xs text-slate-500">
                              ${milestone.amount.toFixed(0)}
                            </div>
                            {milestone.reached && (
                              <CheckCircle className="h-3 w-3 text-green-600 mx-auto mt-1" />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Timeline Estimate */}
                      {monthlyContribution > 0 && progress < 100 && (
                        <div className="p-2 bg-slate-50 rounded text-xs text-slate-600">
                          <div className="flex items-center justify-between">
                            <span>
                              📈 At current rate: ~{monthsToGoal} months to reach goal
                            </span>
                            <span>
                              {monthsToGoal <= (daysLeft / 30) 
                                ? '✅ On pace to meet deadline'
                                : '⚠️ May need to increase contributions'
                              }
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}