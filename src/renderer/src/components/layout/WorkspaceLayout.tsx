import React, { ReactNode, useRef, useState, useCallback } from 'react'

export interface WorkspaceLayoutProps {
  mainPanel: ReactNode
  rightPanel?: ReactNode
  bottomPanel?: ReactNode
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  mainPanel,
  rightPanel,
  bottomPanel
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Horizontal split: center vs right (percentage of total width)
  const [rightWidth, setRightWidth] = useState(280) // px
  const isDraggingH = useRef(false)

  // Vertical split: editor vs terminal (percentage of center height)
  const [bottomHeight, setBottomHeight] = useState(180) // px
  const isDraggingV = useRef(false)

  const handleHMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingH.current = true

    const onMouseMove = (e: MouseEvent): void => {
      if (!isDraggingH.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newRight = rect.right - e.clientX
      setRightWidth(Math.max(200, Math.min(500, newRight)))
    }

    const onMouseUp = (): void => {
      isDraggingH.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  const handleVMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingV.current = true

    const onMouseMove = (e: MouseEvent): void => {
      if (!isDraggingV.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newBottom = rect.bottom - e.clientY
      setBottomHeight(Math.max(80, Math.min(400, newBottom)))
    }

    const onMouseUp = (): void => {
      isDraggingV.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full flex gap-1 p-2 bg-forge-bg overflow-hidden">
      {/* Center Column: Editor + Terminal */}
      <div className="flex-1 flex flex-col gap-1 min-w-0 h-full">
        {/* Editor Panel */}
        <div
          className="flex-1 min-h-0 bg-forge-panel border border-forge-border rounded-xl flex flex-col overflow-hidden shadow-md"
          style={bottomPanel ? { flexShrink: 1 } : undefined}
        >
          {mainPanel}
        </div>

        {/* Vertical Resize Handle */}
        {bottomPanel && (
          <>
            <div
              className="h-3 w-full flex items-center justify-center cursor-row-resize group shrink-0"
              onMouseDown={handleVMouseDown}
            >
              <div className="w-10 h-[3px] rounded-full bg-forge-border group-hover:bg-forge-amber/50 group-active:bg-forge-amber transition-colors" />
            </div>

            {/* Terminal Panel */}
            <div
              className="shrink-0 bg-forge-panel border border-forge-border rounded-xl flex flex-col overflow-hidden shadow-md"
              style={{ height: bottomHeight }}
            >
              {bottomPanel}
            </div>
          </>
        )}
      </div>

      {/* Horizontal Resize Handle */}
      {rightPanel && (
        <>
          <div
            className="w-3 h-full flex items-center justify-center cursor-col-resize group shrink-0"
            onMouseDown={handleHMouseDown}
          >
            <div className="h-10 w-[3px] rounded-full bg-forge-border group-hover:bg-forge-amber/50 group-active:bg-forge-amber transition-colors" />
          </div>

          {/* Right Panel (AI Chat) */}
          <div
            className="shrink-0 h-full bg-forge-panel border border-forge-border rounded-xl flex flex-col overflow-hidden shadow-md"
            style={{ width: rightWidth }}
          >
            {rightPanel}
          </div>
        </>
      )}
    </div>
  )
}
