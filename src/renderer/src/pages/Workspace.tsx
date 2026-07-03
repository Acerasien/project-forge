import React, { useState, useRef, useEffect } from 'react'
import { useInitiativeStore } from '../store/useInitiativeStore'
import { SectionHeader } from '../components/ui/SectionHeader'
import { EmptyState } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout'
import { WorkspaceHost } from '../components/workspace/WorkspaceHost'
import { ToolRegistry } from '../tools'
import { cn } from '../utils/cn'
import { CommandPalette } from '../components/ui/CommandPalette'
import { ToolHandle } from '../types/workspace'
import { useAIStore } from '../store/useAIStore'
import { useDocumentStore } from '../store/useDocumentStore'
import { useArtifactStore } from '../store/useArtifactStore'
import { documentManager } from '../managers/DocumentManager'
import { v4 as uuidv4 } from 'uuid'
import {
  FileText,
  Sparkles,
  Download,
  ChevronDown,
  Trash2,
  Maximize2,
  ChevronUp,
  Send,
  Terminal,
  ChevronRight
} from 'lucide-react'

export const Workspace: React.FC = () => {
  const { initiatives, activeInitiativeId } = useInitiativeStore()
  const activeInitiative = initiatives.find((i) => i.id === activeInitiativeId)

  const { documents, activeDocumentId } = useDocumentStore()
  const activeDocument = documents.find((d) => d.id === activeDocumentId) || null

  // Determine tool automatically based on active document, fallback to first tool if forcing
  const autoTool = activeDocument ? ToolRegistry.getToolForDocument(activeDocument) : null
  const [forcedToolId, setForcedToolId] = useState<string | null>(null)
  const activeToolId = forcedToolId || autoTool?.id || ''

  const {
    activeConversationId,
    messages,
    isGenerating,
    setGenerating,
    loadConversations,
    loadMessages,
    createConversation,
    appendOptimisticMessage,
    updateOptimisticMessage,
    updateOptimisticMessageMetadata
  } = useAIStore()

  const [prompt, setPrompt] = useState('')
  const currentStream = useRef<{ cancel: () => void } | null>(null)
  const generatingMessageId = useRef<string | null>(null)

  // Agent State
  const [activeWorkflow, setActiveWorkflow] = useState<{
    id: string
    plan: Record<string, unknown> | null
    events: Record<string, unknown>[]
  } | null>(null)

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

      // Load documents and artifacts for this initiative
      documentManager.loadDocuments(activeInitiativeId)
      useArtifactStore.getState().loadArtifacts(activeInitiativeId)
    } else {
      documentManager.closeDocument()
    }
  }, [activeInitiativeId, loadConversations, createConversation, loadMessages])

  const [isChatOpen, setIsChatOpen] = useState(true)
  const [isTerminalOpen, setIsTerminalOpen] = useState(true)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const workspaceHostRef = useRef<ToolHandle>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsChatOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleCommandPaletteSubmit = (cmdPrompt: string): void => {
    if (!activeConversationId || !activeInitiativeId) return
    const options = { conversationId: activeConversationId, initiativeId: activeInitiativeId }

    if (workspaceHostRef.current) {
      workspaceHostRef.current.executeAICommand(cmdPrompt, options)
    }
  }

  const handleAgentGoal = (goal: string): void => {
    if (!activeInitiativeId) return
    setActiveWorkflow({ id: 'pending', plan: null, events: [] })

    window.forge.agent.executeGoal(goal, activeInitiativeId).onEvent((event) => {
      setActiveWorkflow((prev) => {
        const id = event.workflowId as string
        const current =
          prev?.id === id || prev?.id === 'pending' ? prev : { id, plan: null, events: [] }

        if (event.type === 'plan_created') {
          current.plan = event.data as Record<string, unknown>
        }
        current.id = id
        current.events = [...current.events, event as unknown as Record<string, unknown>]
        return { ...current }
      })
    })
  }

  const handleGenerate = (): void => {
    if (!prompt.trim() || isGenerating || !activeConversationId || !activeInitiativeId) return
    const currentPrompt = prompt
    setPrompt('')

    if (currentPrompt.startsWith('/agent ')) {
      handleAgentGoal(currentPrompt.slice(7).trim())
      return
    }

    setGenerating(true)

    appendOptimisticMessage({
      id: uuidv4(),
      conversationId: activeConversationId,
      role: 'user',
      content: currentPrompt,
      createdAt: new Date().toISOString()
    })

    const assistantMsgId = uuidv4()
    generatingMessageId.current = assistantMsgId

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
      .onChunk((event: Record<string, unknown>): void => {
        if (event.type === 'text') {
          accumulatedContent += event.content as string
          updateOptimisticMessage(assistantMsgId, accumulatedContent)
        } else if (event.type === 'tool_start') {
          const currentMetadata =
            useAIStore.getState().messages.find((m) => m.id === assistantMsgId)?.metadata || {}
          const toolCalls = (currentMetadata.toolCalls || []) as Record<string, unknown>[]
          toolCalls.push({ name: event.name, status: 'running' })
          updateOptimisticMessageMetadata(assistantMsgId, { toolCalls })
        } else if (event.type === 'tool_end') {
          const currentMetadata =
            useAIStore.getState().messages.find((m) => m.id === assistantMsgId)?.metadata || {}
          const toolCalls = (currentMetadata.toolCalls || []) as Record<string, unknown>[]
          const lastCall = toolCalls[toolCalls.length - 1]
          if (lastCall && lastCall.name === event.name) {
            lastCall.status = 'complete'
          }
          updateOptimisticMessageMetadata(assistantMsgId, { toolCalls })
        }
      })
      .onComplete((): void => {
        setGenerating(false)
        currentStream.current = null
        generatingMessageId.current = null
      })
      .onError((err: unknown): void => {
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

  const registeredTools = ToolRegistry.getAll()
  const activeTool = ToolRegistry.get(activeToolId)

  // Left Panel removed as it is now integrated into Sidebar.tsx

  const mainPanel = (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-forge-border pb-0 px-4 pt-2">
        <div className="flex gap-6 h-full">
          {registeredTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setForcedToolId(tool.id)}
              className={cn(
                'text-sm font-medium pb-3 transition-colors focus:outline-none relative capitalize',
                activeToolId === tool.id ? 'text-white' : 'text-forge-text-muted hover:text-white'
              )}
            >
              {tool.displayName.toLowerCase()}
              {activeToolId === tool.id && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-forge-amber" />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs text-forge-text-muted mb-2 cursor-pointer hover:text-white transition-colors">
          <span>{activeTool ? activeTool.displayName : 'No tool selected'}</span>
          <ChevronDown size={14} />
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative">
        {activeDocument ? (
          <WorkspaceHost
            ref={workspaceHostRef}
            activeToolId={activeToolId}
            context={{
              initiativeId: activeInitiative.id,
              conversationId: activeConversationId,
              activeDocument
            }}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-forge-text-muted opacity-50 gap-4">
            <FileText size={64} className="opacity-50" />
            <div className="text-center">
              <p className="text-sm text-forge-text font-medium mb-1">
                Select a document to begin.
              </p>
              <p className="text-xs">Use the file explorer or flow view to open a document.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const rightPanel = (
    <div className="h-full flex flex-col bg-forge-panel">
      <div className="flex items-center justify-between border-b border-forge-border pb-3 px-4 pt-4 shrink-0">
        <span className="text-sm font-semibold text-white">AI Chat</span>
        <button
          onClick={() => setIsChatOpen(false)}
          className="text-forge-text-muted hover:text-white transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {/* Messages Thread */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 text-xs text-forge-text-muted font-mono mb-4 pr-1">
          {messages.length === 0 ? (
            <div className="opacity-50 text-xs italic">
              Start a conversation with the AI assistant...
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col',
                  msg.role === 'user' ? 'items-end' : 'items-start',
                  msg.role === 'tool' ? 'hidden' : ''
                )}
              >
                <div className="text-[9px] opacity-40 uppercase tracking-widest mb-1">
                  {msg.role}
                </div>

                {!!msg.metadata?.toolCalls &&
                  Array.isArray(msg.metadata.toolCalls) &&
                  msg.metadata.toolCalls.length > 0 && (
                    <div className="flex flex-col gap-1 mb-2">
                      {(msg.metadata.toolCalls as Record<string, unknown>[]).map(
                        (tc: Record<string, unknown>, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 text-[10px] font-mono text-forge-amber/70 bg-forge-amber/5 px-2 py-0.5 rounded border border-forge-amber/20"
                          >
                            <span className={tc.status === 'running' ? 'animate-pulse' : ''}>
                              {tc.status === 'running' ? '⟳' : '✓'}
                            </span>
                            <span>{String(tc.name)}</span>
                          </div>
                        )
                      )}
                    </div>
                  )}

                {msg.content && (
                  <div
                    className={cn(
                      'px-3 py-2 rounded-lg max-w-[90%] text-xs whitespace-pre-wrap leading-relaxed shadow-sm',
                      msg.role === 'user'
                        ? 'bg-forge-amber/15 border border-forge-amber/30 text-forge-amber'
                        : 'bg-forge-surface border border-forge-border text-forge-text'
                    )}
                  >
                    {msg.content}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Chat Input */}
        <div className="relative w-full">
          <input
            type="text"
            className="w-full bg-forge-surface/50 border border-forge-border rounded-full px-4 py-2 pr-10 text-xs focus:outline-none focus:border-forge-amber transition-colors shadow-sm text-forge-text"
            placeholder="Ask AI anything..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-forge-text-muted hover:text-forge-amber transition-colors disabled:opacity-50"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )

  const bottomPanel = (
    <div className="h-full flex flex-col bg-forge-panel font-mono text-xs text-forge-text-muted">
      <div className="flex items-center justify-between border-b border-forge-border pb-2 px-4 pt-3 shrink-0">
        <div className="flex gap-4">
          <span className="font-semibold text-white">Terminal Console</span>
        </div>
        <div className="flex items-center gap-4">
          {isGenerating && (
            <button
              onClick={handleCancel}
              className="text-[10px] text-forge-error hover:text-red-400 focus:outline-none"
            >
              [Stop Generating]
            </button>
          )}
          <button className="flex items-center gap-1 hover:text-white transition-colors text-[10px]">
            <Trash2 size={12} /> Clear
          </button>
          <button className="hover:text-white transition-colors">
            <Maximize2 size={12} />
          </button>
          <button
            onClick={() => setIsTerminalOpen(false)}
            className="hover:text-white transition-colors"
          >
            <ChevronUp size={14} className="rotate-180" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2">
        {/* Engineering Agent Workflow Status */}
        {activeWorkflow && (
          <div className="bg-forge-amber/5 border border-forge-amber/20 rounded-lg p-3 text-xs mb-3">
            <div className="font-bold text-forge-amber uppercase tracking-wider mb-2 border-b border-forge-amber/15 pb-1">
              Engineering Agent Workflow
            </div>
            {!activeWorkflow.plan ? (
              <div className="animate-pulse flex items-center gap-2">
                <div className="w-2 h-2 bg-forge-amber rounded-full animate-ping"></div>
                Building context and planning...
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div>Goal: {String(activeWorkflow.plan.goal)}</div>
                <div className="flex flex-col gap-1.5 mt-2">
                  {Array.isArray(activeWorkflow.plan.steps) &&
                    activeWorkflow.plan.steps.map((step: Record<string, unknown>, idx: number) => {
                      const stepEvents = activeWorkflow.events.filter(
                        (evt) =>
                          evt.data && (evt.data as Record<string, unknown>).stepId === step.id
                      )
                      const lastEvent = stepEvents[stepEvents.length - 1]
                      const isRunning = lastEvent?.type === 'step_started'
                      const isCompleted = lastEvent?.type === 'step_completed'
                      const isFailed = lastEvent?.type === 'step_failed'

                      return (
                        <div
                          key={idx}
                          className={cn(
                            'flex items-center gap-2 p-1 rounded',
                            isRunning
                              ? 'bg-forge-amber/10 text-forge-amber'
                              : isCompleted
                                ? 'text-green-500/70'
                                : isFailed
                                  ? 'text-forge-error'
                                  : 'opacity-50'
                          )}
                        >
                          <span>{isRunning ? '⟳' : isCompleted ? '✓' : isFailed ? '✗' : '·'}</span>
                          <span>{String(step.capabilityName)}</span>
                          <span className="opacity-50 ml-2">- {String(step.description)}</span>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-forge-text-muted mt-auto">
          <span>$ _</span>
          <span className="w-2 h-4 bg-forge-text-muted animate-pulse"></span>
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
          <div className="flex gap-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-2 border border-forge-amber/30 hover:border-forge-amber shadow-[0_0_10px_rgba(255,176,0,0.1)]"
            >
              <Sparkles size={14} className="text-forge-amber" /> Ask AI (⌘K)
            </Button>
            <Button
              size="sm"
              className="flex items-center gap-2 bg-white text-black hover:bg-gray-200"
            >
              <Download size={14} /> Export
            </Button>
          </div>
        }
        className="shrink-0 px-1"
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSubmit={handleCommandPaletteSubmit}
      />

      <div className="flex-1 min-h-0 mt-4 pb-1 flex flex-col gap-2">
        <div className="flex-1 min-h-0">
          <WorkspaceLayout
            mainPanel={mainPanel}
            bottomPanel={isTerminalOpen ? bottomPanel : undefined}
            rightPanel={isChatOpen ? rightPanel : undefined}
          />
        </div>

        {/* Status Bottom Bar to re-open collapsed panels */}
        <div className="h-6 flex items-center justify-between px-4 border-t border-forge-border/20 bg-forge-panel/50 rounded text-[10px] text-forge-text-muted select-none mt-1">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsTerminalOpen((prev) => !prev)}
              className={cn(
                'hover:text-white transition-colors flex items-center gap-1.5 font-mono',
                isTerminalOpen && 'text-forge-amber'
              )}
            >
              <Terminal size={10} /> {isTerminalOpen ? 'Hide Terminal' : 'Show Terminal'}
            </button>
            <button
              onClick={() => setIsChatOpen((prev) => !prev)}
              className={cn(
                'hover:text-white transition-colors flex items-center gap-1.5 font-mono',
                isChatOpen && 'text-forge-amber'
              )}
            >
              <Sparkles size={10} /> {isChatOpen ? 'Hide AI Chat' : 'Show AI Chat (⌘K)'}
            </button>
          </div>
          <div className="font-mono opacity-50">FORGE ENVIRONMENT READY</div>
        </div>
      </div>
    </div>
  )
}
