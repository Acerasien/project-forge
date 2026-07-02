import React from 'react'
import { cn } from '../../utils/cn'

interface DoppelrandPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'amber' | 'danger'
}

export const DoppelrandPanel = React.forwardRef<HTMLDivElement, DoppelrandPanelProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const borders = {
      default: 'border-forge-border',
      amber: 'border-forge-amber/50 shadow-[0_0_15px_rgba(255,176,0,0.1)]',
      danger: 'border-forge-error/50 shadow-[0_0_15px_rgba(255,68,68,0.1)]'
    }

    return (
      <div
        ref={ref}
        className={cn('relative p-[1px] rounded-sm bg-forge-bg overflow-hidden', className)}
        {...props}
      >
        {/* Outer border container */}
        <div className={cn('absolute inset-0 border', borders[variant])}></div>

        {/* Inner panel with its own border to create the Doppelrand effect */}
        <div
          className={cn(
            'relative h-full w-full bg-forge-panel border border-forge-bg/50 p-4 m-[2px]',
            'before:absolute before:inset-0 before:border before:border-white/5 before:pointer-events-none'
          )}
        >
          {children}
        </div>
      </div>
    )
  }
)

DoppelrandPanel.displayName = 'DoppelrandPanel'
