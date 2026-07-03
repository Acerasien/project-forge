<!-- Source: frontend-design skill | Phase 8 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Frontend Design System

Forge is a serious engineering workspace, not a generic B2B SaaS. The design aesthetic is **Industrial Utilitarian**.

It takes visual cues from terminal multiplexers (tmux), CAD software, and Bloomberg terminals. The interface relies on strict geometric divisions, high-contrast monospace metadata, and highly legible reading text rather than soft drop shadows and rounded floating cards.

---

## Typography System

A strict 3-tier typographic system to separate structure, reading, and data.

| Role             | Font Family      | Purpose                                                             | Weights  |
| ---------------- | ---------------- | ------------------------------------------------------------------- | -------- |
| **Display**      | `Space Grotesk`  | Headings, App titles, high-impact labels. Expressive and geometric. | 500, 700 |
| **Body/Reading** | `IBM Plex Sans`  | Markdown content, task descriptions. Utilitarian, highly legible.   | 400, 500 |
| **Data/Code**    | `JetBrains Mono` | Code blocks, timestamps, metadata, status labels, tags.             | 400      |

_No default system fonts (Inter, Roboto, Arial) are used in the application UI._

---

## Color Palette (Dark Mode Native)

The app is exclusively dark mode. It uses deep cool slates with a single high-visibility accent color.

| Name                   | Hex Code  | Tailwind Variable     | Usage                                                       |
| ---------------------- | --------- | --------------------- | ----------------------------------------------------------- |
| **App Background**     | `#0F1115` | `bg-forge-bg`         | Main window background, behind panels                       |
| **Panel Surface**      | `#1A1D24` | `bg-forge-panel`      | Editor areas, sidebar, graph background                     |
| **Structural Borders** | `#2D323E` | `border-forge-border` | Strict 1px grid divisions between all panes                 |
| **Primary Text**       | `#F1F5F9` | `text-forge-text`     | All readable body text                                      |
| **Muted Text**         | `#94A3B8` | `text-forge-muted`    | Metadata, timestamps, inactive tabs                         |
| **Accent (Action)**    | `#F59E0B` | `text-forge-accent`   | Electric Amber. Active states, focus rings, primary buttons |

### Status Colors

- **Approved / Done:** `#10B981` (Emerald)
- **Needs Review / Blocked:** `#EF4444` (Rose)
- **Draft / Todo:** `#94A3B8` (Muted Slate)

---

## Spatial Composition

### The Grid

- The UI is composed of edge-to-edge panels.
- Panels are separated by strict **1px solid borders** (`border-forge-border`).
- **Zero drop shadows.** Depth is conveyed through background color steps (App Background vs Panel Surface) and crisp border boundaries.
- **Border Radius:** `rounded-sm` (2px) for interactive elements like buttons/inputs. Panels have `0px` radius (flush edge-to-edge).

### Spacing Rhythm

- **Dense Data (Sidebar, Lists):** `p-2` or `p-3`. Information density is high, like an IDE.
- **Reading Views (Artifact Editor):** Distraction-free reading width. `p-8` with a `max-w-[65ch]` container centered in the pane.

---

## Motion Philosophy

Motion is utilitarian, instant, and structural.

- **Speed:** Maximum 150ms transitions (`duration-150 ease-in-out`).
- **Hover States:** Background color shifts (`hover:bg-slate-800`) or border color highlights (`hover:border-forge-accent`).
- **Prohibited:** No bouncy scaling (`hover:scale-105`), no decorative micro-motion spam. Elements do not move unless the layout is changing.

---

## Icons

- **Library:** `lucide-react`
- **Rules:** Consistent stroke width (`strokeWidth={2}`). No emojis used as UI icons. Brand logos (e.g., GitHub, React) must use official SVG paths.
