<!-- Source: system-design skill | Phase 6 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Data Flow & Request Lifecycle

Four critical workflows traced end-to-end through Forge's runtime architecture.

See [architecture-diagram.md](architecture-diagram.md) for the component runtime diagram.  
See [component-breakdown.md](component-breakdown.md) for storage schema and state management.

---

## Workflow 1: Artifact Approval with Gate Check

The core Forge workflow. Example: approving the Requirements artifact.

```mermaid
sequenceDiagram
    actor User
    participant UI as UI Shell (Renderer)
    participant IPC as contextBridge + IPC Router
    participant AE as ArtifactEngine
    participant WE as WorkflowEngine
    participant GS as GraphService
    participant DB as SQLite

    User->>UI: Click "Approve Requirements"
    UI->>IPC: window.forge.artifacts.approve(artifactId)
    IPC->>AE: ArtifactEngine.approve(artifactId)
    AE->>DB: SELECT artifact WHERE id = artifactId
    DB-->>AE: Artifact { status: Draft }
    AE->>WE: WorkflowEngine.checkGates(artifact)
    WE->>DB: SELECT upstream artifacts for initiative
    DB-->>WE: [Vision: Approved ✓]
    WE-->>AE: GateResult { passed: true }

    AE->>DB: UPDATE artifact SET status = 'Approved', version = version + 1
    AE->>WE: WorkflowEngine.handleApproval(artifact)
    WE->>GS: GraphService.getDownstreamApproved(artifactId)
    GS->>DB: Recursive CTE on artifact_relationships
    DB-->>GS: [] (no downstream approved artifacts yet)
    WE->>DB: UPDATE initiative SET status = 'InProgress'

    AE-->>IPC: { ok: true, data: { artifact, affectedArtifacts: [] } }
    IPC-->>UI: success response
    UI->>UI: Zustand artifactStore.update(artifact)
    UI-->>User: Requirements shown as ✅ Approved
```

### Gate Warning Variant (upstream not yet approved)

```mermaid
sequenceDiagram
    actor User
    participant UI as UI Shell
    participant IPC as IPC Router
    participant AE as ArtifactEngine
    participant WE as WorkflowEngine

    User->>UI: Click "Approve Architecture" (Requirements still Draft)
    UI->>IPC: window.forge.artifacts.approve(architectureId)
    IPC->>AE: ArtifactEngine.approve(architectureId)
    AE->>WE: WorkflowEngine.checkGates(artifact)
    WE-->>AE: GateResult { passed: false, blockedBy: [requirementsArtifact] }
    AE-->>IPC: { ok: false, error: { code: 'GATE_WARNING', blockedBy: [...] } }
    IPC-->>UI: GATE_WARNING response
    UI-->>User: Confirmation dialog: "Requirements not yet approved. Proceed anyway?"

    alt User confirms override
        User->>UI: Click "Proceed anyway"
        UI->>IPC: window.forge.artifacts.approveOverride(architectureId, reason)
        IPC->>AE: ArtifactEngine.approveOverride(id, "user-confirmed-gate-override")
        Note over AE: Logs WARN — gate override recorded
        AE->>DB: UPDATE artifact SET status = 'Approved'
        AE-->>IPC: { ok: true, data: { artifact } }
        IPC-->>UI: success
    else User cancels
        Note over UI: No state change — artifact remains Draft
    end
```

### NeedsReview Cascade (editing an approved artifact)

```mermaid
sequenceDiagram
    participant AE as ArtifactEngine
    participant WE as WorkflowEngine
    participant GS as GraphService
    participant DB as SQLite

    Note over AE: User edits a previously Approved artifact
    AE->>DB: UPDATE artifact SET content = newContent, status = 'Draft'
    AE->>WE: WorkflowEngine.handleApprovalRevoked(artifactId)
    WE->>GS: GraphService.getDownstreamApproved(artifactId)
    GS->>DB: Recursive CTE — find all downstream Approved artifacts
    DB-->>GS: [systemDesign: Approved, task1: Done, ...]

    loop For each downstream approved artifact
        WE->>DB: UPDATE artifact SET status = 'NeedsReview'
    end

    WE-->>AE: { affectedArtifacts: [systemDesign, task1, ...] }
    AE-->>IPC: { ok: true, data: { artifact, needsReview: [systemDesign, task1] } }
    Note over IPC: UI shows notification: "2 downstream artifacts need review"
```

---

## Workflow 2: AI-Assisted Content Generation

```mermaid
sequenceDiagram
    actor User
    participant UI as UI Shell
    participant IPC as IPC Router
    participant AIO as AIOrchestrator
    participant AE as ArtifactEngine
    participant AA as LLMProviderAdapter
    participant DB as SQLite
    participant AIEXT as AI LLM Provider

    User->>UI: Click "Generate with AI" on Requirements artifact
    UI->>IPC: window.forge.ai.generate(artifactId)
    IPC->>AIO: AIOrchestrator.generate(artifactId)

    AIO->>AA: AIPort.isConfigured()
    AA-->>AIO: true

    AIO->>DB: SELECT initiative + vision + parent artifacts (context bundle)
    DB-->>AIO: context bundle

    AIO->>AIO: Build system prompt + user prompt from context
    AIO->>AA: AIPort.generate(prompt, context)
    AA->>AIEXT: HTTPS POST to LLM API
    Note over AIEXT: Async — main process event loop free during wait

    AIEXT-->>AA: Completion response (< 30s p95)
    AA-->>AIO: generated draft text

    AIO->>DB: INSERT ai_sessions { prompt, response, status: 'pending-review' }
    DB-->>AIO: { sessionId }

    AIO-->>IPC: { ok: true, data: { draft, sessionId } }
    IPC-->>UI: draft + sessionId
    UI-->>User: Side-by-side draft preview panel\n(AI-generated badge visible — not yet applied)

    alt User accepts (with optional edits)
        User->>UI: Edit draft, click "Apply to artifact"
        UI->>IPC: window.forge.ai.applyDraft(artifactId, finalContent, sessionId)
        IPC->>AE: ArtifactEngine.update(artifactId, finalContent)
        AE->>DB: UPDATE artifacts SET content = finalContent
        IPC->>AIO: AIOrchestrator.recordAccepted(sessionId, finalContent)
        AIO->>DB: UPDATE ai_sessions SET accepted_content = finalContent, status = 'accepted'
        AIO->>DB: INSERT artifact_relationships (sessionId → artifactId, type: 'Generated')
        AIO-->>IPC: { ok: true }
        UI-->>User: Artifact updated with applied content
    else User discards
        User->>UI: Click "Discard draft"
        UI->>IPC: window.forge.ai.discardDraft(sessionId)
        IPC->>AIO: AIOrchestrator.discardDraft(sessionId)
        AIO->>DB: UPDATE ai_sessions SET status = 'discarded'
        Note over UI: Artifact unchanged
    end
```

### AI Provider Unavailable Path

```
AIPort.isConfigured() → false
  → Return { ok: false, error: { code: 'AI_NOT_CONFIGURED' } }
  → UI shows: "Configure an AI provider in Settings to use this feature"
  → Deep-link button to Settings > AI Configuration
  → Artifact editor remains fully usable without AI
```

---

## Workflow 3: Task Generation from Requirements

```mermaid
sequenceDiagram
    actor User
    participant UI as UI Shell
    participant IPC as IPC Router
    participant AE as ArtifactEngine
    participant WE as WorkflowEngine
    participant GS as GraphService
    participant DB as SQLite

    User->>UI: Click "Generate Tasks from Requirements"
    UI->>IPC: window.forge.tasks.generateFromRequirements(initiativeId)
    IPC->>AE: ArtifactEngine.getApprovedRequirements(initiativeId)
    AE->>DB: SELECT artifacts WHERE type='Requirements' AND status='Approved'
    DB-->>AE: requirement items (parsed from artifact content)
    AE-->>IPC: approvedRequirements[]

    loop For each requirement item
        IPC->>WE: WorkflowEngine.validateTaskCreation(requirementId)
        WE-->>IPC: valid

        IPC->>AE: ArtifactEngine.createTask({ requirementId, title, description })
        AE->>DB: INSERT tasks { requirementId, title, status: 'Todo', ... }
        DB-->>AE: { taskId }

        AE->>GS: GraphService.addRelationship(taskId, requirementId, 'DerivedFrom')
        GS->>DB: INSERT artifact_relationships — check no duplicates, no cycles
        DB-->>GS: ok
    end

    AE-->>IPC: { ok: true, data: { tasks: [task1, task2, ...] } }
    IPC-->>UI: tasks list
    UI-->>User: Tasks rendered with ← Requirement links visible
```

---

## Workflow 4: Full-Text Search

```mermaid
sequenceDiagram
    actor User
    participant UI as UI Shell
    participant IPC as IPC Router
    participant SI as SearchIndex
    participant DB as SQLite

    User->>UI: Type search term (debounced 300ms)
    UI->>IPC: window.forge.search.query("architecture decision")
    IPC->>SI: SearchIndex.query("architecture decision")

    SI->>DB: SELECT artifact_id, initiative_id, type, title,\n  snippet(artifacts_fts, -1, '**', '**', '...', 64) AS snippet,\n  rank\nFROM artifacts_fts\nWHERE artifacts_fts MATCH 'architecture decision'\nORDER BY rank LIMIT 20

    DB-->>SI: [{artifactId, initiativeId, type, title, snippet, rank}]
    SI-->>IPC: rankedResults (< 200ms)
    IPC-->>UI: results
    UI-->>User: Results list with bold-highlighted matched terms

    User->>UI: Click a result
    UI->>IPC: window.forge.navigation.openArtifact(initiativeId, artifactId)
    IPC->>DB: SELECT initiative + artifact (full content)
    DB-->>IPC: { initiative, artifact }
    IPC-->>UI: full data
    UI-->>User: Navigate to Initiative view, artifact open,\nterm highlighted in editor
```

### Auto-Save Flow (background — not user-initiated)

```
User types in artifact editor
  → onChange → marks isDirty = true in uiStore
  → 500ms debounce resets on each keystroke
  → After 500ms silence:
      UI → IPC: window.forge.artifacts.update(artifactId, content)
      Main: ArtifactEngine.update(id, content)
        → SQLite: UPDATE artifacts SET content = ?, updated_at = ?
        → FTS5 trigger fires: UPDATE artifacts_fts SET content = ?
      IPC → UI: { ok: true, updatedAt }
      UI: isDirty = false, show "Saved ✓" indicator
```
