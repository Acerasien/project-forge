import React from 'react'
import { cn } from '../../utils/cn'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'secondary', size = 'md', isLoading, children, disabled, ...props },
    ref
  ) => {
    const variants = {
      primary:
        'bg-forge-amber text-black hover:bg-forge-amber-hover active:bg-forge-amber-active shadow-glow',
      secondary:
        'bg-forge-surface text-forge-text border border-forge-border hover:border-forge-border-focus hover:bg-forge-border/20',
      ghost: 'bg-transparent text-forge-text-muted hover:text-forge-text hover:bg-forge-surface',
      danger:
        'bg-forge-error-dim text-forge-error border border-forge-error/50 hover:bg-forge-error/20'
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-sm transition-all duration-200 outline-none focus-visible:ring-1 focus-visible:ring-forge-amber disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
