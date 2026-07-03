<!-- Source: requirements-engineering skill | Phase 3 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# MoSCoW Prioritization

All v1 requirements categorized by priority. Must Have requirements are non-negotiable for launch. Won't Have items are explicitly deferred — not "never," just "not v1."

See [functional-requirements.md](functional-requirements.md) for full user stories and acceptance criteria.

---

## Must Have (v1 — Non-Negotiable for Launch)

These 19 requirements define the minimum viable Forge. Without them, the core value proposition does not exist.

| ID      | Requirement                                   | Capability Area        |
| ------- | --------------------------------------------- | ---------------------- |
| US-1.1  | Create an Initiative                          | Initiative Management  |
| US-1.2  | View all Initiatives                          | Initiative Management  |
| US-1.3  | Archive an Initiative                         | Initiative Management  |
| US-1.4  | Initiative status tracking                    | Initiative Management  |
| US-2.1  | Author a Vision                               | Vision Artifact        |
| US-3.1  | Capture Requirements                          | Requirements Artifact  |
| US-3.2  | MoSCoW prioritization of requirements         | Requirements Artifact  |
| US-3.3  | Approve Requirements                          | Requirements Artifact  |
| US-4.1  | Document Architecture                         | Architecture Artifact  |
| US-4.2  | Architecture approval gate                    | Architecture Artifact  |
| US-5.1  | Record an ADR                                 | ADR                    |
| US-6.1  | Document System Design                        | System Design Artifact |
| US-7.1  | Create Tasks from Requirements                | Tasks                  |
| US-7.2  | Track Task progress                           | Tasks                  |
| US-10.1 | Enforce artifact dependencies (with warnings) | Workflow Engine        |
| US-11.3 | AI provider configuration                     | AI Integration         |
| US-13.1 | All data stored locally by default            | Local-First Storage    |
| US-13.2 | Data portability (backup/restore)             | Local-First Storage    |
| US-14.1 | Search across Initiatives and artifacts       | Search & Navigation    |

---

## Should Have (v1 — Include if Capacity Allows)

These 6 requirements are important differentiators that make Forge significantly more valuable, but the core workflow functions without them.

| ID      | Requirement                   | Capability Area       |
| ------- | ----------------------------- | --------------------- |
| US-8.1  | Capture an AI Session         | AI Sessions           |
| US-9.1  | View the engineering graph    | Artifact Graph        |
| US-11.1 | AI content generation         | AI Integration        |
| US-11.2 | AI review & critique          | AI Integration        |
| US-12.1 | Export Initiative as Markdown | Export & Integrations |
| US-5.2  | Link ADRs to artifacts        | ADR                   |

---

## Could Have (v1-later or Early v2)

These 1 requirement is a natural extension but adds external dependency complexity that may not be warranted in v1.

| ID      | Requirement                 | Capability Area       |
| ------- | --------------------------- | --------------------- |
| US-12.2 | Push Tasks to GitHub Issues | Export & Integrations |

---

## Won't Have (Explicitly Deferred — Not in v1)

These capabilities are explicitly out of scope. Documenting them prevents scope creep during v1 development.

| Capability                       | Rationale                                                                  | When to Revisit                                    |
| -------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------- |
| Cloud sync                       | Architectural complexity unjustified in v1 — local first                   | v2 planning phase                                  |
| Multi-user / team collaboration  | Phase 2 of the product — data model must support it, UI does not expose it | v2 planning phase                                  |
| Git integration (pull/push code) | Execution layer — outside Forge's upstream boundary                        | Never (by design) — or v3 if user demand is strong |
| CI/CD, deployment, monitoring    | Execution layer — outside scope                                            | Never (by design)                                  |
| Built-in testing framework       | Execution layer — outside scope                                            | Never (by design)                                  |
| Mobile app                       | Defer until desktop/web experience is proven                               | v3 or later                                        |
| Real-time collaboration          | Requires cloud infrastructure and conflict resolution                      | v2+                                                |

---

## Priority Health Check

> **Rule:** Must Haves should represent ~60% of total effort. If everything is Must Have, nothing is prioritized.

| Priority    | Count          | % of Total User Stories   |
| ----------- | -------------- | ------------------------- |
| Must Have   | 19             | 63%                       |
| Should Have | 6              | 20%                       |
| Could Have  | 1              | 3%                        |
| Won't Have  | 7 capabilities | 23% (of capability areas) |

> ⚠️ Must Have count is at the upper boundary. If implementation reveals that all 19 are too much for v1, the following Should Have items are the best candidates for v1 inclusion as a tradeoff: US-11.1 (AI generation) and US-12.1 (Markdown export) — both provide immediate visible value. US-8.1 (AI Sessions) and US-9.1 (Graph view) can slip to v1.1 without breaking core workflows.
