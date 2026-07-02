import React, { useState } from 'react'
import { useInitiativeStore } from '../store/useInitiativeStore'
import { FolderGit2, Plus, Terminal, LayoutDashboard, Settings as SettingsIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { InitiativeCreateModal } from './InitiativeCreateModal'
import { cn } from '../utils/cn'

export const Sidebar: React.FC = () => {
  const { initiatives, activeInitiativeId, setActiveInitiative } = useInitiativeStore()
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <aside className="w-64 flex flex-col border-r border-forge-border bg-forge-panel bg-opacity-90 backdrop-blur z-10 shadow-lg">
        <div className="p-4 border-b border-forge-border flex items-center gap-2 text-forge-amber bg-black/20">
          <Terminal size={20} className="drop-shadow-[0_0_8px_rgba(255,176,0,0.5)]" />
          <span className="font-bold tracking-widest text-sm uppercase">Project Forge</span>
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
        </div>
      </aside>

      <InitiativeCreateModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
