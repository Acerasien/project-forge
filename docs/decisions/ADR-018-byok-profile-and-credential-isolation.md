<!-- Source: architect | Phase 5 | Date: 2026-07-03 -->
<!-- Last updated: 2026-07-03 -->

# ADR-018: BYOK Profile Registry and OS Credential Store Isolation

## Status

✅ Accepted

## Context

Forge is designed as a local-first, developer-native desktop engineering tool rather than a SaaS/cloud platform. Consequently, users are expected to use their own AI provider accounts (e.g., Google Gemini, OpenAI, Ollama, LM Studio) by supplying their own API keys or local endpoint credentials.

Currently:
- API keys are stored directly in plaintext within `settings.json` under the user's home folder config directory.
- This represents a security vulnerability if the configuration files are copied, checked into source control, or backup-synced across environments.
- API keys are global, meaning every project/Initiative uses the exact same active AI profile.

We need a secure, enterprise-grade credential management system that isolates sensitive API keys from static configuration files, while allowing modular overrides per-Initiative.

## Decision

We will implement the following changes in the configuration and credential flow:

1. **Credential Store Separation**:
   - static configuration metadata (e.g., profile name, provider type, endpoint URL, default model, capability flags) will continue to reside in `settings.json`.
   - API keys and credentials will be extracted entirely from `settings.json` and saved in the host operating system's native secure credential manager (Windows Credential Manager, macOS Keychain, Linux Secret Service via DBus) under a standardized key scheme like `forge:ai-profile:[profile_id]`.
   - If the host system does not support a native credential store, we will use Electron's `safeStorage` API to store encrypted keys within `settings.json` as a secure fallback.

2. **Resolution Hierarchy**:
   - AI provider resolution for any workflow or chat event will follow a strict three-tier hierarchy:
     1. **Initiative-Specific Profile**: If the active Initiative specifies a custom `ai_profile_id` override in the SQLite database, use it.
     2. **Global Active Profile**: If no local override is configured, use the global profile set in the settings.
     3. **Prompt to Configure**: If no profile is configured globally or locally, block agent execution and prompt the user with a configuration modal.

3. **Database Schema Update**:
   - Add a nullable `ai_profile_id` field to the `initiatives` SQLite schema (supported by Kysely query models and DB migrations).

4. **ICredentialStore Abstraction**:
   - Introduce a provider-agnostic, generic key-value `ICredentialStore` interface in the core application layer:
     ```typescript
     interface ICredentialStore {
       get(secretId: string): Promise<string | null>
       set(secretId: string, value: string): Promise<void>
       delete(secretId: string): Promise<void>
       exists(secretId: string): Promise<boolean>
     }
     ```
   - This generic interface isolates *any* secret type (API keys, OAuth tokens, personal access tokens) instead of being tied specifically to AI credentials.
   - The `AIProfile` metadata will store a `credentialId` key pointing to this store, decoupling the settings profile entirely from secret storage logic and facilitating modular testing.
   - Develop modular implementations (e.g., `OSKeychainStoreAdapter`, `ElectronSafeStorageFallback`) that implement this interface.

## Consequences

- **Secure Backups**: Backing up, sharing, or copying `settings.json` is now 100% safe as it contains no credentials or decrypted tokens.
- **Enterprise Friendly**: Adhering to native OS keychain stores allows Forge to comply with enterprise IT security policies.
- **Workspace Flexibility**: Initiatives can now target different endpoints (e.g., a highly secure corporate initiative using an internal LM Studio server, and a personal initiative using a personal Gemini Key).
