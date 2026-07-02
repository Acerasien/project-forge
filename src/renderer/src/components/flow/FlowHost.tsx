import React, {
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState
} from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { GraphData, NodeData, EdgeData } from './types'
import { ForgeNode } from './ForgeNode'
import { useErrorBoundary } from 'react-error-boundary'
import { ToolHandle } from '../../types/workspace'

export interface FlowHostProps {
  graphData: GraphData
  onChange?: (graphData: GraphData) => void
}

const nodeTypes = {
  forge: ForgeNode
}

// Domain Mappers
function toFlowNodes(graphData: GraphData): Node[] {
  return graphData.nodes.map((n) => ({
    id: n.id,
    type: n.type || 'forge',
    position: n.position,
    data: { label: n.label, ...n.data }
  }))
}

function toFlowEdges(graphData: GraphData): Edge[] {
  return graphData.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: e.animated,
    style: { stroke: 'var(--forge-amber)' }
  }))
}

function fromFlowNodes(nodes: Node[]): NodeData[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type,
    label: (n.data?.label as string) || '',
    position: n.position,
    data: n.data
  }))
}

function fromFlowEdges(edges: Edge[]): EdgeData[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: typeof e.label === 'string' ? e.label : undefined,
    animated: e.animated
  }))
}

export const FlowHost = forwardRef<ToolHandle, FlowHostProps>(({ graphData, onChange }, ref) => {
  const { showBoundary } = useErrorBoundary()
  const [nodes, setNodes] = useNodesState<Node>([])
  const [edges, setEdges] = useEdgesState<Edge>([])
  const currentStream = useRef<{ cancel: () => void } | null>(null)
  const [generationError, setGenerationError] = useState<{ message: string; raw?: string } | null>(
    null
  )

  useImperativeHandle(ref, () => ({
    executeAICommand: (
      prompt: string,
      options: { conversationId: string; initiativeId: string }
    ) => {
      if (currentStream.current) return
      setGenerationError(null)

      let collectedJson = ''
      const systemPrompt = `You are an AI assistant that generates graphs.
Based on the user prompt, generate a JSON object containing "nodes" and "edges" arrays.
Example: { "nodes": [{ "id": "n1", "label": "Start", "position": { "x": 0, "y": 0 } }], "edges": [] }
Reply ONLY with the raw JSON. Do not include markdown formatting, markdown code blocks (e.g. no \`\`\`json), or explanations.`

      currentStream.current = window.forge.ai
        .generate({
          conversationId: options.conversationId,
          initiativeId: options.initiativeId,
          prompt,
          toolContext: { tool: 'flow' },
          systemPrompt
        })
        .onChunk((text) => {
          collectedJson += text
        })
        .onComplete(() => {
          currentStream.current = null
          try {
            const parsed = JSON.parse(collectedJson) as GraphData
            const newNodes = toFlowNodes(parsed)
            const newEdges = toFlowEdges(parsed)

            setNodes((nds) => {
              const finalNodes = [...nds, ...newNodes]
              setEdges((eds) => {
                const finalEdges = [...eds, ...newEdges]
                // triggerChange is technically stale here if it depends on state, but it doesn't
                // Wait, triggerChange is a useCallback, we can just call onChange directly here.
                if (onChange) {
                  onChange({
                    nodes: fromFlowNodes(finalNodes),
                    edges: fromFlowEdges(finalEdges)
                  })
                }
                return finalEdges
              })
              return finalNodes
            })
            setGenerationError(null)
          } catch {
            setGenerationError({
              message: 'AI failed to generate a valid graph structure.',
              raw: collectedJson
            })
          }
        })
        .onError((err) => {
          setGenerationError({ message: `AI graph generation error: ${err}` })
          currentStream.current = null
        })
    },
    cancelAICommand: () => {
      if (currentStream.current) {
        currentStream.current.cancel()
        currentStream.current = null
      }
    }
  }))

  useEffect(() => {
    try {
      setNodes(toFlowNodes(graphData))
      setEdges(toFlowEdges(graphData))
    } catch (err) {
      showBoundary(err)
    }
  }, [graphData, setNodes, setEdges, showBoundary])

  useEffect(() => {
    return () => {
      if (currentStream.current) {
        currentStream.current.cancel()
        currentStream.current = null
      }
    }
  }, [])

  const triggerChange = useCallback(
    (newNodes: Node[], newEdges: Edge[]) => {
      if (onChange) {
        onChange({
          nodes: fromFlowNodes(newNodes),
          edges: fromFlowEdges(newEdges)
        })
      }
    },
    [onChange]
  )

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => {
        const next = applyNodeChanges(changes, nds)
        triggerChange(next, edges)
        return next
      })
    },
    [setNodes, edges, triggerChange]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const next = applyEdgeChanges(changes, eds)
        triggerChange(nodes, next)
        return next
      })
    },
    [setEdges, nodes, triggerChange]
  )

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      setEdges((eds) => {
        const next = addEdge(params, eds)
        triggerChange(nodes, next)
        return next
      })
    },
    [setEdges, nodes, triggerChange]
  )

  return (
    <div
      className="w-full h-full relative"
      style={
        {
          '--xy-node-border-radius': '0px',
          '--xy-edge-stroke': 'var(--forge-border)',
          '--xy-minimap-background-color': 'var(--forge-surface)',
          '--xy-minimap-mask-bg-color': 'rgba(0,0,0,0.5)',
          '--xy-controls-button-bg-color': 'var(--forge-panel)',
          '--xy-controls-button-border-color': 'var(--forge-border)',
          '--xy-controls-button-color-hover': 'var(--forge-amber)'
        } as React.CSSProperties
      }
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls showInteractive={false} />
        <MiniMap zoomable pannable nodeColor="var(--forge-amber)" maskColor="rgba(0,0,0,0.5)" />
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="var(--forge-border)"
        />
      </ReactFlow>

      {generationError && (
        <div className="absolute top-4 right-4 bg-forge-panel border border-forge-error p-4 rounded max-w-sm flex flex-col gap-2 z-[999] shadow-glow-strong">
          <div className="flex justify-between items-center text-forge-error">
            <span className="font-bold text-sm uppercase tracking-widest">Generation Failed</span>
            <button
              onClick={() => setGenerationError(null)}
              className="text-xs hover:text-white transition-colors"
            >
              [CLOSE]
            </button>
          </div>
          <div className="text-sm text-forge-text-muted">{generationError.message}</div>
          {generationError.raw && (
            <details className="text-xs font-mono text-forge-text-muted mt-2">
              <summary className="cursor-pointer hover:text-forge-text transition-colors">
                Show Details ▼
              </summary>
              <div className="mt-2 bg-forge-surface p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto border border-forge-border">
                {generationError.raw}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
})

FlowHost.displayName = 'FlowHost'
