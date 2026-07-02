<!-- Source: frontend-design skill | Phase 8 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Layout Architecture

Forge operates within a single-window Electron shell. The layout uses CSS Grid and Flexbox to create a strict, pane-based workspace.

---

## The App Shell (App.tsx)

```text
+-------------------------------------------------------------+
| [macOS traffic lights]  Forge            [Sync: Local]      | <- Titlebar (Draggable, h-10)
+---------+---------------------------------------------------+
|         |                                                   |
| Sidebar | Main Content Area (Routing Boundary)              |
| w-64    | flex-1                                            |
|         |                                                   |
| (Nav)   |                                                   |
|         |                                                   |
+---------+---------------------------------------------------+
| Status Bar: "SQLite WAL | AI: Ollama (llama3) | 120ms"      | <- Statusbar (h-8)
+-------------------------------------------------------------+
```

### Components:
- **Titlebar:** Custom frameless window drag area. Contains the app title and global sync/workspace status.
- **Sidebar:** Navigation for Initiatives, Settings, and global search. Separated by a `border-r border-forge-border`.
- **Main Content Area:** The `<Outlet />` for React Router.
- **Status Bar:** Global system status, AI provider health, and operation latency.

---

## View 1: Initiative Home (Data-Dense)

**Route:** `/initiatives/:id`

A dense, IDE-like overview of an initiative.

- **Header:** Initiative Title (`Space Grotesk`) and Status.
- **Content:** Grid of artifacts and tasks.
- **Typography:** `JetBrains Mono` used heavily for timestamps and metrics (e.g., `Tasks: 12/24`).

---

## View 2: The Graph (React Flow)

**Route:** `/initiatives/:id/graph`

The visual traceability matrix.

- **Canvas:** Full-bleed React Flow canvas occupying the entire Main Content Area.
- **Nodes:** Strictly rectangular (`rounded-sm`), no shadows. 1px solid border. Background `#1A1D24`.
- **Edges:** `type="smoothstep"` (orthogonal stepped lines) to maintain the industrial/CAD aesthetic. No curved bezier lines.
- **Controls:** Minimalist zoom/pan controls fixed to the bottom right.

---

## View 3: Artifact Editor (Split Pane)

**Route:** `/initiatives/:id/artifacts/:artifactId`

The core authoring experience.

```text
+-----------------------------------+-----------------------------------+
| Title              [Status Badge] | AI Assistant / Markdown Preview   |
|                                   |                                   |
| [CodeMirror 6 Editor]             | [Chat UI or Rendered Output]      |
|                                   |                                   |
|                                   |                                   |
|                                   |                                   |
+-----------------------------------+-----------------------------------+
```

### Components:
- **Resizer:** A 1px vertical border (`border-forge-border`) that is draggable to adjust the split ratio.
- **Left Pane (Editor):** `CodeMirror 6`. The UI is entirely hidden — it looks like a clean text area. Syntax highlighting uses colors from the Forge palette.
- **Right Pane (Context):** 
  - **Tab 1: Preview:** Rendered Markdown of the current artifact.
  - **Tab 2: AI Session:** Chat interface communicating with the `AIPort`.
- **Typography:** The editor uses `IBM Plex Sans` for prose and `JetBrains Mono` for code blocks.
