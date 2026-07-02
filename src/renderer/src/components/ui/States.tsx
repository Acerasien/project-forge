import React from 'react'
import { cn } from '../../utils/cn'
import { Loader2, AlertTriangle, FileQuestion } from 'lucide-react'

export const LoadingState: React.FC<{ message?: string; className?: string }> = ({
  message = 'Loading...',
  className
}) => (
  <div
    className={cn('flex flex-col items-center justify-center p-8 text-forge-text-muted', className)}
  >
    <Loader2 className="w-8 h-8 animate-spin text-forge-amber mb-4" />
    <p className="font-mono text-sm">{message}</p>
  </div>
)

export const ErrorState: React.FC<{ title?: string; message: string; className?: string }> = ({
  title = 'Error',
  message,
  className
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center p-8 text-forge-error text-center',
      className
    )}
  >
    <AlertTriangle className="w-10 h-10 mb-4 opacity-80" />
    <h3 className="text-lg font-medium mb-2">{title}</h3>
    <p className="text-sm opacity-80 max-w-md">{message}</p>
  </div>
)

export const EmptyState: React.FC<{
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}> = ({ title, description, action, className }) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center p-12 text-center border border-forge-border/40 border-dashed rounded-lg bg-forge-panel/20',
      className
    )}
  >
    <div className="w-12 h-12 rounded-full bg-forge-surface flex items-center justify-center mb-4 border border-forge-border">
      <FileQuestion className="w-6 h-6 text-forge-text-muted" />
    </div>
    <h3 className="text-white font-medium text-lg mb-2">{title}</h3>
    <p className="text-forge-text-muted text-sm max-w-sm mb-6">{description}</p>
    {action && <div>{action}</div>}
  </div>
)
