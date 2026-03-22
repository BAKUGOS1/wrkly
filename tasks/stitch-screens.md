# Stitch Screen Registry — Wrkly

> Track all Stitch-designed screens and their implementation status.
> Update this file as screens move: **Designed → In Progress → Built → Verified**

**Stitch Project ID:** `2496191551689222532`
**Stitch Project Name:** Wrkly Design System

---

| Screen Name | Stitch Screen ID | Route | Status |
|---|---|---|---|
| Login / Sign Up | `acc251060bb34bdaaabba67f154ca406` | `/design/login` | Built |
| Workspace Dashboard | `78bdb7819d5546818fffeb3d9cbb42c7` | `/design/workspace` | Built |
| Kanban Board View | `14f01b6c773b460cae719b170a019af0` | `/design/board` | Verified ✅ |
| Card Detail Modal | `328bdd0c05f9447eab27e0d6d74d351c` | `/design/card-detail` | Verified ✅ |
| Home Dashboard | `d454f0f6119a4c13a6606dea0888ab83` | `/design/dashboard` | Verified ✅ |
| Board Settings | — | `/board/[id]/settings` | Not Started |
| User Settings | — | `/settings` | Not Started |
| Landing Page | — | `/` | Built (code-only, design-exempt) |
| Register | — | `/register` | Not Started |

---

## Status Definitions

| Status | Meaning |
|---|---|
| `Designed` | Screen exists in Stitch, not yet coded |
| `In Progress` | Currently being built |
| `Built` | Component exists, not yet verified against Stitch |
| `Verified` | Visual comparison against Stitch screenshot passed |
| `Not Started` | Not yet in Stitch or not yet built |
| `Design-Exempt` | Marketing/landing pages built code-first |

---

## How to Add a New Screen

1. Design it in Stitch first (or generate via `generate_screen_from_text`)
2. Get the screen ID from `mcp_StitchMCP_list_screens` for project `2496191551689222532`
3. Add a row here with status `Designed`
4. Build it following the workflow in `PROJECT.md`
5. Update status to `Built`, then `Verified` after visual QA

---

## Pending Design Work

These screens are in the product but lack Stitch designs:
- Card Detail Modal (complex — priority design needed)
- Register page (simple — clone from Login design)
- Board Settings (needs design)
- User Settings (has code, needs Stitch design to align tokens)
