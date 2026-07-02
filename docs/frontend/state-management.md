<!-- Source: frontend-design skill | Phase 8 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# State Management & IPC

Forge's frontend is a "dumb" view layer. The **SQLite database is the single source of truth**, running synchronously in the Electron Main process. 

The frontend uses **Zustand** as an ephemeral UI cache to bind data to React components without Prop Drilling.

---

## IPC Hydration Flow

1. **Mount:** A React component mounts (e.g., `ArtifactEditor`).
2. **Fetch:** `useEffect` calls an IPC method `await window.forge.artifacts.get(id)`.
3. **Hydrate:** The IPC response is pushed into the Zustand store `useInitiativeStore.getState().setArtifact(data)`.
4. **Render:** Components subscribed to the store re-render.

---

## Optimistic Updates

For high-frequency interactions (e.g., typing in the editor, dragging a graph node), the UI updates instantly to avoid IPC latency feeling sluggish.

1. **Action:** User types in the CodeMirror editor.
2. **Optimistic UI:** Local React state (or Zustand) updates immediately.
3. **IPC Call:** A debounced IPC call is sent: `window.forge.artifacts.update(id, { content })`.
4. **Error Handling:** If the IPC call fails (throws), the catch block reverts the Zustand store to its previous state and shows a toast error.

---

## Zustand Store Architecture

### 1. `useUIStore`
Manages purely local interface state. Never touches IPC.
- `sidebarOpen: boolean`
- `activeTheme: 'dark'` (always dark in v1, but structured for future)
- `activeTab: string` (for split panes)

### 2. `useInitiativeStore`
Caches the active Initiative and its dependent entities.
- `initiative: Initiative | null`
- `artifacts: Artifact[]`
- `tasks: Task[]`
- `adrs: ADR[]`
- `graphEdges: ArtifactRelationship[]`

When navigating to a new Initiative, this store is cleared and rehydrated via IPC.

---

## React Flow State

`reactflow` requires specific state structures for Nodes and Edges. 

- Nodes and Edges are computed dynamically from the `useInitiativeStore` data.
- **Do not duplicate state:** React Flow's `nodes` state should be derived from `artifacts`, `tasks`, etc. 
- When a node is dragged, React Flow's `onNodesChange` fires. We update the visual position locally, but node positions are *not* persisted to SQLite in v1 (auto-layout `dagre` runs on load).
