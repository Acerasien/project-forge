<!-- Source: system-design skill | Phase 6 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Observability

Forge v1 is a local desktop application — there is no remote monitoring, no APM, and no alerting infrastructure. All observability is local. Zero telemetry is transmitted without explicit user opt-in.

---

## Local Logging

| Dimension               | Value                                                                   |
| ----------------------- | ----------------------------------------------------------------------- |
| **Log location**        | `{userData}/logs/forge-{YYYY-MM-DD}.log` via `app.getPath('userData')`  |
| **Format**              | Structured JSON, one object per line (JSONL)                            |
| **Rotation**            | Daily log files; retain last 30 days; max 50MB per file before rotation |
| **Remote transmission** | None — no data sent without explicit user opt-in                        |

### Log Format

```json
{
  "ts": "2026-07-02T12:34:56.789Z",
  "level": "ERROR",
  "component": "ArtifactEngine",
  "msg": "SQLite write failed",
  "artifactId": "art-abc123",
  "error": "SQLITE_FULL",
  "details": "disk quota exceeded at path /Users/..."
}
```

---

## Log Levels

| Level   | When Used                                                                                   | Persisted Always?                              |
| ------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `ERROR` | Unexpected failures, SQLite errors, domain invariant violations, unhandled IPC exceptions   | ✅ Always                                      |
| `WARN`  | Gate overrides by user, near-limit conditions, deprecated usage patterns                    | ✅ Always                                      |
| `INFO`  | App startup/shutdown, Initiative lifecycle events, artifact approvals, AI sessions captured | ✅ Always                                      |
| `DEBUG` | IPC call trace, SQL query timing, AI prompt size, performance measurements                  | ❌ Only when debug mode is enabled in Settings |

---

## Key Events to Log

### Application Lifecycle

| Event                          | Level | Details                                                  |
| ------------------------------ | ----- | -------------------------------------------------------- |
| App started                    | INFO  | Forge version, Electron version, db path, schema version |
| SQLite database opened         | INFO  | Path, schema version, migration count applied            |
| Schema migration applied       | INFO  | Migration version, duration                              |
| App shutdown (clean)           | INFO  | Uptime duration                                          |
| App crash (uncaught exception) | ERROR | Stack trace, last known state                            |

### Initiative & Artifact Events

| Event                                 | Level | Details                                           |
| ------------------------------------- | ----- | ------------------------------------------------- |
| Initiative created                    | INFO  | initiativeId, name                                |
| Initiative archived / deleted         | INFO  | initiativeId                                      |
| Artifact approved                     | INFO  | artifactId, type, initiativeId                    |
| Artifact approval gate overridden     | WARN  | artifactId, blockedBy[], reason: "user-confirmed" |
| Artifact set to NeedsReview (cascade) | INFO  | artifactId, triggeredByArtifactId                 |
| ADR accepted                          | INFO  | adrId, seqNumber, initiativeId                    |
| Domain invariant violation attempted  | WARN  | rule, entityId, details                           |

### AI & Integration Events

| Event                   | Level | Details                                           |
| ----------------------- | ----- | ------------------------------------------------- |
| AI generation started   | INFO  | artifactId, provider, promptTokenEstimate         |
| AI generation completed | INFO  | artifactId, durationMs, responseTokenEstimate     |
| AI generation failed    | ERROR | artifactId, errorCode, message (API key REDACTED) |
| AI session captured     | INFO  | sessionId, artifactId, status                     |
| GitHub push attempted   | INFO  | taskId, repository                                |
| GitHub push succeeded   | INFO  | taskId, issueNumber                               |
| GitHub push failed      | ERROR | taskId, errorCode, message                        |

---

## Debug Mode

When debug mode is enabled in Settings, the following are additionally logged at `DEBUG` level:

```json
{ "level": "DEBUG", "component": "IPC", "msg": "invoke", "channel": "artifact:approve", "args": { "artifactId": "..." } }
{ "level": "DEBUG", "component": "LocalSQLiteAdapter", "msg": "query", "sql": "SELECT ...", "durationMs": 3 }
{ "level": "DEBUG", "component": "SearchIndex", "msg": "FTS5 query", "query": "architecture", "resultCount": 8, "durationMs": 47 }
{ "level": "DEBUG", "component": "AIOrchestrator", "msg": "prompt built", "tokenEstimate": 1240, "contextArtifacts": 3 }
```

---

## Debugging a User-Reported Issue

Since Forge has no remote telemetry, the debugging workflow for a user-reported problem is:

```
1. User reports issue
2. In Forge Settings → "Export diagnostic log"
   → Forge packages the last 3 days of forge-*.log files into a zip
   → User shares the zip with the developer
3. Developer opens zip, searches JSON log for ERROR/WARN entries near the reported time
4. Reproduce using artifact IDs, operation sequence, and error codes from the log
5. Fix and verify using the same sequence
```

---

## Performance Logging (Debug Mode)

Critical operation timing is logged when debug mode is on:

| Operation                       | Expected  | Alert threshold    |
| ------------------------------- | --------- | ------------------ |
| Artifact load (from SQLite)     | < 50ms    | > 200ms → log WARN |
| Full-text search query (FTS5)   | < 100ms   | > 500ms → log WARN |
| Artifact content auto-save      | < 10ms    | > 100ms → log WARN |
| AI generation (full round-trip) | < 30s p95 | > 30s → log WARN   |
| Initiative export (full)        | < 5s      | > 15s → log WARN   |

---

## No Remote Observability in v1

| Capability                            | v1 Status         | When to add                               |
| ------------------------------------- | ----------------- | ----------------------------------------- |
| Remote error reporting (e.g., Sentry) | ❌ Not included   | v2 if user opts in; requires consent UI   |
| Usage analytics                       | ❌ Not included   | v2 if user opts in; GDPR consent required |
| Crash reporting                       | ❌ Not included   | v2 if user opts in                        |
| Uptime monitoring                     | ❌ Not applicable | Local app — no server to monitor          |

> **Standing rule:** No telemetry is added without: (1) explicit user opt-in in Settings, (2) clear disclosure of what is collected, and (3) a working opt-out that permanently disables collection.
