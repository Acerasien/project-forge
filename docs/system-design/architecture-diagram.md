<!-- Source: system-design skill | Phase 6 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Runtime Architecture Diagram

This diagram shows Forge's two Electron processes, the adapter layer, and all external systems — as they exist at runtime.

See [../architecture/system-context.md](../architecture/system-context.md) for the external C4 context view.  
See [../architecture/component-list.md](../architecture/component-list.md) for component responsibilities.

---

## Runtime Component Flow

```mermaid
flowchart TD
    subgraph Renderer["Electron Renderer Process (sandboxed)"]
        UI["UI Shell\n(React + Zustand)"]
        PRE["contextBridge Preload\n(typed IPC surface — window.forge.*)"]
    end

    subgraph Main["Electron Main Process"]
        IPC["IPC Router\n(ipcMain.handle registry)"]

        subgraph AppServices["Application Services"]
            IM["InitiativeManager"]
            AE["ArtifactEngine"]
            WE["WorkflowEngine"]
            GS["GraphService"]
            AIO["AIOrchestrator"]
            EX["ExportService"]
            IH["IntegrationHub"]
            SI["SearchIndex"]
            SM["SettingsManager"]
        end

        subgraph Domain["Domain Layer (pure — no I/O)"]
            ENT["Entities + Domain Services"]
            RULES["Business Rules + Invariants"]
        end

        subgraph Infra["Infrastructure Adapters"]
            SA["LocalSQLiteAdapter\n(StoragePort)"]
            AA["LLMProviderAdapter\n(AIPort)"]
            GA["GitHubAPIAdapter\n(GitHubPort)"]
            KA["KeychainAdapter"]
            FA["FilesystemAdapter"]
        end
    end

    DB[("SQLite\nforge.db\n(WAL mode)")]
    AI_EXT["AI LLM Provider\n(external — optional)"]
    GH_EXT["GitHub API\n(external — optional)"]
    OS_KC["OS Keychain"]
    FS["Local Filesystem\n(exports, logs, backups)"]

    UI <-->|"React events + Zustand"| UI
    UI <--> PRE
    PRE <-->|"ipcRenderer.invoke / ipcRenderer.on"| IPC
    IPC --> AppServices
    AppServices --> Domain
    AppServices --> Infra
    SA <--> DB
    AA -->|"HTTPS"| AI_EXT
    GA -->|"HTTPS"| GH_EXT
    KA <--> OS_KC
    FA <--> FS
```

---

## Process Boundary Summary

| Boundary | Mechanism | Direction |
|----------|-----------|-----------|
| Renderer ↔ Main | `contextBridge` + `ipcRenderer.invoke` | Bidirectional (request/response) |
| Main ↔ SQLite | `better-sqlite3` synchronous API | Read/Write |
| Main ↔ AI Provider | HTTPS (async Promise) | Outbound only |
| Main ↔ GitHub API | HTTPS (async Promise) | Outbound only |
| Main ↔ OS Keychain | `keytar` platform API | Read/Write |
| Main ↔ Filesystem | Node.js `fs` module | Read/Write |

---

## Trust Boundary at a Glance

```
[Renderer — lower trust]
    ↓ contextBridge only (no Node.js)
[Main Process — trusted]
    ↓ direct access
[SQLite, OS Keychain, Filesystem]
```

The renderer cannot reach SQLite, the OS Keychain, or the filesystem directly. Every operation is mediated by the typed IPC bridge. See [../architecture/security-model.md](../architecture/security-model.md).
