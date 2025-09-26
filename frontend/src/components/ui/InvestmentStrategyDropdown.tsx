// Simplified Investment Strategy Dropdown Component
import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface InvestmentStrategy {
  value: 'conservative' | 'balanced' | 'aggressive'
  label: string
  returnRate: string
  description: string
  risk: 'Low' | 'Medium' | 'High'
}

const strategies: InvestmentStrategy[] = [
  {
    value: 'conservative',
    label: 'Conservative',
    returnRate: '5%',
    description: 'Low risk with government bonds and fixed deposits',
    risk: 'Low'
  },
  {
    value: 'balanced',
    label: 'Balanced',
    returnRate: '8%',
    description: 'Medium risk with mix of stocks and bonds',
    risk: 'Medium'
  },
  {
    value: 'aggressive',
    label: 'Aggressive',
    returnRate: '12%',
    description: 'High risk with growth stocks and equity funds',
    risk: 'High'
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
  const selectedStrategy = strategies.find(s => s.value === value) || strategies[1]

  return (
    <div className={cn("space-y-2", className)}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger 
          className={cn(
            "h-12 px-3 border border-slate-200 focus:border-slate-400 focus:ring-slate-400",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <span className="font-medium text-slate-900">
                {selectedStrategy?.label}
              </span>
              <Badge variant="outline" className="text-xs">
                {selectedStrategy?.risk} Risk
              </Badge>
              <Badge variant="outline" className="text-xs">
                {selectedStrategy?.returnRate} return
              </Badge>
            </div>
          </div>
        </SelectTrigger>

        <SelectContent className="w-full">
          {strategies.map((strategy) => (
            <SelectItem 
              key={strategy.value} 
              value={strategy.value}
              className="p-3 cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-slate-900">
                      {strategy.label}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {strategy.risk} Risk
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {strategy.returnRate} return
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    {strategy.description}
                  </p>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Simple helper text */}
      <p className="text-xs text-slate-500">
        Choose your investment risk level and expected returns
      </p>
    </div>
  )
}

export default InvestmentStrategyDropdown