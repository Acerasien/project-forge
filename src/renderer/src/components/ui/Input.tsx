import React from 'react'
import { cn } from '../../utils/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  icon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-forge-text-muted">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'flex h-9 w-full rounded-sm border border-forge-border bg-forge-bg px-3 py-1 text-sm shadow-sm transition-colors',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-forge-text-muted',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-forge-amber focus-visible:border-forge-amber',
            'disabled:cursor-not-allowed disabled:opacity-50',
            icon && 'pl-9',
            error &&
              'border-forge-error focus-visible:ring-forge-error focus-visible:border-forge-error',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-forge-error">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
