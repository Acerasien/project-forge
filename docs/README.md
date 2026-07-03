<!-- Source: documentation-engineering | Phase 15 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Forge — Project Documentation

> Auto-maintained by the documentation-engineering skill.  
> Last updated: 2026-07-03

Forge is an AI-powered Software Engineering Operating System. Its mission is to become the central source of truth for the entire upstream software development lifecycle — from idea to architecture to actionable tasks — in a single traceable, locally-owned workspace.

---

## Sections

| Section                                  | Description                                                              | Last Updated |
| ---------------------------------------- | ------------------------------------------------------------------------ | ------------ |
| [Architecture](architecture/README.md)   | System structure, components, domain model, technology choices, security | 2026-07-03   |
| [System Design](system-design/README.md) | Runtime behavior, data flows, error handling, observability, trade-offs  | 2026-07-03   |
| [Database](database/README.md)           | Schema, ERD, indexing strategy, migration plan, query catalog            | 2026-07-02   |
| [Frontend](frontend/README.md)           | Design system, layout architecture, state management                     | 2026-07-02   |
| [Requirements](requirements/README.md)   | Functional requirements, NFRs, MoSCoW prioritization, constraints        | 2026-07-02   |
| [Decisions](decisions/README.md)         | Architecture Decision Records (ADRs) — all major engineering decisions   | 2026-07-03   |

---

## Workflow Phases Completed

| Phase    | Name                               | Status      |
| -------- | ---------------------------------- | ----------- |
| Phase 1  | Project Assessment                 | ✅ Complete |
| Phase 2  | Brainstorming / Understanding Lock | ✅ Complete |
| Phase 3  | Requirements Engineering           | ✅ Complete |
| Phase 5  | Software Architecture              | ✅ Complete |
| Phase 6  | System Design                      | ✅ Complete |
| Phase 7  | Database Design                    | ✅ Complete |
| Phase 8  | Frontend Design                    | ✅ Complete |
| Phase 9  | Visual Enhancement                 | ✅ Complete |
| Phase 10 | UX Validation                      | ✅ Complete |
| Phase 15 | Documentation Engineering          | ✅ Complete |

---

## Key Concepts

- **Initiative** — The primary object in Forge. A long-lived engineering workspace for a product, feature, migration, or research effort. Contains all related artifacts.
- **Artifact** — A discrete engineering document (Vision, Requirements, Architecture, ADR, System Design, Task, AI Session) within an Initiative, each with its own lifecycle and approval state.
- **Engineering Graph** — The directed, typed graph of relationships between artifacts. The graph makes every design decision, requirement, and task traceable to its origin.
- **Approval Gate** — A workflow checkpoint enforced by Forge. Upstream artifacts should normally be approved before downstream work begins. Gates are warnings with confirmation override — never silent blocks.
