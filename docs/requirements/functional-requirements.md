<!-- Source: requirements-engineering skill | Phase 3 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Functional Requirements

All functional requirements for Forge v1, organized by capability area. Each requirement has a user story and Given/When/Then acceptance criteria.

See [moscow-priorities.md](moscow-priorities.md) for prioritization. See [../architecture/domain-model.md](../architecture/domain-model.md) for the domain model these requirements drive.

---

## FR-1: Initiative Management

### US-1.1 — Create an Initiative
> As a developer, I want to create a new Initiative by providing a name and description, so that I have a structured workspace for a project.

**Acceptance Criteria:**
- Given I am on the Forge home screen, When I trigger "New Initiative" and provide a name (required) and description (optional), Then a new Initiative is created with a unique ID, creation timestamp, and status `Discovery`.
- Given I create an Initiative, When it is created, Then artifact slots are pre-scaffolded and visible but empty: Vision, Requirements, Architecture, ADRs, System Design, Tasks, AI Sessions.
- Given I provide a name that already exists, When I attempt to create, Then I receive a warning and am asked to confirm or rename.

**Edge Cases:** Blank name → inline validation error. Name > 200 characters → truncate and notify.

---

### US-1.2 — View All Initiatives
> As a developer, I want to see all my Initiatives with their current status, so that I can navigate between projects.

**Acceptance Criteria:**
- Given I open Forge, When the home screen loads, Then I see all Initiatives with: name, description excerpt, status, last-modified date, and artifact completion summary.
- Given I have no Initiatives, When the home screen loads, Then I see an empty state with a clear call-to-action.

---

### US-1.3 — Archive an Initiative
> As a developer, I want to archive an Initiative, so that my active list stays focused without losing historical work.

**Acceptance Criteria:**
- Given I have an active Initiative, When I archive it, Then it moves to "Archived" state and disappears from the active list.
- Given an Initiative is archived, When I filter for archived, Then I can view and restore it.
- Given I permanently delete an Initiative, When I confirm, Then all data is permanently removed. Requires two-step confirmation.

---

### US-1.4 — Initiative Status Tracking
> As a developer, I want to see Initiative status derived from artifact states, so that I understand progress at a glance.

**Acceptance Criteria:**
- Given an Initiative exists, When I view it, Then status is derived from artifact states — not a manually set field.
- Status transitions: `Discovery` → `In Progress` → `Released` (with ongoing iteration possible from any state).

---

## FR-2: Vision Artifact

### US-2.1 — Author a Vision
> As a developer, I want to write or generate a Vision, so that the Initiative's purpose and success criteria are clearly defined.

**Acceptance Criteria:**
- Given I open the Vision slot, When I write content, Then it is auto-saved and timestamped.
- Given I have not written a Vision, When I request AI assistance, Then Forge generates a structured draft (Problem Statement, Target Users, Success Criteria, Non-Goals) for review.
- Given I mark Vision as Approved, Then Requirements creation is unblocked.

**Edge Cases:** Vision cannot be approved if Problem Statement or Success Criteria are empty. Editing an approved Vision returns it to Draft and notifies the user.

---

## FR-3: Requirements Artifact

### US-3.1 — Capture Requirements
> As a developer, I want to write requirements with acceptance criteria, so that what needs to be built is unambiguous and testable.

**Acceptance Criteria:**
- Given I open Requirements, When I create a requirement, Then I must provide: title, user story (or description), and at least one acceptance criterion.
- Given I view requirements, Then each displays MoSCoW priority, status (Draft/Approved), and linked artifacts.
- Given I request AI assistance, Then AI generates a draft set of requirements as draft-only — never auto-approved.

---

### US-3.2 — MoSCoW Prioritization
> As a developer, I want to assign MoSCoW priority to each requirement, so that I can make conscious scope trade-offs.

**Acceptance Criteria:**
- Given I edit a requirement, When I assign priority, Then options are: Must Have, Should Have, Could Have, Won't Have.
- Given all requirements are Must Have, Then Forge surfaces a warning: "All requirements are Must Have — consider re-prioritizing."

---

### US-3.3 — Approve Requirements
> As a developer, I want to formally approve Requirements, so that Architecture and Task creation are unblocked.

**Acceptance Criteria:**
- Given I have at least one approved requirement, When I approve Requirements, Then status → Approved and Architecture/Task creation are unblocked.
- Given Requirements are Draft, When I attempt to create Architecture, Then Forge warns and asks to confirm.

**Edge Cases:** Editing an approved Requirement returns it to Draft and propagates review flag to linked Tasks and ADRs.

---

## FR-4: Architecture Artifact

### US-4.1 — Document Architecture
> As a developer, I want to document system boundaries, components, and interactions, so that structural intent is preserved.

**Acceptance Criteria:**
- Given I open Architecture, When I add content, Then I can add: system context description, component list (name + responsibility), and optional Mermaid diagram.
- Given I request AI review, Then AI analyzes for gaps and inconsistencies with Requirements.
- Given I have approved Requirements, When I view Architecture, Then I can see which requirements each component addresses.

---

### US-4.2 — Architecture Approval Gate
> As a developer, I want to formally approve Architecture before System Design begins, so that I don't design runtime behavior on an unstable structural foundation.

**Acceptance Criteria:**
- Given Architecture is Draft, When I attempt to start System Design, Then Forge warns and requires confirmation.
- Given I approve Architecture, When I make subsequent changes, Then it returns to Draft and flags System Design and ADRs for review.

---

## FR-5: Architecture Decision Records (ADRs)

### US-5.1 — Record an ADR
> As a developer, I want to record ADRs for significant engineering choices, so that future me understands why the system is built the way it is.

**Acceptance Criteria:**
- Given I create an ADR, Then I must provide: auto-assigned sequential ID, title, status, context, decision, consequences, and alternatives considered.
- Given I accept an ADR (status → Accepted), Then content is immutable — status changes are still allowed.
- Given an ADR is superseded, When I create the replacement, Then the original ADR is auto-linked with `superseded-by` reference.

**Edge Cases:** ADR numbers never reused. ADRs referenced by approved artifacts cannot be deleted — only Deprecated.

---

### US-5.2 — Link ADRs to Artifacts
> As a developer, I want to link ADRs to the artifacts they affect, so that every design choice is traceable.

**Acceptance Criteria:**
- Given an ADR exists, When I view a Requirements, Architecture, or System Design artifact, Then I see linked ADRs with title, status, and decision summary.

---

## FR-6: System Design Artifact

### US-6.1 — Document System Design
> As a developer, I want to document runtime behavior — request flows, data movement, failure modes — so that I have a reference for implementation decisions.

**Acceptance Criteria:**
- Given I open System Design, When I add content, Then I can add structured sections: Components, Data Flow, API Design, State Management, Error Handling, Scalability, Security, Observability.
- Given approved Architecture, When I work on System Design, Then Forge surfaces Architecture components as a reference.
- Given I request AI assistance, Then AI generates a System Design draft covering all structured sections, marked as draft.

---

## FR-7: Tasks

### US-7.1 — Create Tasks from Requirements
> As a developer, I want to generate Tasks from approved Requirements, so that implementation work is directly traceable to specifications.

**Acceptance Criteria:**
- Given at least one approved Requirement, When I request task generation, Then Forge creates Tasks linked to source Requirements with title and description.
- Given a Task is created, When I view it, Then I see: title, description, status (Todo/In Progress/Done/Blocked), linked Requirement, linked ADRs, and priority.
- Given I create a Task manually, When I save it, Then I must link it to at least one Requirement or System Design section — no orphan tasks.

**Edge Cases:** A Task cannot be marked Done with no checklist item present.

---

### US-7.2 — Track Task Progress
> As a developer, I want to see Task progress at a glance, so that I understand implementation status without leaving Forge.

**Acceptance Criteria:**
- Given I have Tasks, When I view the Initiative overview, Then I see: total, Todo, In Progress, Done, Blocked counts.
- Given I filter Tasks by linked Requirement, Then only matching Tasks are shown.

---

## FR-8: AI Sessions

### US-8.1 — Capture an AI Session
> As a developer, I want AI interactions within Forge preserved as named sessions, so that the reasoning behind AI-generated content is never lost.

**Acceptance Criteria:**
- Given I engage AI assistance within any artifact, When the session ends, Then the exchange is saved as a named AI Session linked to the artifact.
- Given an AI Session exists, When I view it, Then I see: session name, date, linked artifact, full prompt and response, and what content was accepted.
- AI Sessions are read-only after creation. Cannot be deleted if linked artifact is Approved.

---

## FR-9: Artifact Graph & Traceability

### US-9.1 — View the Engineering Graph
> As a developer, I want to see relationships between all artifacts in my Initiative, so that I can trace from Task back to Requirement to ADR.

**Acceptance Criteria:**
- Given multiple linked artifacts, When I open the graph view, Then I see artifacts as nodes and relationships as typed directed edges.
- Given I click a node, Then I see: artifact title, status, and all directly connected artifacts.

**Supported relationship types (v1):**
- Requirement → Task (DerivedFrom)
- Requirement → ADR (InformedBy)
- Architecture → ADR (DecidedBy)
- System Design → Architecture (Implements)
- Task → Requirement (Implements)
- AI Session → Artifact (Generated)

---

## FR-10: Approval Gates & Workflow Engine

### US-10.1 — Enforce Artifact Dependencies
> As a developer, I want Forge to warn me when I work on an artifact whose dependencies are not yet approved, so that I build on a stable foundation.

**Acceptance Criteria:**
- Given I attempt to approve Architecture when Requirements are Draft, Then Forge shows: "Requirements are not yet approved. Continue?" with confirm/cancel.
- Given I attempt to approve System Design when Architecture is not approved, Then same dependency warning.
- Given an upstream artifact is edited after approval, When the edit is saved, Then all downstream approved artifacts are flagged `NeedsReview` and user is notified.

**Dependency chain:**
```
Vision → Requirements → Architecture → System Design
                     ↘ ADRs (any time, linked to any artifact)
Requirements + Architecture → Tasks
```

**Edge Cases:** Gates are warnings, not hard blocks. Users can override with explicit confirmation.

---

## FR-11: AI Integration

### US-11.1 — AI Content Generation
> As a developer, I want AI to draft artifact content from Initiative context, so that I start from a structured draft rather than a blank page.

**Acceptance Criteria:**
- Given any artifact in Draft state, When I request AI generation, Then AI produces a draft using context from Initiative name, description, Vision, and parent artifacts.
- Given AI generates a draft, Then it is clearly marked AI-generated and requires explicit review before being applied.
- Given AI provider is unavailable, Then Forge shows a clear error and the artifact remains fully editable.

---

### US-11.2 — AI Review & Critique
> As a developer, I want AI to review my artifact and surface gaps, so that I catch problems before they become expensive downstream.

**Acceptance Criteria:**
- Given content in any artifact, When I request AI review, Then AI responds with: specific gaps, inconsistencies with linked artifacts, and questions — not a full rewrite.
- Given AI identifies a gap, Then each gap is a discrete actionable item I can accept or dismiss (with optional note).

---

### US-11.3 — AI Provider Configuration
> As a developer, I want to configure which AI provider Forge uses, so that I control cost, privacy, and model choice.

**Acceptance Criteria:**
- Given I open Settings, When I configure AI, Then I can provide: provider selection, API key, and model selection.
- Given no API key is configured, When I request AI assistance, Then Forge prompts me to configure — artifact remains fully usable without AI.
- Given invalid API key, When AI is invoked, Then Forge shows: "AI provider error: [reason]. Check your API key in Settings."

---

## FR-12: Export & Push Integrations

### US-12.1 — Export Initiative as Markdown
> As a developer, I want to export any artifact or full Initiative as structured Markdown, so that I can share it or import it into other tools.

**Acceptance Criteria:**
- Given content in any artifact, When I export it, Then Forge produces well-structured Markdown with proper headings, sections, and metadata.
- Given I export a full Initiative, Then I receive a folder of Markdown files organized by artifact type with a README index.

---

### US-12.2 — Push Tasks to GitHub Issues
> As a developer, I want to push Forge Tasks to GitHub Issues, so that I manage implementation in GitHub while planning stays in Forge.

**Acceptance Criteria:**
- Given a configured GitHub repository, When I push a Task, Then Forge creates a GitHub Issue with title, description, linked Requirement reference, and Initiative name as label.
- Given a Task is pushed, When I view it in Forge, Then I see the GitHub Issue number and a direct link. Push is one-way: Forge → GitHub only.
- Given GitHub API is unavailable, Then Forge shows a clear error and the Task remains unchanged in Forge.

---

## FR-13: Local-First Storage

### US-13.1 — All Data Stored Locally by Default
> As a developer, I want all Initiative data on my local machine by default, so that I have full ownership and can work offline.

**Acceptance Criteria:**
- Given I create any artifact, When I save it, Then data is persisted locally without any network connection.
- Given I am offline, When I open Forge, Then all Initiatives and artifacts are fully accessible and editable.
- Given no cloud sync is configured, Then no data is transmitted to any remote server — not even telemetry (unless explicitly opted in).

---

### US-13.2 — Data Portability
> As a developer, I want to back up and restore my Forge data, so that I am never locked in and can migrate machines without losing work.

**Acceptance Criteria:**
- Given I want to back up, When I export a backup, Then Forge produces a portable file containing all Initiatives, artifacts, ADRs, and AI Sessions.
- Given I have a backup file, When I import it into a fresh Forge installation, Then all data is restored exactly as exported.

---

## FR-14: Search & Navigation

### US-14.1 — Search Across Initiatives and Artifacts
> As a developer, I want to search across all Initiatives and artifacts, so that I can quickly find decisions, requirements, or tasks without manual navigation.

**Acceptance Criteria:**
- Given I use search, When I type a term, Then Forge returns results across: Initiative names, artifact titles, artifact content, ADR titles, and Task titles.
- Given I click a result, Then I navigate directly to the containing Initiative and artifact, with the matched term highlighted.
- Given no results, Then Forge shows a helpful message — not a blank screen.
