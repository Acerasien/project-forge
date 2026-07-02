import React, { ReactNode } from 'react'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { DoppelrandPanel } from '../ui/DoppelrandPanel'
import { cn } from '../../utils/cn'

export interface WorkspaceLayoutProps {
  leftPanel: ReactNode
  mainPanel: ReactNode
  rightPanel?: ReactNode
  bottomPanel?: ReactNode
}

const ResizeHandle: React.FC<{ vertical?: boolean }> = ({ vertical }) => (
  <PanelResizeHandle
    className={cn(
      'flex items-center justify-center bg-forge-bg transition-colors hover:bg-forge-amber/20 active:bg-forge-amber/40 group',
      vertical ? 'h-1 w-full cursor-row-resize' : 'w-1 h-full cursor-col-resize z-10'
    )}
  >
    <div
      className={cn(
        'bg-forge-border group-hover:bg-forge-amber transition-colors rounded-full',
        vertical ? 'w-8 h-[2px]' : 'h-8 w-[2px]'
      )}
    />
  </PanelResizeHandle>
)

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  leftPanel,
  mainPanel,
  rightPanel,
  bottomPanel
}) => {
  return (
    <PanelGroup orientation="horizontal" className="w-full h-full">
      <Panel defaultSize={20} minSize={15} maxSize={30} className="flex flex-col h-full min-w-0">
        <DoppelrandPanel className="h-full w-full rounded-r-none border-r-0">
          {leftPanel}
        </DoppelrandPanel>
      </Panel>

      <ResizeHandle />

      <Panel className="flex flex-col h-full min-w-0">
        {bottomPanel ? (
          <PanelGroup orientation="vertical">
            <Panel className="flex flex-col min-h-0">
              <DoppelrandPanel variant="amber" className="h-full w-full rounded-none border-x-0">
                {mainPanel}
              </DoppelrandPanel>
            </Panel>

            <ResizeHandle vertical />
            <Panel
              defaultSize={25}
              minSize={15}
              maxSize={50}
              collapsible
              className="flex flex-col min-h-0"
            >
              <DoppelrandPanel className="h-full w-full rounded-none border-x-0 border-t-0">
                {bottomPanel}
              </DoppelrandPanel>
            </Panel>
          </PanelGroup>
        ) : (
          <DoppelrandPanel variant="amber" className="h-full w-full rounded-none border-x-0">
            {mainPanel}
          </DoppelrandPanel>
        )}
      </Panel>

      {rightPanel && (
        <>
          <ResizeHandle />
          <Panel
            defaultSize={20}
            minSize={15}
            maxSize={30}
            collapsible
            className="flex flex-col h-full min-w-0"
          >
            <DoppelrandPanel className="h-full w-full rounded-l-none border-l-0">
              {rightPanel}
            </DoppelrandPanel>
          </Panel>
        </>
      )}
    </PanelGroup>
  )
}
