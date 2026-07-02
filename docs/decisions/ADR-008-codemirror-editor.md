<!-- Source: system-design skill | Phase 6 decisions | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->
<!-- Status: ✅ Accepted -->

# ADR-008: CodeMirror 6 as Artifact Editor Component

**Status:** ✅ Accepted  
**Date:** 2026-07-02  
**Resolves:** Q1 (open question from Phase 6 system design)

---

## Purpose

Select the rich text / code editing component for artifact content authoring — the primary input surface in Forge.

---

## Context

Forge artifacts (Vision, Requirements, Architecture, System Design) contain long-form structured text that may include Markdown, diagrams (Mermaid), and code snippets. The editor must:
- Handle large documents efficiently (50,000+ words for System Design)
- Render Markdown with syntax highlighting
- Remain performant in Electron's renderer process
- Be extensible for future features (inline AI suggestions, collaborative cursors in v2)
- Be TypeScript-native

---

## Decision

Use **CodeMirror 6** as the artifact content editor throughout Forge.

**Key CodeMirror 6 features leveraged:**
- Virtual DOM-free rendering — only visible content is painted; handles large documents without performance degradation
- First-class Markdown support via `@codemirror/lang-markdown`
- Extension system — inline AI suggestion ghost text, custom keybindings, and linting rules can be added as extensions
- Tree-sitter-based syntax tree — enables structured editing and future AI context extraction
- Framework-agnostic core with a React wrapper (`@uiw/react-codemirror`)

---

## Alternatives

| Alternative | Why Rejected |
|-------------|-------------|
| **Monaco Editor** (VS Code's editor) | Larger bundle size (~4MB vs ~800KB for CodeMirror 6 with extensions). Monolithic architecture — harder to tree-shake. VS Code integration is a feature irrelevant to Forge's context. |
| **Tiptap** (ProseMirror-based WYSIWYG) | Excellent WYSIWYG but abstracts away raw Markdown — Forge needs the source Markdown to be the artifact content for export fidelity. |
| **Quill** | Older architecture, limited TypeScript support, poorer performance on large documents. |
| **`<textarea>`** | Trivial to implement but no syntax highlighting, poor performance on large content, no extensibility path for AI features. |

---

## Consequences

✅ Efficient rendering of large artifact content — only the visible viewport is rendered.  
✅ Markdown + Mermaid syntax highlighting out of the box via language extensions.  
✅ Extension API provides a clean path for: inline AI ghost text, custom linting, collaborative cursors (v2).  
✅ Smaller bundle footprint than Monaco (~800KB base vs ~4MB).  
⚠️ CodeMirror 6's extension API has a steep learning curve compared to simpler editors. Initial setup requires more boilerplate than `<textarea>`.  
⚠️ The React wrapper (`@uiw/react-codemirror`) is a community package — monitor for maintenance health.

---

## Future Considerations

- **Inline AI suggestions:** Implement as a CodeMirror 6 decoration extension — ghost text visible inline as the user types, accepted with Tab. This is a v2 feature.
- **Mermaid live preview:** Render Mermaid blocks as previews in a split-pane view alongside the editor. Mermaid's JS library can be loaded lazily.
- **Collaborative editing (v2+):** CodeMirror 6's extension API supports Y.js CRDT-based collaborative cursors if team collaboration is introduced.
