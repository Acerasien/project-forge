<!-- Source: requirements-engineering skill | Phase 3 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Requirements

| File | Description |
|------|-------------|
| [functional-requirements.md](functional-requirements.md) | All user stories with Given/When/Then acceptance criteria and edge cases |
| [non-functional-requirements.md](non-functional-requirements.md) | Performance, scalability, availability, security, maintainability, compatibility targets |
| [moscow-priorities.md](moscow-priorities.md) | MoSCoW prioritization — Must Have, Should Have, Could Have, Won't Have |

---

## Scope Summary

Forge v1 supports **7 artifact types** within an **Initiative**:

| Artifact | Purpose |
|----------|---------|
| Vision | Why the Initiative exists and what success looks like |
| Requirements | Functional and non-functional requirements with acceptance criteria |
| Architecture | System boundaries, modules, diagrams, and design rationale |
| ADRs | Records of major engineering decisions and trade-offs |
| System Design | Runtime behavior, request flows, data flow, scalability, security |
| Tasks | Actionable implementation work derived from Requirements and System Design |
| AI Sessions | Preserved AI-assisted discussions and generated artifacts |

**Explicitly out of scope for v1:** Source code management, Git integration, CI/CD, deployment, testing frameworks, monitoring, infrastructure management, cloud sync, team collaboration.

---

## Requirements Traceability

All requirements trace back to the Phase 2 Understanding Lock. The Understanding Lock establishes:
- Forge is strongly opinionated — it enforces a structured SDLC workflow
- An Initiative is the primary object — a long-lived engineering workspace
- Forge owns the upstream thinking layer, not the execution layer
- AI enhances but never enables — core workflows function without AI

See [../architecture/domain-model.md](../architecture/domain-model.md) for the domain model that implements these requirements.
