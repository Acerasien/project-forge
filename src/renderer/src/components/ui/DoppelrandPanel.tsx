import React from 'react'
import { cn } from '../../utils/cn'

interface DoppelrandPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'amber' | 'danger'
}

export const DoppelrandPanel = React.forwardRef<HTMLDivElement, DoppelrandPanelProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const borders = {
      default: 'border-forge-border bg-forge-panel',
      amber: 'border-forge-amber/30 bg-forge-panel shadow-[0_0_15px_rgba(255,176,0,0.05)]',
      danger: 'border-forge-error/30 bg-forge-panel shadow-[0_0_15px_rgba(255,68,68,0.05)]'
    }

    return (
      <div
        ref={ref}
        className={cn('border rounded-xl p-6 overflow-hidden flex flex-col', borders[variant], className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

DoppelrandPanel.displayName = 'DoppelrandPanel'
