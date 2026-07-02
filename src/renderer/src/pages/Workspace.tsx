import React, { useState, useRef, useEffect } from 'react'
import { useInitiativeStore } from '../store/useInitiativeStore'
import { SectionHeader } from '../components/ui/SectionHeader'
import { EmptyState } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout'
import { EditorHost } from '../components/editor/EditorHost'
import { FlowHost } from '../components/flow/FlowHost'
import { GraphData } from '../components/flow/types'
import { cn } from '../utils/cn'
import { CommandPalette } from '../components/ui/CommandPalette'
import { ToolHandle } from '../types/workspace'
import { useAIStore } from '../store/useAIStore'
import { v4 as uuidv4 } from 'uuid'

const sampleGraph: GraphData = {
  nodes: [
    { id: '1', label: 'Start', position: { x: 250, y: 50 } },
    { id: '2', label: 'Process Data', position: { x: 100, y: 150 } },
    { id: '3', label: 'Analyze', position: { x: 400, y: 150 } },
    { id: '4', label: 'End', position: { x: 250, y: 300 } }
  ],
  edges: [
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e1-3', source: '1', target: '3' },
    { id: 'e2-4', source: '2', target: '4' },
    { id: 'e3-4', source: '3', target: '4' }
  ]
}

export const Workspace: React.FC = () => {
  const { initiatives, activeInitiativeId } = useInitiativeStore()
  const activeInitiative = initiatives.find((i) => i.id === activeInitiativeId)

  const [docContent, setDocContent] = useState(
    '// Initialize Forge Engine\nfunction init() {\n  console.log("Forge Engine ready.");\n}\n'
  )
  const [graphData, setGraphData] = useState<GraphData>(sampleGraph)
  const [activeTool, setActiveTool] = useState<'editor' | 'flow'>('editor')

  const {
    activeConversationId,
    messages,
    isGenerating,
    setGenerating,
    loadConversations,
    loadMessages,
    createConversation,
    appendOptimisticMessage,
    updateOptimisticMessage
  } = useAIStore()

  const [prompt, setPrompt] = useState('')
  const currentStream = useRef<{ cancel: () => void } | null>(null)
  const generatingMessageId = useRef<string | null>(null)

  useEffect(() => {
    if (activeInitiativeId) {
      loadConversations(activeInitiativeId).then(() => {
        const { conversations } = useAIStore.getState()
        if (conversations.length === 0) {
          createConversation(activeInitiativeId)
        } else {
          useAIStore.getState().setActiveConversation(conversations[0].id)
          loadMessages(conversations[0].id)
        }
      })
    }
  }, [activeInitiativeId, loadConversations, createConversation, loadMessages])

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const editorRef = useRef<ToolHandle>(null)
  const flowRef = useRef<ToolHandle>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleCommandPaletteSubmit = (cmdPrompt: string): void => {
    if (!activeConversationId || !activeInitiativeId) return
    const options = { conversationId: activeConversationId, initiativeId: activeInitiativeId }

    if (activeTool === 'editor' && editorRef.current) {
      editorRef.current.executeAICommand(cmdPrompt, options)
    } else if (activeTool === 'flow' && flowRef.current) {
      flowRef.current.executeAICommand(cmdPrompt, options)
    }
  }

  const handleGenerate = (): void => {
    if (!prompt.trim() || isGenerating || !activeConversationId || !activeInitiativeId) return
    const currentPrompt = prompt
    setPrompt('')
    setGenerating(true)

    // Add optimistic user message
    appendOptimisticMessage({
      id: uuidv4(),
      conversationId: activeConversationId,
      role: 'user',
      content: currentPrompt,
      createdAt: new Date().toISOString()
    })

    const assistantMsgId = uuidv4()
    generatingMessageId.current = assistantMsgId

    // Add optimistic empty assistant message
    appendOptimisticMessage({
      id: assistantMsgId,
      conversationId: activeConversationId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString()
    })

    let accumulatedContent = ''

    currentStream.current = window.forge.ai
      .generate({
        conversationId: activeConversationId,
        initiativeId: activeInitiativeId,
        prompt: currentPrompt
      })
      .onChunk((text): void => {
        accumulatedContent += text
        updateOptimisticMessage(assistantMsgId, accumulatedContent)
      })
      .onComplete((): void => {
        setGenerating(false)
        currentStream.current = null
        generatingMessageId.current = null
      })
      .onError((err): void => {
        updateOptimisticMessage(assistantMsgId, accumulatedContent + '\n[Error: ' + err + ']')
        setGenerating(false)
        currentStream.current = null
        generatingMessageId.current = null
      })
  }

  const handleCancel = (): void => {
    if (currentStream.current && generatingMessageId.current) {
      currentStream.current.cancel()

      const messages = useAIStore.getState().messages
      const generatingMsg = messages.find((m) => m.id === generatingMessageId.current)
      if (generatingMsg) {
        updateOptimisticMessage(
          generatingMessageId.current,
          generatingMsg.content + '\n\n[Interrupted]'
        )
      }

      setGenerating(false)
      currentStream.current = null
      generatingMessageId.current = null
    }
  }

  if (!activeInitiative) {
    return (
      <EmptyState
        title="No Initiative Selected"
        description="Select an initiative from the sidebar or dashboard to load the workspace."
        className="h-full border-none bg-transparent"
      />
    )
  }

  const leftPanel = (
    <div className="h-full flex flex-col">
      <div className="text-xs font-mono text-forge-text-muted mb-4 border-b border-forge-border pb-2 px-4 mt-4">
        ARTIFACTS
      </div>
      <div className="flex-1 flex items-center justify-center text-forge-text-muted opacity-50 text-sm">
        [Tree View]
      </div>
    </div>
  )

  const mainPanel = (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-forge-border pb-2 px-4 mt-4">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTool('editor')}
            className={cn(
              'text-xs font-mono transition-colors focus:outline-none',
              activeTool === 'editor'
                ? 'text-forge-amber'
                : 'text-forge-text-muted hover:text-forge-text'
            )}
          >
            CODE
          </button>
          <button
            onClick={() => setActiveTool('flow')}
            className={cn(
              'text-xs font-mono transition-colors focus:outline-none',
              activeTool === 'flow'
                ? 'text-forge-amber'
                : 'text-forge-text-muted hover:text-forge-text'
            )}
          >
            FLOW
          </button>
        </div>
        <div className="text-xs font-mono text-forge-text-muted opacity-50 uppercase tracking-widest">
          {activeTool === 'editor' ? 'Editor_Surface' : 'Graph_Surface'}
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative">
        {activeTool === 'editor' ? (
          <EditorHost
            ref={editorRef}
            key={`${activeInitiative.id}-editor`}
            initialDoc={docContent}
            onChange={setDocContent}
          />
        ) : (
          <FlowHost
            ref={flowRef}
            key={`${activeInitiative.id}-flow`}
            graphData={graphData}
            onChange={setGraphData}
          />
        )}
      </div>
    </div>
  )

  const bottomPanel = (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-forge-border pb-2 px-4 mt-4">
        <div className="text-xs font-mono text-forge-text-muted uppercase tracking-widest">
          TERMINAL / AI CHAT
        </div>
        {isGenerating && (
          <button
            onClick={handleCancel}
            className="text-xs font-mono text-forge-error hover:text-red-400 focus:outline-none"
          >
            [Stop Generating]
          </button>
        )}
      </div>
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 text-sm font-mono text-forge-text-muted">
          {messages.length === 0 ? (
            <div className="opacity-50">Standby for generation...</div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}
              >
                <div className="text-[10px] opacity-50 uppercase tracking-widest mb-1">
                  {msg.role}
                </div>
                <div
                  className={cn(
                    'px-3 py-2 rounded max-w-[80%] whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-forge-amber/10 border border-forge-amber/30 text-forge-amber'
                      : 'bg-forge-surface border border-forge-border'
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-forge-surface border border-forge-border rounded px-3 py-1 text-sm font-mono focus:outline-none focus:border-forge-amber transition-colors"
            placeholder="Enter prompt..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <SectionHeader
        title={activeInitiative.name}
        description="Workspace environment ready."
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setIsCommandPaletteOpen(true)}>
              Ask AI (⌘K)
            </Button>
            <Button size="sm">Export</Button>
          </div>
        }
        className="shrink-0"
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSubmit={handleCommandPaletteSubmit}
      />

      <div className="flex-1 min-h-0 mt-4 pb-4">
        <WorkspaceLayout leftPanel={leftPanel} mainPanel={mainPanel} bottomPanel={bottomPanel} />
      </div>
    </div>
  )
}
