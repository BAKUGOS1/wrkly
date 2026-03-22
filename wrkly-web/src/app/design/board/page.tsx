import { MessageSquare, Calendar, Plus, Bell, Search, ChevronDown, Settings, HelpCircle, LayoutGrid } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type LabelVariant = "bug" | "feature" | "urgent" | "design";

interface Label {
  text: string;
  variant: LabelVariant;
}

interface Card {
  id: string;
  title: string;
  description?: string;
  labels: Label[];
  dueDate: string;
  assignees: string[]; // initials
  commentCount: number;
  coverColor?: string;
}

interface Column {
  id: string;
  title: string;
  headerColor: string;
  headerTextColor: string;
  badgeColor: string;
  cards: Card[];
}

// ─── Data ────────────────────────────────────────────────────────────────────

const LABEL_STYLES: Record<LabelVariant, string> = {
  bug: "bg-red-100 text-red-700",
  feature: "bg-blue-100 text-blue-700",
  urgent: "bg-amber-100 text-amber-700",
  design: "bg-purple-100 text-purple-700",
};

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
];

const BOARDS = [
  { name: "Product Roadmap", color: "bg-indigo-500", active: true },
  { name: "Design System", color: "bg-purple-500", active: false },
  { name: "Marketing Q4", color: "bg-amber-500", active: false },
  { name: "Engineering Sprint", color: "bg-emerald-500", active: false },
  { name: "User Research", color: "bg-pink-500", active: false },
];

const COLUMNS: Column[] = [
  {
    id: "backlog",
    title: "Backlog",
    headerColor: "bg-slate-100",
    headerTextColor: "text-slate-600",
    badgeColor: "bg-slate-200 text-slate-600",
    cards: [
      {
        id: "b1",
        title: "User onboarding flow redesign",
        description: "Revamp the first-time user experience",
        labels: [{ text: "Feature", variant: "feature" }],
        dueDate: "Apr 15",
        assignees: ["AK"],
        commentCount: 4,
      },
      {
        id: "b2",
        title: "Keyboard shortcut system",
        description: "Add global keyboard shortcuts for power users",
        labels: [{ text: "Feature", variant: "feature" }, { text: "Urgent", variant: "urgent" }],
        dueDate: "Apr 20",
        assignees: ["SM", "JD"],
        commentCount: 2,
      },
      {
        id: "b3",
        title: "Export to CSV functionality",
        description: "Allow users to export board data",
        labels: [{ text: "Feature", variant: "feature" }],
        dueDate: "Apr 30",
        assignees: ["PL"],
        commentCount: 0,
      },
    ],
  },
  {
    id: "in-progress",
    title: "In Progress",
    headerColor: "bg-indigo-50",
    headerTextColor: "text-indigo-700",
    badgeColor: "bg-indigo-100 text-indigo-700",
    cards: [
      {
        id: "ip1",
        title: "Redesign dashboard layout",
        description: "Complete visual overhaul of the main dashboard",
        labels: [{ text: "Feature", variant: "feature" }, { text: "Urgent", variant: "urgent" }],
        dueDate: "Mar 28",
        assignees: ["AK", "SM"],
        commentCount: 3,
        coverColor: "#4F46E5",
      },
      {
        id: "ip2",
        title: "Fix auth token refresh bug",
        description: "Tokens expire too early causing user logouts",
        labels: [{ text: "Bug", variant: "bug" }],
        dueDate: "Mar 22",
        assignees: ["JD"],
        commentCount: 1,
        coverColor: "#EF4444",
      },
      {
        id: "ip3",
        title: "Mobile responsive breakpoints",
        description: "Ensure all views work on mobile and tablet",
        labels: [{ text: "Feature", variant: "feature" }],
        dueDate: "Apr 5",
        assignees: ["SM", "PL", "AK"],
        commentCount: 5,
      },
      {
        id: "ip4",
        title: "Update API documentation",
        description: "Document all new v2 API endpoints",
        labels: [{ text: "Design", variant: "design" }],
        dueDate: "Apr 10",
        assignees: ["JD", "SM"],
        commentCount: 2,
      },
    ],
  },
  {
    id: "review",
    title: "Review",
    headerColor: "bg-amber-50",
    headerTextColor: "text-amber-700",
    badgeColor: "bg-amber-100 text-amber-700",
    cards: [
      {
        id: "r1",
        title: "Notification system overhaul",
        description: "In-app and email notifications redesign",
        labels: [{ text: "Feature", variant: "feature" }, { text: "Design", variant: "design" }],
        dueDate: "Mar 25",
        assignees: ["PL", "AK"],
        commentCount: 7,
      },
      {
        id: "r2",
        title: "Performance profiling report",
        description: "Identify and document slow query bottlenecks",
        labels: [{ text: "Urgent", variant: "urgent" }],
        dueDate: "Mar 24",
        assignees: ["SM"],
        commentCount: 2,
      },
    ],
  },
  {
    id: "done",
    title: "Done",
    headerColor: "bg-emerald-50",
    headerTextColor: "text-emerald-700",
    badgeColor: "bg-emerald-100 text-emerald-700",
    cards: [
      {
        id: "d1",
        title: "Set up CI/CD pipeline",
        description: "GitHub Actions + Vercel deployment automation",
        labels: [{ text: "Feature", variant: "feature" }],
        dueDate: "Mar 18",
        assignees: ["JD"],
        commentCount: 3,
      },
      {
        id: "d2",
        title: "Database schema migration",
        description: "Migrate legacy schema to new Prisma models",
        labels: [{ text: "Urgent", variant: "urgent" }],
        dueDate: "Mar 15",
        assignees: ["AK", "PL"],
        commentCount: 6,
      },
    ],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function AvatarStack({ assignees }: { assignees: string[] }) {
  return (
    <div className="flex items-center -space-x-1.5">
      {assignees.slice(0, 3).map((initials, i) => (
        <div
          key={initials + i}
          className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-white ring-1 ring-white ${
            AVATAR_COLORS[i % AVATAR_COLORS.length]
          }`}
        >
          {initials[0]}
        </div>
      ))}
    </div>
  );
}

function LabelPill({ label }: { label: Label }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
        LABEL_STYLES[label.variant]
      }`}
    >
      {label.text}
    </span>
  );
}

function KanbanCard({ card }: { card: Card }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 overflow-hidden cursor-pointer group">
      {/* Cover strip */}
      {card.coverColor && (
        <div className="h-1" style={{ backgroundColor: card.coverColor }} />
      )}

      <div className="p-3 space-y-2.5">
        {/* Labels */}
        {card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.labels.map((label) => (
              <LabelPill key={label.text} label={label} />
            ))}
          </div>
        )}

        {/* Title */}
        <p className="text-sm font-medium text-slate-800 leading-snug group-hover:text-indigo-700 transition-colors">
          {card.title}
        </p>

        {/* Description */}
        {card.description && (
          <p className="text-[11px] text-slate-400 truncate">{card.description}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-0.5">
          {/* Due date */}
          <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 rounded-full px-2 py-0.5">
            <Calendar className="w-3 h-3" />
            <span>{card.dueDate}</span>
          </div>

          {/* Right: avatars + comments */}
          <div className="flex items-center gap-2">
            <AvatarStack assignees={card.assignees} />
            {card.commentCount > 0 && (
              <div className="flex items-center gap-0.5 text-[11px] text-slate-400">
                <MessageSquare className="w-3 h-3" />
                <span>{card.commentCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ column }: { column: Column }) {
  return (
    <div className="flex flex-col w-[280px] shrink-0">
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl mb-3 ${column.headerColor}`}>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${column.headerTextColor}`}>{column.title}</span>
          <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${column.badgeColor}`}>
            {column.cards.length}
          </span>
        </div>
        <button className={`w-5 h-5 flex items-center justify-center rounded-md hover:bg-black/10 transition-colors ${column.headerTextColor}`}>
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3">
        {column.cards.map((card) => (
          <KanbanCard key={card.id} card={card} />
        ))}
        {/* Add card ghost */}
        <button className="w-full py-2 text-[12px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl border border-dashed border-slate-200 transition-all duration-150 flex items-center justify-center gap-1.5">
          <Plus className="w-3 h-3" />
          Add card
        </button>
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function BoardViewDesign() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* ── Sidebar ── */}
      <aside className="w-[260px] shrink-0 bg-slate-900 flex flex-col h-full">
        {/* Logo + workspace */}
        <div className="px-4 pt-5 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-base tracking-tight">Wrkly</span>
          </div>
          <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-indigo-500 flex items-center justify-center text-[9px] font-bold text-white">A</div>
              <span className="text-slate-300 text-sm font-medium">Acme Corp</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>

        {/* Boards list */}
        <div className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-2 mb-2">Boards</p>
          <nav className="space-y-0.5">
            {BOARDS.map((board) => (
              <button
                key={board.name}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                  board.active
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${board.color}`} />
                <span className="truncate font-medium">{board.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom nav */}
        <div className="px-3 py-3 border-t border-slate-800 space-y-0.5">
          <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-sm transition-colors">
            <Settings className="w-4 h-4" />
            <span className="font-medium">Settings</span>
          </button>
          <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-sm transition-colors">
            <HelpCircle className="w-4 h-4" />
            <span className="font-medium">Help &amp; Support</span>
          </button>

          {/* User */}
          <div className="flex items-center gap-2.5 px-2.5 py-2 mt-1">
            <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-[11px] font-bold text-white">MK</div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-200 text-xs font-medium truncate">Mohit Kumar</p>
              <p className="text-slate-500 text-[10px] truncate">mohit@acme.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-5">
          <h1 className="text-base font-semibold text-slate-800 tracking-tight">Product Roadmap</h1>

          <div className="flex items-center gap-3">
            {/* Search trigger */}
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 text-sm hover:border-indigo-300 hover:text-slate-600 transition-colors min-w-[200px]">
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs">Search or press</span>
              <kbd className="ml-auto text-[10px] font-medium bg-white border border-slate-200 rounded px-1 py-0.5 text-slate-500">⌘K</kbd>
            </button>

            {/* Notification bell */}
            <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
              <Bell className="w-4 h-4 text-slate-500" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-1 ring-white" />
            </button>

            {/* User avatar */}
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-[11px] font-bold text-white cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all">
              MK
            </div>
          </div>
        </header>

        {/* Kanban board */}
        <main className="flex-1 overflow-x-auto overflow-y-auto p-5">
          <div className="flex gap-4 h-full" style={{ minWidth: "max-content" }}>
            {COLUMNS.map((column) => (
              <KanbanColumn key={column.id} column={column} />
            ))}
            {/* Add column ghost */}
            <button className="w-[280px] shrink-0 h-12 self-start flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all text-sm font-medium">
              <Plus className="w-4 h-4" />
              Add column
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
