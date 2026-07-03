<!-- Source: architect skill | Phase 5 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Problem Brief

**Product:** Forge — AI-powered Software Engineering Operating System  
**Type:** Greenfield  
**Owner:** Solo founder

---

## The Problem

Developers lose the _why_ behind decisions, skip engineering structure under deadline pressure, and scatter their thinking across disconnected tools (Notion, GitHub, Linear, Slack). No existing tool owns the structured, traceable process that happens **before the first line of code is written**.

---

## Goal

Forge is an AI-powered, strongly opinionated Software Engineering Operating System. It gives developers a gate-enforced engineering workflow that transforms a raw idea into a fully traceable engineering effort — capturing every decision, requirement, architectural choice, and task in a single persistent workspace called an **Initiative**.

Forge occupies the **upstream thinking layer**: everything from idea to architecture to actionable task. It does not manage code, CI/CD, deployments, or monitoring. It feeds into the tools that do.

---

## Users

| Version | Users                                                                       |
| ------- | --------------------------------------------------------------------------- |
| v1      | Solo developers who want engineering discipline without multi-tool overhead |
| v2+     | Small-to-mid engineering teams (2–50 engineers)                             |

---

## Core Workflows

1. **Create an Initiative** — name it, describe it, begin the structured engineering process.
2. **Author and approve artifacts** — Vision → Requirements → Architecture → System Design, each with explicit approval gates and AI assistance.
3. **Record decisions** — capture ADRs throughout; link them to the artifacts they affect.
4. **Derive tasks** — generate actionable Tasks from approved Requirements and System Design.
5. **Engage AI** — request generation, review, or critique at any phase; all AI interactions are preserved as AI Sessions.
6. **Navigate the engineering graph** — trace from any Task back to its source Requirement, Architecture decision, and ADR.
7. **Export and push** — produce Markdown artifacts; push Tasks to GitHub Issues.

---

## Constraints

| Constraint              | Detail                                                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Delivery**            | Electron desktop application (v1). Platform-agnostic architecture for future web version.                   |
| **Data strategy**       | Fully local-first, offline-capable. No cloud dependency in v1.                                              |
| **Storage abstraction** | `StoragePort` interface — cloud sync can be added in v2 without touching domain logic.                      |
| **AI dependency**       | AI must never be load-bearing. All core workflows must function without an AI provider configured.          |
| **Team**                | Solo developer. Every decision must pass: _"Can one person understand, debug, and evolve this in 3 years?"_ |
| **Scope boundary**      | Forge owns the upstream thinking layer. Source code, Git, CI/CD, deployment = out of scope for v1.          |

---

## External Dependencies

| Dependency                                    | Type                      | Risk                                                       |
| --------------------------------------------- | ------------------------- | ---------------------------------------------------------- |
| AI LLM provider (OpenAI / Anthropic / Gemini) | Optional AI features      | API churn, cost, outages — mitigated by AIPort abstraction |
| GitHub REST API                               | Optional push integration | API changes — mitigated by IntegrationHub isolation        |
| OS Keychain                                   | Secure credential storage | Platform differences — mitigated by `keytar`               |

---

_See [system-context.md](system-context.md) for the C4 context diagram._  
_See [component-list.md](component-list.md) for component breakdown._  
_See [../decisions/README.md](../decisions/README.md) for ADRs._
