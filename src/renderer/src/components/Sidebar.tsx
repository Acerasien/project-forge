import React, { useState } from 'react'
import { useInitiativeStore } from '../store/useInitiativeStore'
import { FolderGit2, Plus, LayoutDashboard, Settings as SettingsIcon, Link2, ChevronDown, FileText } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { InitiativeCreateModal } from './InitiativeCreateModal'
import { cn } from '../utils/cn'
import { useDocumentStore } from '../store/useDocumentStore'
import { useArtifactStore } from '../store/useArtifactStore'
import { documentManager } from '../managers/DocumentManager'

export const Sidebar: React.FC = () => {
  const { initiatives, activeInitiativeId, setActiveInitiative } = useInitiativeStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const location = useLocation()
  const isWorkspaceRoute = location.pathname === '/workspace'
  
  const { documents, activeDocumentId } = useDocumentStore()
  const { artifacts } = useArtifactStore()

  return (
    <>
      <aside className="w-64 flex flex-col border-r border-forge-border bg-forge-panel bg-opacity-90 backdrop-blur z-10 shadow-lg">
        <div className="p-4 border-b border-forge-border/50 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-forge-amber font-bold tracking-widest text-sm uppercase">
            <Link2 size={16} className="drop-shadow-[0_0_8px_rgba(255,176,0,0.5)]" />
            <span>Project Forge</span>
          </div>
          <button className="flex items-center justify-between w-full bg-forge-surface/50 border border-forge-border p-2 rounded-md hover:bg-forge-surface hover:border-forge-border-focus transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-forge-amber/20 flex items-center justify-center text-forge-amber">
                <FolderGit2 size={14} />
              </div>
              <span className="text-sm text-forge-text font-medium">Test Workspace</span>
            </div>
            <ChevronDown size={14} className="text-forge-text-muted" />
          </button>
        </div>

        <nav className="p-4 border-b border-forge-border flex flex-col gap-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors',
                isActive
                  ? 'bg-forge-surface text-white font-medium shadow-sm'
                  : 'text-forge-text-muted hover:text-white hover:bg-forge-surface/50'
              )
            }
          >
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors',
                isActive
                  ? 'bg-forge-surface text-white font-medium shadow-sm'
                  : 'text-forge-text-muted hover:text-white hover:bg-forge-surface/50'
              )
            }
          >
            <SettingsIcon size={18} />
            Settings
          </NavLink>
        </nav>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-forge-text-muted uppercase tracking-wider">
              Initiatives
            </h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-1 text-forge-text-muted hover:text-forge-amber hover:bg-forge-border rounded transition-colors"
              title="Create Initiative"
            >
              <Plus size={14} />
            </button>
          </div>

          <ul className="space-y-1.5">
            {initiatives.map((init) => (
              <li key={init.id}>
                <NavLink
                  to="/workspace"
                  onClick={() => setActiveInitiative(init.id)}
                  className={({ isActive }) =>
                    cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-all duration-200',
                      isActive && activeInitiativeId === init.id
                        ? 'bg-forge-amber/10 text-forge-amber shadow-[inset_2px_0_0_0_rgba(255,176,0,1)]'
                        : 'text-forge-text hover:bg-forge-border/50 hover:text-white'
                    )
                  }
                >
                  <FolderGit2
                    size={16}
                    className={
                      activeInitiativeId === init.id ? 'text-forge-amber' : 'text-forge-text-muted'
                    }
                  />
                  <span className="truncate">{init.name}</span>
                </NavLink>
              </li>
            ))}
            {initiatives.length === 0 && (
              <p className="text-xs text-forge-text-muted italic text-center mt-6">
                No initiatives found.
              </p>
            )}
          </ul>

          {/* Active Workspace Navigation Context */}
          {isWorkspaceRoute && activeInitiativeId && (
            <div className="mt-6 pt-6 border-t border-forge-border/50 flex flex-col gap-6">
              {/* Artifacts (Workflow) Section */}
              <div className="flex flex-col">
                <div className="text-[10px] font-bold text-forge-text-muted mb-2 uppercase tracking-wider font-mono">
                  Artifacts (Workflow)
                </div>
                <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto">
                  {artifacts.length === 0 && (
                    <div className="text-forge-text-muted opacity-50 text-xs italic px-2">
                      No artifacts.
                    </div>
                  )}
                  {artifacts.map((artifact) => (
                    <div
                      key={artifact.id}
                      className="flex items-center justify-between text-xs px-2 py-1.5 rounded transition-colors text-forge-text-muted hover:bg-forge-surface/50 hover:text-forge-text"
                    >
                      <span className="truncate mr-2">{artifact.title}</span>
                      <span
                        className={cn(
                          'text-[9px] uppercase tracking-wider px-1 py-0.2 rounded font-mono',
                          artifact.status === 'Approved'
                            ? 'bg-green-500/10 text-green-500'
                            : artifact.status === 'NeedsReview'
                              ? 'bg-forge-amber/10 text-forge-amber'
                              : 'bg-forge-surface text-forge-text-muted'
                        )}
                      >
                        {artifact.status === 'Approved' ? 'Ok' : 'Review'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents Section */}
              <div className="flex flex-col">
                <div className="text-[10px] font-bold text-forge-text-muted mb-2 uppercase tracking-wider font-mono">
                  Documents
                </div>
                <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                  {documents.length === 0 && (
                    <div className="text-forge-text-muted opacity-50 text-xs italic px-2">
                      No files found.
                    </div>
                  )}
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => documentManager.openDocument(doc.id)}
                      className={cn(
                        'w-full text-left text-xs px-2 py-1.5 rounded transition-colors flex items-center gap-2 truncate',
                        activeDocumentId === doc.id
                          ? 'bg-forge-amber/10 text-forge-amber font-medium'
                          : 'text-forge-text-muted hover:bg-forge-surface/50 hover:text-forge-text'
                      )}
                    >
                      <FileText size={12} className="shrink-0" />
                      <span className="truncate">{doc.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-forge-border/50">
          <button className="flex items-center justify-between w-full p-2 hover:bg-forge-surface/50 rounded-md transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-forge-amber text-forge-bg font-bold flex items-center justify-center text-sm">
                AP
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium text-forge-text group-hover:text-white transition-colors">Alex Parker</span>
                <span className="text-xs text-forge-text-muted">alex@example.com</span>
              </div>
            </div>
            <ChevronDown size={14} className="text-forge-text-muted" />
          </button>
        </div>
      </aside>

      <InitiativeCreateModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
