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
        <h3 className="text-xl font-medium text-white tracking-tight flex items-center gap-2">
          <span className="text-forge-amber font-mono text-lg font-bold">#</span>
          {title}
        </h3>
        {action && <div>{action}</div>}
      </div>
      {description && (
        <div className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
          <p className="text-sm text-forge-text-muted">{description}</p>
        </div>
      )}
    </div>
  )
}
