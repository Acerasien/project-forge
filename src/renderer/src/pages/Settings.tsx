import React from 'react'
import { SectionHeader } from '../components/ui/SectionHeader'
import { DoppelrandPanel } from '../components/ui/DoppelrandPanel'

export const Settings: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto w-full">
      <SectionHeader title="Settings" description="Application configuration and preferences." />

      <div className="mt-8">
        <DoppelrandPanel>
          <div className="text-sm text-forge-text-muted">
            Telemetry and configuration options will appear here.
          </div>
        </DoppelrandPanel>
      </div>
    </div>
  )
}
