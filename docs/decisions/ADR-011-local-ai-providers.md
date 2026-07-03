<!-- Source: system-design skill | Phase 6 decisions | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->
<!-- Status: ✅ Accepted -->

# ADR-011: Local AI Provider Support — Ollama + LM Studio

**Status:** ✅ Accepted  
**Date:** 2026-07-02  
**Resolves:** Q5 (token limits), Q6 (AI provider onboarding strategy)

---

## Purpose

Define Forge's AI provider strategy — which providers are supported, how onboarding works, and how token limits are managed.

---

## Context

The original design (ADR-004) established a provider-agnostic `AIPort` interface where new providers are new adapters. The key decisions here are:

1. **Which providers ship in v1** — cloud-only, or also local?
2. **How onboarding works** — which-provider-first or provider-choice at setup?
3. **Token limits** — fixed cap, provider default, or user-controlled?

The decision to include **Ollama** and **LM Studio** is architecturally significant: local providers communicate over a local HTTP server (no API key, no internet required) rather than an external HTTPS API. This expands the AIPort adapter scope and has privacy implications.

---

## Decision

### Provider Roster (v1)

Forge v1 ships with adapters for the following providers, selectable during onboarding and in Settings:

| Provider          | Type  | Auth                  | Base URL                                              | Notes                                           |
| ----------------- | ----- | --------------------- | ----------------------------------------------------- | ----------------------------------------------- |
| **OpenAI**        | Cloud | API key (OS Keychain) | `api.openai.com`                                      | GPT-4o, GPT-4-turbo                             |
| **Anthropic**     | Cloud | API key (OS Keychain) | `api.anthropic.com`                                   | Claude 3.5 Sonnet, Claude 3 Opus                |
| **Google Gemini** | Cloud | API key (OS Keychain) | `generativelanguage.googleapis.com`                   | Gemini 1.5 Pro                                  |
| **Ollama**        | Local | None                  | `http://localhost:11434` (default, user-configurable) | User installs Ollama; model selected in Forge   |
| **LM Studio**     | Local | None                  | `http://localhost:1234` (default, user-configurable)  | OpenAI-compatible API; user loads model         |
| **Skip**          | —     | —                     | —                                                     | Configure later; AI features disabled until set |

### Onboarding Flow (Q6 — Provider-Agnostic)

```
First launch → "Set up AI" screen
  ├── OpenAI    → enter API key → validate → save to OS Keychain
  ├── Anthropic → enter API key → validate → save to OS Keychain
  ├── Gemini    → enter API key → validate → save to OS Keychain
  ├── Ollama    → auto-detect localhost:11434 → list available models → user selects
  ├── LM Studio → auto-detect localhost:1234 → user selects loaded model
  └── Skip      → AI features marked as "not configured" — can configure in Settings later
```

All providers are first-class options at setup — no "recommended" provider is pushed.

### Token Limits (Q5 — Provider Defaults + Advanced Override)

| Setting           | Default                                 | Override                                      |
| ----------------- | --------------------------------------- | --------------------------------------------- |
| Max input tokens  | Provider default (model context window) | User-configurable in Settings → AI → Advanced |
| Max output tokens | Provider default                        | User-configurable                             |
| Request timeout   | 60 seconds                              | User-configurable (30–120s)                   |

**Why provider defaults:** Each model has a different context window (4K to 200K+ tokens). Defaulting to provider limits avoids truncating context unnecessarily. Advanced users who want to cap for cost control can set explicit limits.

### Local Provider Security Posture

Local providers (Ollama, LM Studio) communicate over `localhost` — no data leaves the machine. This is an explicit privacy benefit:

- No API key required
- No data sent to external servers
- Forge sends prompts to the local HTTP server; responses never traverse the network

**Trust model:** Forge treats `localhost` AI servers as trusted (same trust level as the main process). No additional authentication is applied.

---

## Alternatives

| Alternative                                                             | Why Rejected                                                                                                                                                                     |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloud providers only (OpenAI, Anthropic, Gemini)                        | Excludes privacy-conscious users and users in environments where cloud AI is prohibited. Ollama and LM Studio have significant developer adoption. Rejected.                     |
| One provider only (e.g., OpenAI) with a "Switch provider" feature later | Creates a perceived lock-in even when the architecture is provider-agnostic. Provider-agnostic onboarding from day one signals that Forge does not favor any provider. Rejected. |
| Fixed token limits                                                      | Limits advanced users from tuning for cost. Provider models have different optimal settings. Rejected.                                                                           |

---

## Consequences

✅ Privacy-first users can use Forge entirely offline with Ollama or LM Studio — zero data sent externally.  
✅ Provider-agnostic from the first screen — builds trust and signals open architecture.  
✅ No vendor lock-in to any AI provider.  
✅ Local providers need no API key management — simplifies the onboarding path for those users.  
⚠️ Ollama and LM Studio require the user to install and run a separate application. Forge must handle gracefully the case where the local server is not running: detect connection failure → show "Ollama not detected — start Ollama and try again" with a "Retry connection" button.  
⚠️ Local model quality varies — Forge cannot guarantee AI output quality for user-selected local models. This should be communicated in the onboarding screen.  
⚠️ Five cloud/local provider adapters must be maintained. As provider APIs evolve (new models, breaking changes), each adapter needs updating. Mitigated by the `AIPort` interface — each adapter is independent.

---

## AIPort Interface Additions

Supporting Ollama and LM Studio requires the `AIPort` interface to expose model listing:

```typescript
interface AIPort {
  isConfigured(): boolean
  listModels(): Promise<AIModel[]> // New: for local providers that expose model lists
  generate(prompt: string, options: AIGenerateOptions): Promise<string>
  review(content: string, context: AIContext): Promise<ReviewResult>
  getCapabilities(): AICapabilities // New: provider feature flags
}

interface AICapabilities {
  supportsStreaming: boolean
  supportsModelListing: boolean
  maxContextTokens: number
  isLocal: boolean // true for Ollama, LM Studio
}
```

---

## Future Considerations

- **Streaming responses (v1.1):** Local providers (Ollama, LM Studio) support streaming natively via SSE. Cloud providers also support streaming. Implementing streaming would significantly improve perceived responsiveness for long generations. Route via IPC event stream (`ipcRenderer.on`).
- **Custom provider (v2):** An "Advanced" provider option where the user provides a base URL and API key — covers any OpenAI-compatible endpoint not explicitly listed.
- **Provider health dashboard (v2):** A Settings screen showing current provider status, last response time, and token usage for cloud providers.
