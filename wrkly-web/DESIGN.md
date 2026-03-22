# Wrkly Design System

## 1. Spacing (8px Base Grid)
- **Base Grid**: 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64
- **Tailwind Mapping**: `gap-1` (4px), `gap-2` (8px), `gap-3` (12px), `gap-4` (16px), `gap-5` (20px), `gap-6` (24px), `gap-8` (32px), `gap-10` (40px), `gap-12` (48px)
- **Page-level horizontal padding**: `px-6` (24px) desktop, `px-4` (16px) mobile
- **Section spacing**: `py-12` to `py-16` between major sections
- **Card internal padding**: `p-4` (16px) or `p-5` (20px) — consistent use

## 2. Border Radius
| Element | Radius | Tailwind |
| --- | --- | --- |
| Buttons, inputs, badges | 10px | `rounded-[10px]` |
| Cards, panels, modals, dropdowns | 12px | `rounded-xl` |
| Avatars, icon containers | Full circle | `rounded-full` |
| Tooltips, toasts | 8px | `rounded-lg` |
| Page-level containers | 16px | `rounded-2xl` |
*Rule: Never mix `rounded-md` and `rounded-xl` on same-level elements.*

## 3. Typography (Inter)
| Role | Size | Weight | Tailwind |
| --- | --- | --- | --- |
| Page title (H1) | 28px | 600 | `text-[28px] font-semibold leading-tight` |
| Section heading (H2) | 22px | 600 | `text-[22px] font-semibold` |
| Card title (H3) | 16px | 600 | `text-base font-semibold` |
| Subtitle / description | 14px | 400 | `text-sm font-normal` |
| Body text | 14px | 400 | `text-sm` |
| Small / caption | 12px | 500 | `text-xs font-medium` |
| Tiny label | 11px | 500 | `text-[11px] font-medium` |
| Button text | 14px | 500 | `text-sm font-medium` |
| Input text | 14px | 400 | `text-sm` |
| Code / mono | 13px | 400 | `text-[13px] font-mono` |
*Rules: No font-bold (max 600). Max size 28px inside app. All caps ONLY for tiny labels (uppercase tracking-wider).*

## 4. Iconography
- **Library**: `lucide-react` ONLY
- **Sizes**: 16px inline, 20px standalone, 48px empty states.
- **Color**: Inherits text color.

## 5. Dual Theme Color System (globals.css mappings)
- **Primary**: indigo-blue (`#4F6AF6` area) for active states, focus rings.
- **Accent**: violet for AI features, premium indicators.

| Role | Light Mode Vibe | Dark Mode Vibe |
| --- | --- | --- |
| Backgrounds | Warm-white | Deep navy/slate (NOT pure black) |
| Cards | White (shadows for depth) | Lighter than page (no shadows, borders for depth) |
| Text | Slate tones | Off-white |
| Borders | Light barely-visible | Visible subtle borders |

## 6. Layout Architecture
- **Sidebar**: 256px fixed, collapsible to 64px, slide-out drawer on mobile (<768px)
- **Top bar**: 56px, breadcrumb left, search/bell/avatar right
- **Main content**: full remaining width, `max-w-7xl` for settings, full width for board view

## Component Rules
- **Buttons**:
  - Primary: `bg-primary text-primary-foreground` + hover darken + 10px radius
  - Secondary: `bg-muted text-foreground` + hover darken + 10px radius
  - Ghost: Transparent + `text-foreground-secondary` + hover bg
  - Height Default: 36px, `px-4`.
- **Inputs**: 40px height, `border-input`, 10px radius, focus `ring-2 ring-ring ring-offset-2 ring-offset-background`
- **Cards**: `bg-card border border-border`, 12px radius. Hover: `bg-card-hover border-border-hover`
- **Badges/Pills**: 22px height, 6px radius, `px-2`, 11px font-medium uppercase
- **Loading**: Skeleton `bg-muted animate-pulse`. Spinner `border-primary` 20px.

## DO NOT
- Use hardcoded colors (`bg-white`, `bg-black`, `bg-slate-900`)
- Use glowing, neon, blur, glassmorphism.
- Break the 8px spacing grid.
