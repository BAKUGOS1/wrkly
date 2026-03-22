# Wrkly — AI Task Orchestration System

## Current Objective: Project Scaffold & Core Setup

### Phase 1: Setup (Est. 8 hrs | Tasks 1-8)
- [x] Initialize Monorepo (Next.js and Fastify backend both scaffolded and configured)
- [x] Setup Database (Prisma schema + client complete)
- [x] Configure Docker (Local infra structure configured)
- [x] Setup Base Configs (Frontend `flowboard-web` done)

### Phase 2: Core Backend (Est. 24 hrs | Tasks 9-28)
- [x] Implement Authentication (register, login, /me — JWT, Zod, bcrypt)
- [x] Build CRUD APIs for all entities
- [x] Workspace/Board APIs
- [x] List/Card APIs
- [x] Block CRUD API (block-validators.ts + blocks.ts, 5 endpoints)
- [x] Comment API (comments.ts, 4 endpoints + @mention notifications)
- [x] Label API (labels.ts, 4 endpoints + hex validation)
- [x] Notification API (notifications.ts, 4 endpoints + cursor-based pagination)
- [x] Search API (search.ts, FTS with Prisma.$queryRaw + ILIKE fallback)
- [x] Activity Log API (services/activity.ts + routes/activity.ts, cursor-paginated feeds)
- [x] Notification Service (services/notifications.ts — createNotification, notifyBoardMembers, createReminderNotification)
- [x] Reminder Scheduler (lib/queue.ts + jobs/reminder-scheduler.ts + jobs/index.ts, BullMQ cron every 60s)
- [x] File Upload (lib/storage.ts + routes/upload.ts, local disk + @fastify/static, S3-ready abstraction)
- [x] Board Templates API (data/board-templates.ts + routes/templates.ts, 4 templates)
- [x] Card Templates API (routes/card-templates.ts, 4 endpoints, block ID generator)
- [x] Master Route Registration & Error Handling (routes/index.ts + lib/error-handler.ts + server.ts)
### Phase 3: Core Frontend (Est. 20 hrs | Tasks 29-42)
- [x] Task 29: App Layout Shell (wrapper, sidebar, topbar, dashboard)
- [x] Task 30: Auth Pages (login, register, google auth button)
- [x] Task 31: Query Hooks (workspaces & boards)
- [x] Task 32: Workspace Dashboard Page
- [x] Task 33: Board View - Basic Layout
- [x] Task 34: Card Detail Modal
- [x] Task 35: Create Workspace Dialog & Switcher (Forms)
- [x] Task 36: TanStack Query Hooks — Cards, Blocks, Comments
- [x] Task 37: Notification Center UI
- [x] Task 38: Search Dialog (Cmd+K)
- [x] Task 39: List Management UI (Inline Edit + Create)
- [x] Task 40: Comments UI in Card Detail
- [x] Task 41: Filter Bar for Board View
- [x] Task 42: Board Settings Page

### Phase 4: Features
- [x] Task 43: Drag-and-Drop — Card Sorting Within Lists (@dnd-kit)
- [x] Task 44: Drag-and-Drop — Card Moving Between Lists
- [x] Task 45: Drag-and-Drop — List Reordering (horizontal)
- [x] Task 46: Content Blocks — Block Editor Component (Tiptap, Checklist, Code, Image, File, Divider)
- [x] Task 47: Content Blocks — Drag Reorder (DnD within block editor)
- [x] Task 48: Inline Card Creation Improvements (auto-grow textarea, quick pickers)
- [x] Task 49: Board Templates UI (Template picker + Create dialog integration)
- [x] Task 50: Card Templates UI (Save as template + Create from template)
- [x] Task 51: Activity Log UI (Infinite scroll, color-coded action types, collapsible)
- [x] Task 52: Multi-Select Cards + Bulk Actions (floating toolbar, keyboard shortcuts, bulk hooks)
- [x] Task 53: User Settings Page (Profile/avatar upload, Notification toggles, Password change + danger zone)
- [x] Task 54: Landing Page (Hero + CSS board illustration, 6-feature grid, CTA banner, auth redirect)
- [x] Task 55: Dark Mode Toggle (next-themes, ThemeProvider, ThemeToggle in top-bar, dark CSS vars)
- [x] Task 56: Socket.io Server Setup (JWT middleware, Redis adapter, room join/leave, broadcast helpers)
- [x] Task 57: Emit Real-Time Events from API (realtime.ts service, emit injected into cards/lists/blocks/comments routes)
- [x] Task 58: Socket.io Client Setup (singleton socket, useSocket hook, useBoardRealtime cache updater, hooked into board-view)
- [x] Blocks (Block CRUD API — backend complete)
- [x] Search (Search API — backend complete)
- [x] Comments & Templates (backend complete — Comment API + Board Templates API)

### Phase 5: Real-Time
- [ ] WebSocket integration
- [ ] Live updates

### Phase 6: AI Integration
- [x] Task 61: AI Service (Backend ai.ts)
- [x] Task 62: AI Command Endpoint (Backend routes)
- [x] Task 63: AI Command Bar (Frontend)
- [x] Task 64: AI Card Content Assistant
- [x] Task 65: AI Rate Limiting
- [x] Task 66: AI Feature Flags & Fallbacks

### Phase 7: Automation
- [ ] Rule engine
- [ ] Builder UI
- [x] Job queue (BullMQ + reminder scheduler)

### Phase 8: Testing + Deploy
- [ ] Tests and CI/CD
- [ ] Production Deploy

---

## Verification & Review
*Document verification results here (tests run, visual checks, differences from expected behavior).*

- [ ] Reviewed code against `PROJECT.md` core principles (Simplicity, No Laziness, Minimal Impact)
- [ ] Verified functionality locally without errors
