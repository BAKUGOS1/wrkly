# DESIGN.md — Wrkly Design System
> ⚠️ **READ-ONLY REFERENCE** — Auto-generated from the Stitch "Wrkly Design System" project.
> Do not edit manually. Re-generate via the Stitch MCP when the design system changes.

---

## Design Identity: "Lucid Curator"

The Wrkly design language is called **Lumina Workspace**. It treats every UI element as deliberate content — editorial scale, breathing room, and tonal depth over hard borders.

**Creative North Star:**
- **Depth over Dividers** — use tonal surface shifts and glassmorphism, not 1px borders
- **Editorial Scale** — large display headings contrast with small metadata labels
- **Organic Rigor** — rounded corners (8–24px) that feel approachable but precise

---

## Color Tokens

All colors are defined as CSS custom properties in `globals.css` and referenced in `tailwind.config.ts`.

### Stitch Named Colors → CSS Variables

| Token | CSS Variable | Hex Value | Usage |
|---|---|---|---|
| `primary` | `--wrkly-primary` | `#4a40e0` | CTAs, active states, links |
| `primary-container` | `--wrkly-primary-container` | `#9795ff` | Gradient end, highlighted bg |
| `primary-dim` | `--wrkly-primary-dim` | `#3d30d4` | Hover on primary |
| `secondary` | `--wrkly-secondary` | `#00628c` | Accent, links, info states |
| `secondary-container` | `--wrkly-secondary-container` | `#a4d8ff` | Info badge bg |
| `tertiary` | `--wrkly-tertiary` | `#6a37d4` | Decorative accents, tags |
| `tertiary-container` | `--wrkly-tertiary-container` | `#bda2ff` | Tertiary badge bg |
| `surface` | `--wrkly-surface` | `#faf4ff` | Page/app background |
| `surface-container-low` | `--wrkly-surface-low` | `#f5eeff` | Sidebar, secondary panels |
| `surface-container` | `--wrkly-surface-container` | `#ede4ff` | Section backgrounds |
| `surface-container-high` | `--wrkly-surface-high` | `#e8deff` | Input fields, hover bg |
| `surface-container-highest` | `--wrkly-surface-highest` | `#e2d7ff` | Interactive cards, badges |
| `surface-container-lowest` | `--wrkly-surface-lowest` | `#ffffff` | Floating modals, popovers |
| `surface-dim` | `--wrkly-surface-dim` | `#dacdff` | Dividers, subtle separators |
| `on-surface` | `--wrkly-on-surface` | `#32294f` | Primary text (never pure black) |
| `on-surface-variant` | `--wrkly-on-surface-variant` | `#5f557f` | Secondary/muted text |
| `on-primary` | `--wrkly-on-primary` | `#f4f1ff` | Text on primary buttons |
| `on-secondary` | `--wrkly-on-secondary` | `#e9f4ff` | Text on secondary elements |
| `outline` | `--wrkly-outline` | `#7b719c` | Visible borders (e.g. inputs) |
| `outline-variant` | `--wrkly-outline-variant` | `#b2a6d5` | Ghost/subtle borders |
| `error` | `--wrkly-error` | `#b41340` | Error states |
| `inverse-surface` | `--wrkly-inverse-surface` | `#10062d` | Tooltips, dark toasts |
| `inverse-on-surface` | `--wrkly-inverse-on-surface` | `#a296c4` | Text on dark toasts |

### Overridden Brand Colors (applied on top of Stitch defaults)

| Purpose | Hex |
|---|---|
| Primary action | `#4F46E5` (Stitch override) |
| Secondary accent | `#0EA5E9` (Stitch override) |
| Tertiary accent | `#8B5CF6` (Stitch override) |

---

## Typography

### Font Families

| Role | Font | CSS |
|---|---|---|
| Headlines | **Manrope** | `font-family: 'Manrope', sans-serif` |
| Body / Interface | **Inter** | `font-family: 'Inter', sans-serif` |
| Labels / Metadata | **Inter** | `font-family: 'Inter', sans-serif` |

### Scale

| Token | Size | Weight | Usage |
|---|---|---|---|
| `display-lg` | `3.5rem` (56px) | 800 | Empty states, welcome screens |
| `title-lg` | `1.375rem` (22px) | 700 | Page headers |
| `title-md` | `1rem` (16px) | 600 | Section headers, card titles |
| `body-md` | `0.875rem` (14px) | 400 | Body text |
| `body-sm` | `0.75rem` (12px) | 400 | Small descriptions |
| `label-sm` | `0.6875rem` (11px) | 500 | Metadata, UPPERCASE + 0.05em tracking |

---

## Surface Hierarchy (The Layering Principle)

Treat UI as a physical stack of paper/frosted glass. Never use raw borders to define sections.

```
Page Base:          --wrkly-surface         (#faf4ff)
Sidebar / Panels:   --wrkly-surface-low     (#f5eeff)
Sections:           --wrkly-surface-container (#ede4ff)
Input Fields:       --wrkly-surface-high    (#e8deff)
Cards:              --wrkly-surface-highest (#e2d7ff) + bg-white for floating cards
Modals:             --wrkly-surface-lowest  (#ffffff) + backdrop-blur-xl
```

---

## Component Patterns

### Buttons

| Variant | Background | Text Color | Border |
|---|---|---|---|
| Primary | `linear-gradient(135deg, #4a40e0, #9795ff)` | `--wrkly-on-primary` | None |
| Secondary | `--wrkly-surface-highest` | `--wrkly-primary` | None |
| Tertiary | Transparent | `--wrkly-on-surface-variant` | None |
| Destructive | `--wrkly-error` | white | None |

**Radius:** `rounded-xl` (1rem) for all buttons.

### Cards

- Background: `--wrkly-surface-lowest` (#ffffff)
- Border radius: `rounded-2xl` (1.5rem)
- Shadow: `0px 4px 40px rgba(50, 41, 79, 0.06)` — tinted with `--wrkly-on-surface` at 6% opacity
- No hard borders. Use `--wrkly-outline-variant` at 15% opacity if needed for accessibility.

### Input Fields

- Default background: `--wrkly-surface-high`
- Focus background: `--wrkly-surface-lowest`
- Focus ring: `--wrkly-primary` ghost border at 1px
- Radius: `rounded-xl` (0.75rem)
- Label: `label-sm` style (see Typography)

### Labels / Badges

- Background: `--wrkly-surface-highest`
- Text: `--wrkly-on-surface-variant`
- Radius: `rounded-full`
- Priority colors:
  - High: `#ef4444` (red)
  - Medium: `#f59e0b` (amber)
  - Low: `#10b981` (green)

### Navigation Sidebar

- Background: `--wrkly-surface-low`
- Active item: `--wrkly-primary` accent left border + `--wrkly-surface-container` bg
- No border between sidebar and content — tonal shift defines the edge

### Top Bar / App Header

- Background: `--wrkly-surface-lowest` at 70% opacity + `backdrop-blur-xl`
- Height: `56px`
- Glassmorphism effect for floating feel

---

## Gradient Definitions

```css
/* Primary CTA gradient */
--gradient-primary: linear-gradient(135deg, #4a40e0, #9795ff);

/* Secondary accent */
--gradient-secondary: linear-gradient(135deg, #00628c, #a4d8ff);

/* Tertiary / decorative */
--gradient-tertiary: linear-gradient(135deg, #6a37d4, #bda2ff);

/* Hero left panel (auth screen) */
--gradient-hero: linear-gradient(135deg, #10062d, #4a40e0 60%, #9795ff);
```

---

## Spacing Scale

Uses Tailwind's default spacing scale with `spacing-scale: 2` from Stitch.

| Use | Tailwind Class | px |
|---|---|---|
| Tight (metadata gap) | `gap-1` | 4px |
| Component padding | `p-4` | 16px |
| Section spacing | `p-6` | 24px |
| Top-level section margin | `my-24` | 96px |

---

## Animation & Transitions

- **Default transition:** `transition-all duration-200 ease-in-out`
- **Button hover:** `scale-[1.01]` + lighten background
- **Card hover:** `translateY(-2px)` + expand shadow
- **Sidebar collapse:** `w-transition duration-300`
- **Modal open:** `opacity-0 → opacity-100` + `scale-95 → scale-100` at `ease-out 150ms`

---

## The "No-Line" Rule

> Designers are **prohibited** from using 1px solid borders to section off major UI areas.

Instead:
- Use background shifts (e.g. `wrkly-surface-low` for sidebar vs `wrkly-surface` for content)
- For subtle edges: `wrkly-outline-variant` at **15% opacity** max — "a suggestion, not a wall"
- For floating elements: `box-shadow` tinted with `--wrkly-on-surface` at 6% opacity

---

## Dark Mode

> 🚧 **Not yet designed in Stitch.** When designed, extend this file with dark mode tokens.

Current fallback: `globals.css` dark mode uses existing shadcn/ui slate palette. Update to Wrkly tokens once Stitch includes dark mode variants.

---

## Stitch Project Reference

| Field | Value |
|---|---|
| Project Name | Wrkly Design System |
| Project ID | `2496191551689222532` |
| Design System Name | Lumina Workspace |
| Primary Stitch Color | `#4F46E5` |
| Font (Headline) | Manrope |
| Font (Body) | Inter |
| Roundness | 8px base |
| Color Mode | Light |
