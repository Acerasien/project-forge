<!-- Source: architect skill | Phase 5 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->
<!-- Status: ✅ Accepted -->

# ADR-004: Provider-Agnostic AI Interface

**Status:** ✅ Accepted  
**Date:** 2026-07-02

---

## Purpose

Ensure Forge can switch or add AI providers without affecting the core workflow — now or in the future.

---

## Context

AI providers are volatile: APIs change, models are deprecated, new providers emerge, pricing shifts. A solo developer cannot afford to have core application logic tightly coupled to any single provider's SDK. Additionally, Forge must support user-provided API keys and model selection, which requires the integration point to be well-defined and swappable.

---

## Decision

All AI operations go through an **`AIPort` interface** defined in the Application layer. v1 supports one provider via a concrete adapter (e.g., `OpenAIAdapter` or `AnthropicAdapter`). Additional providers are new adapter implementations — zero changes to the Application or Domain layers.

The `AIPort` interface exposes only what the application layer needs:

- `generate(prompt, context): Promise<string>` — draft content generation
- `review(content, context): Promise<ReviewResult>` — critique and gap analysis
- `isConfigured(): boolean` — whether a valid provider is set up

No LLM SDK is imported anywhere above the Infrastructure layer.

---

## Alternatives

| Alternative                                                                   | Why Rejected                                                                                                                                                                                |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct integration with one AI SDK (e.g., OpenAI SDK in application services) | Fast for v1, but creates hard migration cost when provider changes. Rejected.                                                                                                               |
| LangChain abstraction                                                         | Provides provider switching, but introduces significant version churn risk (LangChain breaking changes are frequent) and opaque abstraction layers. Rejected for a solo long-lived project. |

---

## Consequences

✅ New AI providers are additive — no existing code changes required.  
✅ The AI layer can be tested with a deterministic mock adapter.  
✅ Users control cost, privacy, and model choice via settings.  
✅ Core workflows function with no provider configured — AI never blocks the critical path.  
⚠️ The `AIPort` interface must be expressive enough to accommodate provider differences (streaming, function calling, context window limits) without leaking provider specifics into the interface.

---

## Future Considerations

- If Forge ever supports a local model (e.g., via Ollama), that is another `AIPort` adapter — no application changes.
- If streaming responses become important for UX, the `AIPort` interface should support an optional streaming callback alongside the Promise-based return.
- Consider adding a `getCapabilities(): AICapabilities` method to `AIPort` so the application layer can gracefully degrade when a provider doesn't support a specific feature.
