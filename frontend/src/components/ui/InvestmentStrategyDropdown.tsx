// Enhanced Investment Strategy Dropdown Component
import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  TrendingUp, 
  Activity, 
  CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface InvestmentStrategy {
  value: 'conservative' | 'balanced' | 'aggressive'
  label: string
  returnRate: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
  risk: 'Low' | 'Medium' | 'High'
  riskColor: string
}

const strategies: InvestmentStrategy[] = [
  {
    value: 'conservative',
    label: 'Conservative',
    returnRate: '5%',
    description: 'Low risk with government bonds and fixed deposits',
    icon: <Shield className="h-4 w-4" />,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    risk: 'Low',
    riskColor: 'bg-blue-100 text-blue-800'
  },
  {
    value: 'balanced',
    label: 'Balanced',
    returnRate: '8%',
    description: 'Medium risk with mix of stocks and bonds',
    icon: <Activity className="h-4 w-4" />,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    risk: 'Medium',
    riskColor: 'bg-green-100 text-green-800'
  },
  {
    value: 'aggressive',
    label: 'Aggressive',
    returnRate: '12%',
    description: 'High risk with growth stocks and equity funds',
    icon: <TrendingUp className="h-4 w-4" />,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    risk: 'High',
    riskColor: 'bg-red-100 text-red-800'
  }
]

interface InvestmentStrategyDropdownProps {
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
}

export function InvestmentStrategyDropdown({ 
  value, 
  onChange, 
  className,
  disabled = false 
}: InvestmentStrategyDropdownProps) {
  const selectedStrategy = strategies.find(s => s.value === value) || strategies[1] // Default to balanced

  return (
    <div className={cn("space-y-2", className)}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger 
          className={cn(
            "h-14 px-4 border-2 transition-all duration-200 hover:border-slate-300",
            selectedStrategy?.borderColor,
            selectedStrategy?.bgColor,
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          <div className="flex items-center space-x-3 w-full">
            {/* Icon */}
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              selectedStrategy?.bgColor,
              selectedStrategy?.color
            )}>
              {selectedStrategy?.icon}
            </div>
            
            {/* Content */}
            <div className="flex-1 text-left">
              <div className="flex items-center space-x-2">
                <span className={cn("font-semibold", selectedStrategy?.color)}>
                  {selectedStrategy?.label}
                </span>
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs", selectedStrategy?.riskColor)}
                >
                  {selectedStrategy?.risk} Risk
                </Badge>
                <Badge 
                  variant="outline" 
                  className="text-xs font-bold"
                >
                  {selectedStrategy?.returnRate} return
                </Badge>
              </div>
              <p className="text-sm text-slate-600 mt-0.5">
                {selectedStrategy?.description}
              </p>
            </div>
          </div>
        </SelectTrigger>

        <SelectContent className="w-full min-w-[400px]">
          {strategies.map((strategy) => (
            <SelectItem 
              key={strategy.value} 
              value={strategy.value}
              className="p-4 cursor-pointer hover:bg-slate-50 focus:bg-slate-50"
            >
              <div className="flex items-center space-x-3 w-full">
                {/* Icon */}
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  strategy.bgColor,
                  strategy.color
                )}>
                  {strategy.icon}
                </div>
                
                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={cn("font-semibold", strategy.color)}>
                      {strategy.label}
                    </span>
                    <Badge 
                      variant="secondary" 
                      className={cn("text-xs", strategy.riskColor)}
                    >
                      {strategy.risk} Risk
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="text-xs font-bold text-slate-700"
                    >
                      {strategy.returnRate} annual return
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    {strategy.description}
                  </p>
                </div>
                
                {/* Selected indicator */}
                {value === strategy.value && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Helper text */}
      <p className="text-xs text-slate-500 mt-2">
        💡 Investment strategies simulate different risk/return profiles for educational purposes. 
        You can change this later in your dashboard settings.
      </p>
    </div>
  )
}

export default InvestmentStrategyDropdown