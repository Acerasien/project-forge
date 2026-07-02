import React from 'react'
import { cn } from '../../utils/cn'

interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  action?: React.ReactNode
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  action,
  className,
  ...props
}) => {
  return (
    <div
      className={cn('flex flex-col gap-1 pb-4 mb-4 border-b border-forge-border/50', className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-light text-white tracking-tight flex items-center gap-2">
          <span className="text-forge-amber/70 font-mono text-sm">#</span>
          {title}
        </h3>
        {action && <div>{action}</div>}
      </div>
      {description && <p className="text-sm text-forge-text-muted">{description}</p>}
    </div>
  )
}
