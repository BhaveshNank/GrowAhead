// src/components/ui/date-input.tsx
'use client'

import * as React from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          type="date"
          className={cn(
            "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-slate-500",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "hover:border-slate-400 transition-colors",
            // Custom styling for date picker
            "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
            "[&::-webkit-calendar-picker-indicator]:opacity-60",
            "[&::-webkit-calendar-picker-indicator]:hover:opacity-100",
            "[&::-webkit-calendar-picker-indicator]:transition-opacity",
            // Hide default icon and show custom one
            "[&::-webkit-calendar-picker-indicator]:absolute",
            "[&::-webkit-calendar-picker-indicator]:right-3",
            "[&::-webkit-calendar-picker-indicator]:w-5",
            "[&::-webkit-calendar-picker-indicator]:h-5",
            className
          )}
          ref={ref}
          {...props}
        />
        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
      </div>
    )
  }
)

DateInput.displayName = 'DateInput'

export { DateInput }
