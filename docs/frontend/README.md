<!-- Source: documentation-engineering | Phase 15 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Frontend Design

Complete frontend design specifications for Forge v1 — aesthetic direction, design system, layout architecture, and state management.

> **Technology:** React 18 · Tailwind CSS · Zustand · CodeMirror 6 · React Flow  
> **Aesthetic:** Industrial Utilitarian (Dark Mode Native)  
> **See:** [ADR-008](../decisions/ADR-008-codemirror-editor.md) (Editor) · [ADR-009](../decisions/ADR-009-react-flow-graph.md) (Graph)

---

| File                                             | Description                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| [design-system.md](design-system.md)             | Typography (3-tier), Colors (Slate + Amber), Spatial Grid, and Motion           |
| [layout-architecture.md](layout-architecture.md) | App shell CSS Grid layout and the 3 core views (Home, Graph, Editor)            |
| [state-management.md](state-management.md)       | Zustand stores, IPC hydration flow, and optimistic updates                      |
| [visual-enhancement.md](visual-enhancement.md)   | High-end visual design rules, Doppelrand architecture, and cubic-bezier motion  |
| [ux-audit.md](ux-audit.md)                       | Usability guardrails, AI undo history, IPC latency visibility, and empty states |

---

## Design System Overview

Forge is built as a serious engineering workspace, not a generic SaaS. The UI relies on strict geometric divisions (1px solid borders, no drop shadows), high-contrast monospace metadata, and highly legible reading text.

- **Display Type:** Space Grotesk
- **Reading Type:** IBM Plex Sans
- **Code/Metadata Type:** JetBrains Mono
- **Primary Colors:** Deep Slate (`#0F1115`) with Electric Amber (`#F59E0B`) accents.

## Architecture Highlights

1. **Dumb View Layer:** The React frontend is entirely driven by the SQLite database via IPC.
2. **Ephemeral State:** Zustand (`useInitiativeStore`, `useUIStore`) acts as a fast, local cache to avoid Prop Drilling. State is cleared and rehydrated on navigation.
3. **Optimistic UI:** User interactions (typing, dragging) update local state instantly, while IPC mutations are fired in the background to ensure the app feels native and fast.
