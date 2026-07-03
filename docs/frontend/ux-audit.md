<!-- Source: ux-audit skill | Phase 10 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# UX Audit & Remediation

This document captures the usability guardrails established by evaluating Forge's architecture against Nielsen's heuristics, tailored for an expert-level engineering tool.

These rules must be followed during React implementation (Phase 11).

---

## 1. User Control: Undo History in AI Sessions

**Heuristic:** User Control and Freedom

When the AI Assistant applies code or text changes optimistically to the CodeMirror Editor pane, the user must have a seamless way to back out if the AI hallucinates.

**Implementation Rule:**

- Ensure the CodeMirror `history()` extension tracks AI edits as a single transaction.
- `Cmd/Ctrl+Z` must revert the AI change instantly.
- **UI Guard:** In the AI Chat pane, generated text must have explicit "Apply" and "Discard" buttons before modifying the main editor.

---

## 2. Efficiency: Global Command Palette

**Heuristic:** Flexibility and Efficiency of Use

Engineers prefer keeping hands on the keyboard. Relying solely on the Asymmetrical Bento layout and Graph View for navigation causes friction.

**Implementation Rule:**

- Implement a global Command Palette bound to `Cmd/Ctrl+K`.
- Capabilities: Jump to Initiative, Open Artifact by name, Trigger common AI commands.

---

## 3. Visibility: IPC Latency Handling

**Heuristic:** Visibility of System Status

While SQLite IPC calls are near-instant (<5ms), AI provider calls take 2-15 seconds. The UI must never freeze or appear broken during an AI generation.

**Implementation Rule:**

- Use a skeleton loader (`animate-pulse bg-white/5`) in the target container during generation.
- The global Status Bar must display `AI: Generating [Provider]...` with a pulsing Electric Amber dot.
- Disable the triggering button and show a spinner to prevent duplicate generation requests.

---

## 4. Error Prevention: Destructive Actions

**Heuristic:** Error Prevention

The SQLite schema enforces strict referential integrity (e.g., `ON DELETE RESTRICT` for Requirements with Tasks). If a user attempts an invalid deletion, SQLite will throw an error via IPC.

**Implementation Rule:**

- Do not rely on backend SQL errors for UX.
- The UI (via Zustand) must intercept the delete action, check for dependencies locally, and present a warning modal _before_ making the IPC call.
- _Example:_ "Cannot delete 'User Auth Requirement'. It has 3 dependent Tasks. Delete or reassign the tasks first."

---

## 5. Help & Recovery: Empty States

**Heuristic:** Help and Documentation / Empty States

Creating a new Initiative scaffolds empty artifact slots (Vision, Requirements, etc.). An entirely black text editor screen causes blank-page paralysis.

**Implementation Rule:**

- Empty artifacts must display a ghosted template placeholder (`text-forge-muted`).
- Example for System Design: `// Describe the system context here...`
- Provide a prominent "Generate Draft with AI" primary action button in the center of the empty state.

---

## 6. Recognition: Local Graph Context

**Heuristic:** Recognition rather than Recall

When editing a specific Artifact in the CodeMirror view, the user loses visual context of the Graph dependencies. They shouldn't have to switch back to the React Flow view to remember what this artifact affects.

**Implementation Rule:**

- Provide a "Local Context" minimap or list in the right sidebar (when AI Chat is not active).
- This list shows immediate upstream (InformedBy) and downstream (DecidedBy) dependencies (1 level deep) for the active artifact.
