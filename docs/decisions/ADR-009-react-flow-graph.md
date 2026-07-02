<!-- Source: system-design skill | Phase 6 decisions | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->
<!-- Status: ✅ Accepted -->

# ADR-009: React Flow for Engineering Graph Visualisation

**Status:** ✅ Accepted  
**Date:** 2026-07-02  
**Resolves:** Q2, Q7 (open questions from Phase 6 system design)

---

## Purpose

Select the graph visualisation library for Forge's engineering graph view, and define the scope of what constitutes a node in the graph.

---

## Context

Forge's engineering graph (US-9.1) is a core differentiator — it makes the traceability between all engineering artifacts visible and navigable. The graph must:
- Render 20–200+ nodes with typed directed edges
- Be interactive: click a node to open the artifact, drag to reposition
- Display node type, status, and relationship labels
- Integrate cleanly with React (renderer process)
- Support zooming, panning, and minimap navigation

**Q7 was also resolved here:** Every entity type is a first-class node in the graph — Artifacts (Vision, Requirements, Architecture, System Design), ADRs, Tasks, and AI Sessions. This is consistent with the engineering knowledge graph vision and the `artifact_relationships` table design, which already uses generic `source_id` and `target_id` that can reference any entity.

---

## Decision

Use **React Flow** (`reactflow`) as the engineering graph visualisation library.

**Graph node scope (Q7):** All entity types are nodes — Artifacts, ADRs, Tasks, and AI Sessions — connected by typed directed edges from the `artifact_relationships` table.

**Node visual design:**
- Each node type has a distinct visual style (color, icon, shape)
- Node status is reflected in the node border/badge (Draft: grey, Approved: green, NeedsReview: amber)
- Edge labels display the relationship type (DerivedFrom, InformedBy, DecidedBy, etc.)

---

## Alternatives

| Alternative | Why Rejected |
|-------------|-------------|
| **d3-force** | Powerful but requires building all React integration from scratch. No built-in node/edge component system. High implementation cost for equivalent UX. |
| **elkjs** (Eclipse Layout Kernel) | Excellent automatic layout algorithms, but designed as a pure layout engine — requires a separate rendering layer. More suitable for static diagrams than interactive graphs. |
| **Cytoscape.js** | Feature-rich but not React-native. Requires DOM manipulation outside React's rendering model, leading to state sync issues. |
| **Vis.js Network** | jQuery-era API, poor React integration, limited TypeScript support. |

---

## Consequences

✅ React-native — nodes and edges are React components; status updates flow through React state naturally.  
✅ Built-in pan, zoom, minimap, background patterns, and connection handles.  
✅ Handles 200+ nodes with acceptable performance via React Flow's virtualisation.  
✅ Active maintenance and strong TypeScript support.  
✅ Custom node components allow per-type visual design (different cards for Artifacts, ADRs, Tasks, AI Sessions).  
⚠️ React Flow's auto-layout is basic — for complex graphs with 100+ nodes, a layout algorithm (`dagre` or `elkjs`) should be applied to position nodes automatically. Integrate `@dagrejs/dagre` as the layout engine for the directed graph.  
⚠️ React Flow is MIT-licensed for open-source; the Pro version is required for advanced features (multi-page, custom viewport). Forge's use case is covered by the free tier.

---

## Graph Schema Implication (Q7)

The decision that "everything is a node" has one schema consequence: the `artifact_relationships` table's `source_id` and `target_id` columns must be able to reference entities from multiple tables (`artifacts`, `adrs`, `tasks`, `ai_sessions`). The current schema already supports this — IDs are opaque UUIDs and the foreign key constraints are intentionally generic.

**GraphService must handle:**
- Fetching nodes from all four entity tables for a given Initiative
- Merging them into a unified node list for React Flow
- Mapping `artifact_relationships` rows to React Flow edge objects

---

## Future Considerations

- **Auto-layout:** Integrate `@dagrejs/dagre` to compute a clean directed graph layout on first render and after relationship changes.
- **Filtering:** Allow users to filter the graph by node type (show only Requirements + Tasks, hide AI Sessions). This is a UI toggle — the underlying data model doesn't change.
- **Focus mode:** Click a node to show only its immediate neighbours — reducing visual complexity for large Initiatives.
- **Export graph as SVG/PNG:** React Flow supports this natively via `toSvg()` / `toJpeg()` from `html-to-image`.
