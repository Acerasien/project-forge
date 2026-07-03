import React, { useEffect, useState, useCallback } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary, FallbackProps } from 'react-error-boundary'
import { Sidebar } from './components/Sidebar'
import { useInitiativeStore } from './store/useInitiativeStore'
import { Dashboard } from './pages/Dashboard'
import { Workspace } from './pages/Workspace'
import { Settings } from './pages/Settings'
import { Onboarding } from './pages/Onboarding'
import { ErrorState } from './components/ui/States'

const GlobalErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <div className="flex h-screen w-screen bg-forge-bg text-forge-text items-center justify-center forge-grid-bg">
      <div className="max-w-md w-full bg-forge-panel border border-forge-error/50 p-6 rounded shadow-glow-strong">
        <ErrorState
          title="Critical System Failure"
          message={error instanceof Error ? error.message : String(error)}
          className="border-none p-0"
        />
        <button
          onClick={resetErrorBoundary}
          className="mt-6 w-full px-4 py-2 bg-forge-surface border border-forge-border hover:bg-forge-error/20 hover:border-forge-error/50 hover:text-forge-error transition-colors rounded text-sm font-medium"
        >
          Restart Workspace
        </button>
      </div>
    </div>
  )
}

const StartupRecovery: React.FC<{ error: string; dbPath?: string; onRetry: () => void }> = ({
  error,
  dbPath,
  onRetry
}) => {
  const handleReveal = (): void => {
    window.forge.system.revealDatabase()
  }
  const handleReset = async (): Promise<void> => {
    const confirm = window.confirm(
      'Are you absolutely sure you want to reset the database? All local initiatives and conversations will be permanently deleted.'
    )
    if (confirm) {
      await window.forge.system.resetDatabase()
      onRetry()
    }
  }

  return (
    <div className="flex h-screen w-screen bg-forge-bg text-forge-text items-center justify-center forge-grid-bg">
      <div className="max-w-md w-full bg-forge-panel border border-forge-error/50 p-6 rounded shadow-glow-strong flex flex-col gap-4">
        <ErrorState
          title="Database Initialization Failed"
          message={error}
          className="border-none p-0"
        />
        {dbPath && (
          <div className="text-xs font-mono text-forge-text-muted bg-forge-surface p-2 rounded break-all border border-forge-border">
            {dbPath}
          </div>
        )}
        <div className="flex flex-col gap-2 mt-4">
          <button
            onClick={onRetry}
            className="w-full px-4 py-2 bg-forge-surface border border-forge-border hover:bg-forge-panel transition-colors rounded text-sm font-medium"
          >
            Retry Initialization
          </button>
          {dbPath && (
            <button
              onClick={handleReveal}
              className="w-full px-4 py-2 bg-forge-surface border border-forge-border hover:bg-forge-panel transition-colors rounded text-sm font-medium"
            >
              Reveal Database in File Explorer
            </button>
          )}
          <button
            onClick={handleReset}
            className="w-full px-4 py-2 bg-forge-surface border border-forge-error hover:bg-forge-error hover:text-white transition-colors rounded text-sm font-medium mt-4 text-forge-error"
          >
            Reset Local Database (Data Loss)
          </button>
        </div>
      </div>
    </div>
  )
}

function App(): React.JSX.Element {
  const fetchInitiatives = useInitiativeStore((state) => state.fetchInitiatives)
  const [initStatus, setInitStatus] = useState<{
    status: 'loading' | 'success' | 'error' | 'onboarding'
    error?: string
    dbPath?: string
  }>({ status: 'loading' })

  const checkStatus = useCallback(async (): Promise<void> => {
    // Avoid resetting loading state to prevent flickering and cascaded setState issues
    // Just fetch status and set final result.
    const result = await window.forge.system.getStatus()
    if (result.success) {
      if (result.data.isSetup) {
        setInitStatus({ status: 'success' })
        fetchInitiatives()
      } else {
        setInitStatus({ status: 'onboarding' })
      }
    } else {
      setInitStatus({ status: 'error', error: result.error.message, dbPath: result.error.dbPath })
    }
  }, [fetchInitiatives])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkStatus()
  }, [checkStatus])

  if (initStatus.status === 'loading') {
    return (
      <div className="h-screen w-screen bg-forge-bg flex items-center justify-center text-forge-text-muted font-mono text-sm">
        Initializing Forge Backend...
      </div>
    )
  }

  if (initStatus.status === 'onboarding') {
    return <Onboarding onComplete={checkStatus} />
  }

  if (initStatus.status === 'error') {
    return (
      <StartupRecovery
        error={initStatus.error || 'Unknown Error'}
        dbPath={initStatus.dbPath}
        onRetry={() => window.location.reload()}
      />
    )
  }

  return (
    <ErrorBoundary FallbackComponent={GlobalErrorFallback} onReset={() => window.location.reload()}>
      <HashRouter>
        <div className="flex h-screen w-screen bg-forge-bg text-forge-text overflow-hidden forge-grid-bg selection:bg-forge-amber/30">
          <Sidebar />

          <main className="flex-1 flex flex-col overflow-hidden relative z-0">
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/workspace" element={<Workspace />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </ErrorBoundary>
  )
}

export default App
