<!-- Source: high-end-visual-design skill | Phase 9 | Date: 2026-07-02 -->
<!-- Last updated: 2026-07-02 -->

# Visual Enhancement (Agency-Tier)

This document details the high-end UI/UX polish applied over the base Industrial Utilitarian design system. Forge avoids generic B2B SaaS aesthetics by strictly adhering to the **Absolute Zero Directive**.

---

## 1. The Absolute Zero Directive

To maintain a premium, expensive engineering environment feel, the following patterns are **banned** in Forge's UI codebase:

- ❌ **Banned Fonts:** Inter, Roboto, Arial, Open Sans. (Use only `Space Grotesk`, `IBM Plex Sans`, and `JetBrains Mono`).
- ❌ **Banned Icons:** Generic thick-stroked icons like FontAwesome or default Material. (Use only `lucide-react` with `strokeWidth={1.5}`).
- ❌ **Banned Borders/Shadows:** Standard `1px solid gray` borders and dark drop shadows (`shadow-md`, `rgba(0,0,0,0.3)`). We use crisp hairlines and inset highlights.
- ❌ **Banned Layouts:** Symmetrical 3-column Bootstrap-style grids without massive whitespace gaps.
- ❌ **Banned Motion:** Standard `linear` or `ease-in-out` transitions. All motion uses custom physics (see below).

---

## 2. Creative Engine

### Vibe & Texture: Ethereal Glass
- **Background:** Deepest OLED black (`#050505`).
- **Cards:** Vantablack cards with heavy `backdrop-blur-2xl` and pure `white/10` hairline borders.
- **Atmosphere:** Deep, focused, high-contrast, with subtle glowing accents (Electric Amber `#F59E0B`).

### Layout Archetype: The Asymmetrical Bento
The Initiative Home view uses a masonry-style CSS Grid to break visual monotony.
- Cards span variable columns (`col-span-8`, `col-span-4`) based on content importance, not strict symmetry.
- **Mobile Fallback:** Below `768px`, this aggressively collapses to a single-column stack (`grid-cols-1`) with generous gaps (`gap-6`).

---

## 3. Component Architecture (Doppelrand)

### The "Double-Bezel"
Major panels (Editor, Graph, Sidebar) do not sit flatly. They use nested enclosures to mimic physical, machined hardware:

- **Outer Shell:** `<div className="p-1.5 bg-white/5 ring-1 ring-white/10 rounded-xl">`
- **Inner Core:** `<div className="bg-[#0A0A0A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-[calc(0.75rem-0.375rem)]">`

This creates a concentric corner radius and depth without relying on drop shadows.

### Nested CTA "Island" Buttons
Primary buttons are pill-shaped (`rounded-full px-6 py-3`). If a button has a trailing icon (like an arrow), the icon sits inside its own distinct circular wrapper flush against the right padding:

```jsx
<button className="rounded-full bg-forge-accent text-black flex items-center pr-1 pl-6 py-1">
  <span>Execute</span>
  <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center ml-4">
    <ArrowRight size={16} />
  </div>
</button>
```

---

## 4. Fluid Motion Choreography

All transitions simulate real-world mass and spring physics.

### A. Custom Easing
```css
/* tailwind.config.js extension */
theme: {
  extend: {
    transitionTimingFunction: {
      'forge': 'cubic-bezier(0.32,0.72,0,1)'
    }
  }
}
```
All transitions use this curve (e.g., `transition-all duration-500 ease-forge`).

### B. Magnetic Hover Physics
Interactive elements possess kinetic tension:
- `active:scale-[0.98]` on buttons to simulate physical pressing.
- `group-hover:translate-x-1 group-hover:-translate-y-[1px]` on nested button icons.

### C. Scroll Entry Interpolation
When components mount (e.g., switching tabs, opening an artifact), they do not appear statically. They execute a heavy fade-up:
- Initial: `translate-y-8 blur-sm opacity-0`
- Final: `translate-y-0 blur-0 opacity-100`

---

## 5. Performance Guardrails

- **GPU-Safe Animation:** Animate exclusively via `transform` and `opacity`. Never animate `width`, `height`, `margin`, or `top`/`left`.
- **Blur Constraints:** `backdrop-blur` is restricted to fixed/sticky elements (modals, context menus, navbars). Never apply blur filters to scrolling containers.
- **Z-Index:** Restricted strictly to system layers (`z-10` sticky, `z-40` overlay, `z-50` modal).
