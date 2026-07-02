import React from 'react'
import { Handle, Position } from '@xyflow/react'

export const ForgeNode: React.FC<{ data: { label: string } }> = ({ data }) => {
  return (
    <div className="bg-forge-surface border border-forge-amber/30 text-forge-text font-mono text-xs rounded-sm shadow-glow flex flex-col items-center justify-center min-w-[120px] relative">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-forge-amber !w-2 !h-2 !border-none !-mt-1 !rounded-none"
      />
      <div className="bg-forge-panel w-full p-1 border-b border-forge-border text-center text-forge-amber font-semibold">
        NODE
      </div>
      <div className="p-3 w-full text-center">{data.label}</div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-forge-amber !w-2 !h-2 !border-none !-mb-1 !rounded-none"
      />
    </div>
  )
}
