---
paths:
  - "wrkly-web/src/components/**/*.tsx"
  - "wrkly-web/src/app/**/*.tsx"
  - "wrkly-web/src/app/**/*.ts"
  - "wrkly-web/src/hooks/**/*.ts"
  - "wrkly-web/src/stores/**/*.ts"
---

# Frontend Rules — Wrkly Web

## Components
- Functional components + hooks only — no class components
- One component per file, colocated with its feature folder
- All interactive elements MUST have unique `id` attributes for testing
- Use `cn()` from `lib/utils` for conditional Tailwind classes
- Use `next/image` for all images — never raw `<img>`

## State Management
- **Zustand** for global/persistent state (`stores/auth-store.ts`, `stores/ui-store.ts`)
- **TanStack React Query** for all server data fetching and cache
- Never prop-drill more than 2 levels — use Zustand or context instead
- Never store server data in Zustand — that goes in React Query cache

## Styling
- Tailwind CSS utility classes — dark mode first
- Use CSS custom properties for colors: `hsl(var(--primary))`, `hsl(var(--background))`
- Never hardcode hex/rgb colors — always use token variables
- Responsive: mobile-first with `sm:`, `md:`, `lg:` breakpoints
- Animations: use CSS transitions (0.2s ease), framer-motion for complex ones

## TypeScript
- **No `any`** types — use `unknown` + type guards, or define proper interfaces
- Use `type` imports: `import type { X } from 'y'`
- Define prop types inline or with `interface XProps {}`
- API response types go in `types/` directory

## Imports
- `@/components/...` for components
- `@/lib/...` for utilities and API client
- `@/hooks/...` for custom hooks
- `@/stores/...` for Zustand stores
- `@/types/...` for shared types

## Brand Assets
- All SVG logos in `public/brand/`
- Use the `<Logo>` component from `components/ui/logo.tsx` — it handles dark/light switching
- Pixel-grid design language: blue→indigo→violet gradient, glass highlights
