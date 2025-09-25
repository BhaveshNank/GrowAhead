// src/components/ui/NotificationSystem.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { 
  Bell, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Target,
  TrendingUp,
  Calendar,
  Gift,
  Zap,
  Settings
} from "lucide-react"
import { format, differenceInDays, isAfter, isBefore, subDays } from 'date-fns'

interface Notification {
  id: string
  type: 'milestone' | 'deadline_warning' | 'goal_suggestion' | 'achievement' | 'progress_update'
  title: string
  message: string
  icon: string
  priority: 'high' | 'medium' | 'low'
  createdAt: string
  read: boolean
  actionable: boolean
  goalId?: string
  data?: any
}

interface NotificationSystemProps {
  goals: any[]
  currentBalance: number
  monthlyContribution: number
  className?: string
}

export default function NotificationSystem({ 
  goals, 
  currentBalance, 
  monthlyContribution, 
  className 
}: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [settings, setSettings] = useState({
    milestoneNotifications: true,
    deadlineWarnings: true,
    progressUpdates: true,
    achievements: true,
    suggestions: true,
    emailNotifications: false
  })

  useEffect(() => {
    generateSmartNotifications()
    loadNotificationSettings()
  }, [goals, currentBalance])

  const loadNotificationSettings = () => {
    const savedSettings = localStorage.getItem('growahead_notification_settings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }

  const saveNotificationSettings = (newSettings: typeof settings) => {
    localStorage.setItem('growahead_notification_settings', JSON.stringify(newSettings))
    setSettings(newSettings)
  }

  const generateSmartNotifications = () => {
    const newNotifications: Notification[] = []
    const now = new Date()

    goals.forEach(goal => {
      const progress = (currentBalance / goal.targetAmount) * 100
      const daysLeft = differenceInDays(new Date(goal.targetDate), now)
      const monthsToGoal = monthlyContribution > 0 ? Math.ceil((goal.targetAmount - currentBalance) / monthlyContribution) : Infinity

      // Deadline warnings
      if (settings.deadlineWarnings && daysLeft > 0 && daysLeft <= 30 && progress < 80) {
        newNotifications.push({
          id: `deadline_${goal.id}`,
          type: 'deadline_warning',
          title: 'Goal Deadline Approaching',
          message: `Your "${goal.title}" goal deadline is in ${daysLeft} days. You're ${progress.toFixed(1)}% complete.`,
          icon: '⏰',
          priority: daysLeft <= 7 ? 'high' : 'medium',
          createdAt: new Date().toISOString(),
          read: false,
          actionable: true,
          goalId: goal.id
        })
      }

      // Progress milestones
      if (settings.milestoneNotifications) {
        const milestonePercentages = [25, 50, 75, 90]
        milestonePercentages.forEach(percentage => {
          if (progress >= percentage && progress < percentage + 5) { // Just reached this milestone
            newNotifications.push({
              id: `milestone_${goal.id}_${percentage}`,
              type: 'milestone',
              title: `🎯 ${percentage}% Milestone Reached!`,
              message: `Congratulations! You've reached ${percentage}% of your "${goal.title}" goal.`,
              icon: '🎯',
              priority: 'medium',
              createdAt: new Date().toISOString(),
              read: false,
              actionable: false,
              goalId: goal.id
            })
          }
        })
      }

      // Behind schedule warnings
      if (monthsToGoal > (daysLeft / 30) && daysLeft > 0) {
        newNotifications.push({
          id: `behind_${goal.id}`,
          type: 'progress_update',
          title: 'Goal May Need Attention',
          message: `At current pace, "${goal.title}" may take ${monthsToGoal} months, but deadline is in ${Math.round(daysLeft/30)} months.`,
          icon: '📊',
          priority: 'medium',
          createdAt: new Date().toISOString(),
          read: false,
          actionable: true,
          goalId: goal.id,
          data: { suggestedIncrease: ((goal.targetAmount - currentBalance) / (daysLeft / 30) - monthlyContribution).toFixed(2) }
        })
      }

      // Goal completion
      if (progress >= 100) {
        newNotifications.push({
          id: `completed_${goal.id}`,
          type: 'achievement',
          title: '🏆 Goal Completed!',
          message: `Amazing! You've successfully reached your "${goal.title}" goal of $${goal.targetAmount.toLocaleString()}.`,
          icon: '🏆',
          priority: 'high',
          createdAt: new Date().toISOString(),
          read: false,
          actionable: false,
          goalId: goal.id
        })
      }
    })

    // Smart suggestions based on patterns
    if (settings.suggestions) {
      // Suggest emergency fund if none exists
      const hasEmergencyFund = goals.some(goal => goal.category === 'emergency')
      if (!hasEmergencyFund && currentBalance > 100) {
        newNotifications.push({
          id: 'suggest_emergency',
          type: 'goal_suggestion',
          title: '🛡️ Consider an Emergency Fund',
          message: 'Financial experts recommend having 3-6 months of expenses saved. Start with a $1,000 emergency fund?',
          icon: '🛡️',
          priority: 'medium',
          createdAt: new Date().toISOString(),
          read: false,
          actionable: true
        })
      }

      // Suggest increasing contributions if doing well
      if (goals.length > 0 && monthlyContribution > 0) {
        const avgProgress = goals.reduce((sum, goal) => sum + (currentBalance / goal.targetAmount) * 100, 0) / goals.length
        if (avgProgress > 75) {
          newNotifications.push({
            id: 'suggest_increase',
            type: 'goal_suggestion',
            title: '🚀 You\'re Doing Great!',
            message: `You're ahead on most goals. Consider increasing monthly contributions by $${(monthlyContribution * 0.2).toFixed(2)} to reach goals faster.`,
            icon: '🚀',
            priority: 'low',
            createdAt: new Date().toISOString(),
            read: false,
            actionable: true
          })
        }
      }
    }

    // Progress celebrations
    if (settings.progressUpdates && goals.length > 0) {
      const totalProgress = goals.reduce((sum, goal) => sum + Math.min((currentBalance / goal.targetAmount) * 100, 100), 0)
      const avgProgress = totalProgress / goals.length

      if (avgProgress > 25 && avgProgress < 30) {
        newNotifications.push({
          id: 'progress_quarter',
          type: 'progress_update',
          title: '🎉 Quarter Way There!',
          message: `You've completed an average of ${avgProgress.toFixed(1)}% across all your goals. Keep up the great work!`,
          icon: '🎉',
          priority: 'low',
          createdAt: new Date().toISOString(),
          read: false,
          actionable: false
        })
      }
    }

    // Load existing notifications and merge
    const existingNotifications = JSON.parse(localStorage.getItem('growahead_notifications') || '[]')
    const existingIds = existingNotifications.map((n: Notification) => n.id)
    const uniqueNewNotifications = newNotifications.filter(n => !existingIds.includes(n.id))
    
    const allNotifications = [...existingNotifications, ...uniqueNewNotifications]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20) // Keep only 20 most recent

    setNotifications(allNotifications)
    localStorage.setItem('growahead_notifications', JSON.stringify(allNotifications))
  }

  const markAsRead = (notificationId: string) => {
    const updatedNotifications = notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    )
    setNotifications(updatedNotifications)
    localStorage.setItem('growahead_notifications', JSON.stringify(updatedNotifications))
  }

  const dismissNotification = (notificationId: string) => {
    const updatedNotifications = notifications.filter(n => n.id !== notificationId)
    setNotifications(updatedNotifications)
    localStorage.setItem('growahead_notifications', JSON.stringify(updatedNotifications))
  }

  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }))
    setNotifications(updatedNotifications)
    localStorage.setItem('growahead_notifications', JSON.stringify(updatedNotifications))
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'milestone': return Target
      case 'deadline_warning': return AlertTriangle
      case 'goal_suggestion': return Gift
      case 'achievement': return CheckCircle
      case 'progress_update': return TrendingUp
      default: return Bell
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-50 border-red-200 text-red-800'
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'low': return 'bg-blue-50 border-blue-200 text-blue-800'
      default: return 'bg-slate-50 border-slate-200 text-slate-800'
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <Card className="absolute right-0 top-12 w-96 max-h-96 overflow-hidden shadow-lg z-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notifications
              </CardTitle>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {notifications.length > 0 && (
              <CardDescription>
                {unreadCount} unread of {notifications.length} total notifications
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-2">No notifications yet</p>
                <p className="text-sm text-slate-500">
                  We'll notify you about goal progress and milestones
                </p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notification) => {
                  const IconComponent = getNotificationIcon(notification.type)
                  
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                        !notification.read ? 'bg-blue-50/50' : ''
                      }`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                          notification.priority === 'high' ? 'bg-red-100' : 
                          notification.priority === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                        }`}>
                          {notification.icon}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-sm font-medium ${!notification.read ? 'text-slate-900' : 'text-slate-700'}`}>
                              {notification.title}
                            </h4>
                            <div className="flex items-center space-x-1">
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  dismissNotification(notification.id)
                                }}
                                className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <p className="text-sm text-slate-600 mt-1">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-slate-500">
                              {format(new Date(notification.createdAt), 'MMM dd, HH:mm')}
                            </span>
                            
                            {notification.actionable && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-6"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Handle specific actions based on notification type
                                  if (notification.type === 'goal_suggestion') {
                                    // Could trigger goal creation modal
                                    console.log('Open goal creation')
                                  }
                                }}
                              >
                                Take Action
                              </Button>
                            )}
                          </div>

                          {/* Show suggested increase for behind schedule notifications */}
                          {notification.data?.suggestedIncrease && (
                            <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                              <span className="text-blue-800">
                                💡 Consider increasing monthly contributions by ${notification.data.suggestedIncrease}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Notification Settings */}
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs justify-start"
                onClick={() => {
                  // Toggle settings panel or open settings modal
                  console.log('Open notification settings')
                }}
              >
                <Settings className="h-3 w-3 mr-2" />
                Notification Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}