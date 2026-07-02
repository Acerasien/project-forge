<!-- Source: requirements-engineering skill | Phase 3 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Non-Functional Requirements

All non-functional requirements (NFRs) for Forge v1. These define how the system must perform, not what it does. NFRs marked **[ASSUMPTION]** are reasonable defaults that should be validated during development.

---

## Performance

| Metric | Target | Notes |
|--------|--------|-------|
| App startup time (cold) | < 3 seconds | On target developer hardware |
| Artifact load time | < 500ms | For any artifact, any size Initiative |
| Local search response | < 200ms | Full-text search across all local data |
| AI generation response | < 30 seconds p95 | Dependent on external API; show progress indicator |
| Export (single artifact) | < 2 seconds | |
| Export (full Initiative) | < 10 seconds | |

> **[ASSUMPTION]** Performance targets assume a modern developer machine (M-series Mac or equivalent). Minimum hardware specs to be defined before first release.

---

## Scalability

| Dimension | v1 Design Target | 2-Year Design Target |
|-----------|-----------------|---------------------|
| Initiatives per user | Up to 50 | Up to 500 |
| Artifacts per Initiative | Up to 200 | Up to 2,000 |
| AI Sessions per Initiative | Up to 100 | Up to 1,000 |
| ADRs per Initiative | Up to 100 | Up to 500 |
| Tasks per Initiative | Up to 500 | Up to 5,000 |

> **[ASSUMPTION]** These are design targets for schema and query design — not enforced caps. The data model must not be structurally incompatible with the 2-year targets.

> **Principle:** Do not optimize for imaginary scale. Local-first storage bounds scale to the user's disk and hardware — a generous ceiling for a solo developer tool.

---

## Availability

| Tier | Target | Rationale |
|------|--------|-----------|
| Core local functionality | 100% (offline) | Local-first — zero network dependency |
| AI features | Best-effort | Dependent on external LLM provider SLA |
| Cloud sync (v2 only) | 99.9% | When introduced — single-region acceptable initially |

---

## Security

| Concern | Requirement |
|---------|-------------|
| Local data at rest | OS-level filesystem protection in v1. Encryption at rest to be evaluated before any cloud feature ships. |
| API key storage | AI provider and GitHub API keys stored in OS Keychain (via `keytar`) — never in plaintext files or the SQLite database. |
| Network transmission | All outbound calls (AI provider, GitHub) use HTTPS / TLS 1.2+. |
| Authentication (cloud) | When cloud accounts are introduced: bcrypt/Argon2 password hashing, JWT or session-based auth, GDPR-compliant data handling. |
| Data privacy | Zero telemetry or usage data transmitted without explicit user opt-in. |
| Compliance | GDPR posture established before any cloud sync feature ships. Minimum: right to deletion, data export, consent record. |

See [../architecture/security-model.md](../architecture/security-model.md) for full security model.

---

## Maintainability

| Dimension | Requirement |
|-----------|-------------|
| Language | Type-safe (TypeScript — to be confirmed). Strict linting enforced from day one. |
| Test coverage | Core WorkflowEngine (approval gates, artifact dependencies) and GraphService must have comprehensive automated tests. |
| Documentation | All public data models and domain interfaces must be documented. Forge should dogfood itself — architectural decisions about Forge are tracked as Forge Initiatives. |
| Observability | Structured local logging for debugging. Error boundaries in UI components to prevent cascade failures. |
| Solo maintainability test | Every architectural decision must pass: *"Can one person understand, debug, and evolve this in 3 years?"* |

---

## Compatibility

| Dimension | v1 Target |
|-----------|-----------|
| Operating systems | macOS (primary), Windows, Linux |
| Minimum OS versions | Defined before first release based on Electron version selection |
| Accessibility | WCAG 2.1 AA — keyboard navigable, screen reader compatible, sufficient color contrast (4.5:1 minimum) |
| Markdown export | Must be readable in: Obsidian, Notion (import), GitHub (rendered), VS Code |
| AI providers | v1 supports at minimum one provider. Provider-agnostic interface from the start — new providers are new adapters with no interface changes. |
| Future web version | UI framework choice must allow the Presentation layer to be ported to a web app without changing Domain or Application layers. |

---

## Constraints Summary

| Constraint | Detail |
|-----------|--------|
| Team size | 1 person — every feature has a solo-build complexity ceiling |
| Timeline | Bootstrapped, indefinite — phased delivery is the only viable strategy |
| Budget | Self-funded — no paid services that create financial dependency before revenue |
| Scope rule | If a Must Have requirement cannot be scoped to deliver standalone value, it must be decomposed before implementation |

---

## Assumptions Register

| ID | Assumption | Impact if Wrong | Validation Plan |
|----|-----------|----------------|----------------|
| A1 | Forge delivery form is Electron desktop (not CLI-only) | Affects entire UX and distribution | ✅ Confirmed — Electron selected (ADR-001) |
| A2 | Cloud sync deferred to v2 — v1 is fully local | If needed in v1, significant arch work required | ✅ Confirmed — explicitly out of scope for v1 |
| A3 | AI features powered by external LLM APIs with user-provided API keys | If built-in model required, compute model changes entirely | Confirm during Phase 7 |
| A4 | Primary v1 user is a technically sophisticated developer comfortable with structured process | If target users are less technical, UX complexity must be reduced | Validate via early dogfooding |
| A5 | GDPR compliance triggered when cloud sync or accounts are introduced | Without GDPR design, legal exposure is created | Require GDPR design review before any cloud feature |
| A6 | Approval gates are warnings with override — not hard blocks | If hard blocks preferred, UX pattern changes significantly | Confirm during Phase 8 (Frontend Design) |
| A7 | AI Sessions are read-only — users do not resume AI sessions interactively | If resumable sessions required, threading model needed | Revisit for v2 if user demand warrants |
| A8 | Tasks are the bridge to implementation tools — Forge does not manage code | If users want code management in Forge, scope expands significantly | Enforce in v1; revisit for v2 |
| A9 | ADRs are immutable after acceptance — only status can change | If editable ADRs required, integrity model needs revision | Validate during dogfooding |
