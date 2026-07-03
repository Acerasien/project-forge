<!-- Source: architect skill | Phase 5 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->
<!-- Status: ✅ Accepted -->

# ADR-001: Electron as v1 Delivery Mechanism

**Status:** ✅ Accepted  
**Date:** 2026-07-02

---

## Purpose

Define the delivery form for Forge v1 and establish the platform strategy for future versions.

---

## Context

Forge is local-first, requires direct filesystem access, OS keychain integration, and must work fully offline. The primary user is a solo developer on a desktop machine. The architecture must remain platform-agnostic to allow a future web version without a full rewrite.

---

## Decision

Forge v1 is delivered as an **Electron desktop application**. The renderer layer uses web technologies (HTML/CSS/JavaScript via React), making the UI portable to a future web application. The main process handles all native OS operations (filesystem, keychain, local database).

---

## Alternatives

| Alternative                                    | Why Rejected                                                                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Native macOS app (Swift/AppKit)                | macOS-only — eliminates cross-platform path and future web version.                                                        |
| Web app with browser local storage (IndexedDB) | Limited storage APIs, poor OS keychain integration, no reliable offline native execution for a developer tool.             |
| CLI tool                                       | Too low-level for the workflow-oriented UX Forge requires.                                                                 |
| Tauri (Rust backend + WebView)                 | Smaller bundle size and better performance, but smaller ecosystem and higher solo-maintainability risk. Re-evaluate at v2. |

---

## Consequences

✅ Cross-platform (macOS, Windows, Linux) from a single codebase.  
✅ Web technologies in renderer means the UI can be extracted into a standalone web app with a different backend.  
✅ Full Node.js access in main process for filesystem, OS keychain, and native integrations.  
⚠️ Electron bundles are large (~100MB+). Acceptable for a developer tool.  
⚠️ Electron's security model requires discipline — see [ADR-007](ADR-007-electron-ipc-security.md).

---

## Future Considerations

Re-evaluate Tauri for v2 if bundle size or performance become user pain points. The platform-agnostic architecture means the UI code is portable regardless of the Electron/Tauri choice.
