<!-- Source: architect skill | Phase 5 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->
<!-- Status: ✅ Accepted -->

# ADR-007: Electron IPC Security — contextBridge, No nodeIntegration

**Status:** ✅ Accepted  
**Date:** 2026-07-02

---

## Purpose

Define a secure communication pattern between the Electron renderer process and the main process, preventing renderer-side code from accessing Node.js APIs directly.

---

## Context

Electron's security model requires that the renderer process (which runs web content and can be vulnerable to XSS) not have direct access to Node.js APIs. The most common Electron security vulnerability is enabling `nodeIntegration: true`, which means any XSS in the renderer becomes a full system compromise — including filesystem access, arbitrary code execution, and credential theft. Forge handles sensitive user data (engineering intellectual property, API keys) and must not expose these to a compromised renderer.

---

## Decision

The renderer runs in a sandboxed context with:

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`

All main-process capabilities are exposed to the renderer **exclusively** through a typed `contextBridge` preload script. IPC channels are explicitly enumerated in the preload — no wildcard listeners, no dynamic channel names.

**Pattern:**

```
Renderer (React UI)
    ↓ window.forge.initiativeManager.create(name, description)
contextBridge preload (typed API surface)
    ↓ ipcRenderer.invoke('initiative:create', { name, description })
Main Process IPC handler
    ↓ InitiativeManager.create(name, description)
```

Every capability exposed to the renderer is explicitly declared. If it's not in the preload, the renderer cannot access it.

---

## Alternatives

| Alternative                                                  | Why Rejected                                                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `nodeIntegration: true`                                      | Renderer has full Node.js access. Any XSS becomes full system compromise. Categorically rejected. |
| `@electron/remote` module                                    | Deprecated pattern with the same security problems as `nodeIntegration`. Rejected.                |
| IPC without contextBridge (direct `ipcRenderer` in renderer) | Requires `contextIsolation: false`. Weakens the security boundary. Rejected.                      |

---

## Consequences

✅ Renderer is fully sandboxed — XSS in UI cannot access filesystem, database, or OS APIs.  
✅ IPC channel inventory is explicit, auditable, and type-safe.  
✅ The preload script serves as the contract between UI and system — changes require intentional updates to a single file.  
⚠️ Every new capability exposed to the renderer must be explicitly declared in the preload script. This is a feature, not a burden — it makes the attack surface visible.

---

## Future Considerations

- As Forge features grow, the contextBridge API surface will grow. Maintain a typed interface registry (`window.forge` API surface) with input/output types for all channels.
- Consider generating the preload type definitions from a shared contract file to keep renderer types and main process handlers in sync.
- When the future web version is built, the contextBridge preload is replaced by a standard HTTP/WebSocket API layer — the same IPC interface contract guides the web API design.
