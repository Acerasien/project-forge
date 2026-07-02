<!-- Source: architect skill | Phase 5 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# System Context

This diagram shows Forge as a black box and how it relates to external actors and systems.

---

## C4 Context Diagram

```mermaid
C4Context
    title Forge — System Context (v1)

    Person(dev, "Developer", "Solo developer using Forge to manage engineering initiatives")

    System_Boundary(forge_boundary, "Forge Desktop Application") {
        System(forge, "Forge", "Local-first AI-powered SDLC Operating System")
    }

    System_Ext(ai_provider, "AI LLM Provider", "OpenAI / Anthropic / Gemini\nOptional — user-configured")
    System_Ext(github, "GitHub API", "Optional push integration\nTasks → GitHub Issues")
    System_Ext(os_keychain, "OS Keychain / Credential Store", "Secure storage for API keys\nNever stored in plaintext")
    System_Ext(filesystem, "Local Filesystem", "Forge data directory\nAll Initiative data at rest")

    Rel(dev, forge, "Authors artifacts, reviews AI output, manages Initiatives", "Desktop UI")
    Rel(forge, ai_provider, "Sends prompts, receives AI completions", "HTTPS / LLM API")
    Rel(forge, github, "Pushes Tasks as GitHub Issues", "HTTPS / GitHub REST API v3")
    Rel(forge, os_keychain, "Reads/writes AI and integration API keys", "OS credential API")
    Rel(forge, filesystem, "Reads/writes all Initiative and artifact data", "Local I/O")
```

---

## External Systems

| System | Role | Forge Relationship |
|--------|------|--------------------|
| **Developer** | Primary user | Creates Initiatives, authors artifacts, reviews AI output |
| **AI LLM Provider** | Optional AI backend | Forge sends prompts; receives completions. User provides API key. |
| **GitHub API** | Optional push integration | One-way: Forge pushes Tasks as Issues. Never pulls. |
| **OS Keychain** | Secure credential store | Forge reads/writes API keys. Keys never written to disk in plaintext. |
| **Local Filesystem** | Persistence | All Initiative data lives in a single `.sqlite` file in the Forge data directory. |

---

## Key Design Boundaries

- **Forge does not own code.** Source files, Git repositories, CI pipelines, and deployment systems are entirely external.
- **Forge is push-only with integrations.** It outputs to GitHub Issues and Markdown exports. It does not pull state from external systems.
- **No cloud in v1.** All data lives on the local filesystem. No remote server communication except AI provider and GitHub API calls (both user-initiated, both optional).

---

*See [component-list.md](component-list.md) for internal component breakdown.*  
*See [../decisions/ADR-001-electron-delivery.md](../decisions/ADR-001-electron-delivery.md) for delivery mechanism decision.*
