import React from 'react'
import { cn } from '../../utils/cn'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(
            'flex h-9 w-full rounded-sm border border-forge-border bg-forge-bg px-3 py-1 text-sm shadow-sm transition-colors',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-forge-amber focus-visible:border-forge-amber',
            'disabled:cursor-not-allowed disabled:opacity-50 appearance-none',
            error &&
              'border-forge-error focus-visible:ring-forge-error focus-visible:border-forge-error',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          <svg
            className="h-4 w-4 text-forge-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {error && <p className="mt-1 text-xs text-forge-error">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
