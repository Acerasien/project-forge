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

export const Workspace: React.FC = () => {
  const { initiatives, activeInitiativeId } = useInitiativeStore()
  const activeInitiative = initiatives.find((i) => i.id === activeInitiativeId)

  const { documents, activeDocumentId } = useDocumentStore()
  const activeDocument = documents.find((d) => d.id === activeDocumentId) || null

  // Determine tool automatically based on active document, fallback to first tool if forcing
  const autoTool = activeDocument ? ToolRegistry.getToolForDocument(activeDocument) : null
  const [forcedToolId, setForcedToolId] = useState<string | null>(null)
  const activeToolId = forcedToolId || autoTool?.id || ''
  const [intelligence, setIntelligence] = useState<Record<string, unknown>>({})

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

  const { artifacts, updateStatus } = useArtifactStore()

  useEffect(() => {
    const fetchIntelligence = async (): Promise<void> => {
      const newIntelligence: Record<string, unknown> = {}
      for (const artifact of useArtifactStore.getState().artifacts) {
        try {
          const res = await window.forge.validation.getLatestIntelligence(artifact.id)
          if (res.success && res.data) {
            newIntelligence[artifact.id] = res.data
          }
        } catch {
          // ignore
        }
      }
      setIntelligence(newIntelligence)
    }
    fetchIntelligence()
  }, [artifacts])

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const workspaceHostRef = useRef<ToolHandle>(null)

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

  const handleArtifactApprove = async (e: React.MouseEvent, id: string): Promise<void> => {
    e.stopPropagation()
    const res = await updateStatus(id, 'Approved')
    if (!res.success && res.isGateWarning) {
      if (confirm(`Warning: ${res.error}\n\nDo you want to override and approve anyway?`)) {
        await updateStatus(id, 'Approved', true)
      }
    } else if (!res.success) {
      alert(`Error: ${res.error}`)
    }
  }

  const handleArtifactRequestReview = async (e: React.MouseEvent, id: string): Promise<void> => {
    e.stopPropagation()
    await updateStatus(id, 'NeedsReview')
  }

  const handleAIReview = async (e: React.MouseEvent, id: string): Promise<void> => {
    e.stopPropagation()
    try {
      const res = await window.forge.validation.reviewArtifact(id)
      if (res.success && res.data) {
        setIntelligence((prev) => ({ ...prev, [id]: res.data }))
      } else if (!res.success) {
        alert(`AI Review failed: ${res.error.message}`)
      }
    } catch (err: unknown) {
      alert(`AI Review error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const leftPanel = (
    <div className="h-full flex flex-col gap-4">
      {/* Artifacts Section */}
      <div className="flex flex-col">
        <div className="text-xs font-mono text-forge-text-muted mb-2 border-b border-forge-border pb-2 px-4 mt-4">
          ARTIFACTS (WORKFLOW)
        </div>
        <div className="px-4 flex flex-col gap-1">
          {artifacts.length === 0 && (
            <div className="text-forge-text-muted opacity-50 text-sm italic">
              No artifacts found.
            </div>
          )}
          {artifacts.map((artifact) => (
            <div
              key={artifact.id}
              className="group flex flex-col text-sm font-mono truncate px-2 py-1 rounded transition-colors text-forge-text-muted hover:bg-forge-surface/50 hover:text-forge-text"
            >
              <div className="flex justify-between items-center w-full">
                <span>{artifact.title}</span>
                <span
                  className={cn(
                    'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded',
                    artifact.status === 'Approved'
                      ? 'bg-green-500/10 text-green-500'
                      : artifact.status === 'NeedsReview'
                        ? 'bg-forge-amber/10 text-forge-amber'
                        : 'bg-forge-surface text-forge-text-muted'
                  )}
                >
                  {artifact.status}
                </span>
              </div>

              {/* Intelligence Display */}
              {Boolean(intelligence[artifact.id]) && (
                <div className="flex gap-2 text-[10px] mt-1 items-center">
                  <span className="text-forge-text-muted">
                    Comp:{' '}
                    {String(
                      (intelligence[artifact.id] as Record<string, unknown>).completenessScore ??
                        '-'
                    )}
                    %
                  </span>
                  <span className="text-forge-text-muted">
                    Conf:{' '}
                    {String(
                      (intelligence[artifact.id] as Record<string, unknown>).aiConfidence ?? '-'
                    )}
                    %
                  </span>
                  {Boolean((intelligence[artifact.id] as Record<string, unknown>).isStale) && (
                    <span className="text-forge-amber animate-pulse">Stale</span>
                  )}
                </div>
              )}

              <div className="hidden group-hover:flex gap-2 mt-1 flex-wrap">
                {artifact.status !== 'Approved' && (
                  <button
                    onClick={(e) => handleArtifactApprove(e, artifact.id)}
                    className="text-[10px] text-green-500 hover:underline"
                  >
                    Approve
                  </button>
                )}
                {artifact.status === 'Approved' && (
                  <button
                    onClick={(e) => handleArtifactRequestReview(e, artifact.id)}
                    className="text-[10px] text-forge-amber hover:underline"
                  >
                    Request Review
                  </button>
                )}
                <button
                  onClick={(e) => handleAIReview(e, artifact.id)}
                  className="text-[10px] text-purple-400 hover:underline"
                >
                  AI Review
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Documents Section */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="text-xs font-mono text-forge-text-muted mb-2 border-b border-forge-border pb-2 px-4">
          DOCUMENTS
        </div>
        <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-1">
          {documents.length === 0 && (
            <div className="text-forge-text-muted opacity-50 text-sm italic">
              No documents found.
            </div>
          )}
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => {
                setForcedToolId(null)
                documentManager.openDocument(doc.id)
              }}
              className={cn(
                'text-left text-sm font-mono truncate px-2 py-1 rounded transition-colors',
                activeDocumentId === doc.id
                  ? 'bg-forge-amber/20 text-forge-amber'
                  : 'text-forge-text-muted hover:bg-forge-surface/50 hover:text-forge-text'
              )}
            >
              {doc.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const mainPanel = (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-forge-border pb-2 px-4 mt-4">
        <div className="flex gap-4">
          {registeredTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setForcedToolId(tool.id)}
              className={cn(
                'text-xs font-mono transition-colors focus:outline-none',
                activeToolId === tool.id
                  ? 'text-forge-amber'
                  : 'text-forge-text-muted hover:text-forge-text'
              )}
            >
              {tool.displayName}
            </button>
          ))}
        </div>
        <div className="text-xs font-mono text-forge-text-muted opacity-50 uppercase tracking-widest">
          {activeTool ? `${activeTool.displayName}_SURFACE` : 'NO_TOOL_SELECTED'}
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
          <div className="h-full flex items-center justify-center text-forge-text-muted opacity-50 font-mono text-sm">
            Select a document to begin.
          </div>
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
          {activeWorkflow && (
            <div className="bg-forge-amber/5 border border-forge-amber/30 rounded p-3 text-xs mb-4">
              <div className="font-bold text-forge-amber uppercase tracking-widest mb-2 border-b border-forge-amber/20 pb-1">
                Engineering Agent Workflow
              </div>
              {!activeWorkflow.plan ? (
                <div className="animate-pulse">Building context and planning...</div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="text-forge-text-muted">
                    Goal: {String(activeWorkflow.plan.goal)}
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    {Array.isArray(activeWorkflow.plan.steps) &&
                      activeWorkflow.plan.steps.map(
                        (step: Record<string, unknown>, idx: number) => {
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
                              <span>
                                {isRunning ? '⟳' : isCompleted ? '✓' : isFailed ? '✗' : '·'}
                              </span>
                              <span>{String(step.capabilityName)}</span>
                              <span className="opacity-50 ml-2">- {String(step.description)}</span>
                            </div>
                          )
                        }
                      )}
                  </div>
                  {activeWorkflow.events.some((e) => e.type === 'completed') && (
                    <div className="mt-2 text-green-500 font-bold uppercase tracking-widest">
                      Workflow Completed
                    </div>
                  )}
                  {activeWorkflow.events.some(
                    (e) => e.type === 'error' || e.type === 'step_failed'
                  ) && (
                    <div className="mt-2 text-forge-error font-bold uppercase tracking-widest">
                      Workflow Failed
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {messages.length === 0 && !activeWorkflow ? (
            <div className="opacity-50">Standby for generation...</div>
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
                <div className="text-[10px] opacity-50 uppercase tracking-widest mb-1">
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
                            className="flex items-center gap-2 text-xs font-mono text-forge-amber/70 bg-forge-amber/5 px-2 py-1 rounded border border-forge-amber/20"
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
                      'px-3 py-2 rounded max-w-[80%] whitespace-pre-wrap',
                      msg.role === 'user'
                        ? 'bg-forge-amber/10 border border-forge-amber/30 text-forge-amber'
                        : 'bg-forge-surface border border-forge-border'
                    )}
                  >
                    {msg.content}
                  </div>
                )}
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
