import React from 'react'
import { cn } from '../../utils/cn'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <textarea
          ref={ref}
          className={cn(
            'flex min-h-[80px] w-full rounded-sm border border-forge-border bg-forge-bg px-3 py-2 text-sm shadow-sm transition-colors resize-y',
            'placeholder:text-forge-text-muted',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-forge-amber focus-visible:border-forge-amber',
            'disabled:cursor-not-allowed disabled:opacity-50',
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
Textarea.displayName = 'Textarea'
