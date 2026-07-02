import React from 'react'
import { cn } from '../../utils/cn'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  className?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  className,
  position = 'top'
}) => {
  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  }

  return (
    <div className="relative group inline-block">
      {children}
      <div
        className={cn(
          'absolute z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap',
          'bg-forge-panel border border-forge-border text-forge-text text-xs rounded px-2 py-1 shadow-md',
          positions[position],
          className
        )}
      >
        {content}
      </div>
    </div>
  )
}
