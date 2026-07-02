export interface NodeData {
  id: string
  type?: string
  label: string
  position: { x: number; y: number }
  data?: Record<string, unknown>
}

export interface EdgeData {
  id: string
  source: string
  target: string
  label?: string
  animated?: boolean
}

export interface GraphData {
  nodes: NodeData[]
  edges: EdgeData[]
}
