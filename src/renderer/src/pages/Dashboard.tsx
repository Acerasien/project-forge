import React from 'react'
import { SectionHeader } from '../components/ui/SectionHeader'
import { useInitiativeStore } from '../store/useInitiativeStore'
import { FolderGit2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const Dashboard: React.FC = () => {
  const { initiatives, setActiveInitiative } = useInitiativeStore()
  const navigate = useNavigate()

  const handleSelect = (id: string): void => {
    setActiveInitiative(id)
    navigate('/workspace')
  }

  return (
    <div className="max-w-5xl mx-auto w-full">
      <SectionHeader title="Dashboard" description="Overview of your Forge initiatives." />

      <div className="mt-8">
        <h4 className="text-forge-text-muted text-sm mb-4 font-mono">RECENT_INITIATIVES</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {initiatives.map((init) => (
            <button
              key={init.id}
              onClick={() => handleSelect(init.id)}
              className="flex items-center gap-4 p-4 rounded bg-forge-surface border border-forge-border hover:border-forge-amber transition-colors text-left group shadow-sm hover:shadow-glow"
            >
              <div className="p-2 rounded bg-forge-bg text-forge-text-muted group-hover:text-forge-amber transition-colors border border-forge-border group-hover:border-forge-amber/50">
                <FolderGit2 size={24} />
              </div>
              <div>
                <h5 className="text-forge-text font-medium group-hover:text-white transition-colors">
                  {init.name}
                </h5>
                <p className="text-xs text-forge-text-muted mt-1">
                  Opened {new Date(init.createdAt).toLocaleDateString()}
                </p>
              </div>
            </button>
          ))}

          {initiatives.length === 0 && (
            <div className="col-span-full p-8 text-center text-forge-text-muted border border-dashed border-forge-border rounded bg-forge-surface">
              No initiatives found. Create one from the sidebar.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
