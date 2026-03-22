import {
  LayoutGrid, ChevronDown, Settings, HelpCircle, Bell, Search,
  Users, Clock, Plus, ArrowRight
} from "lucide-react";

// ─── Types & Data ─────────────────────────────────────────────────────────────

interface Workspace {
  id: string;
  name: string;
  iconBg: string;
  iconText: string;
  members: number;
  boards: number;
  lastActive: string;
}

const BOARDS = [
  { name: "Product Roadmap", color: "bg-indigo-500", active: true },
  { name: "Design System", color: "bg-purple-500", active: false },
  { name: "Marketing Q4", color: "bg-amber-500", active: false },
  { name: "Engineering Sprint", color: "bg-emerald-500", active: false },
  { name: "User Research", color: "bg-pink-500", active: false },
];

const WORKSPACES: Workspace[] = [
  { id: "w1", name: "Acme Corp", iconBg: "bg-purple-500", iconText: "A", members: 12, boards: 8, lastActive: "1h ago" },
  { id: "w2", name: "Side Project", iconBg: "bg-amber-500", iconText: "S", members: 3, boards: 2, lastActive: "3d ago" },
  { id: "w3", name: "Design System", iconBg: "bg-blue-500", iconText: "D", members: 6, boards: 4, lastActive: "5h ago" },
  { id: "w4", name: "Marketing Team", iconBg: "bg-rose-500", iconText: "M", members: 9, boards: 6, lastActive: "2d ago" },
  { id: "w5", name: "Engineering", iconBg: "bg-emerald-500", iconText: "E", members: 15, boards: 12, lastActive: "30m ago" },
];

// ─── Workspace Card ────────────────────────────────────────────────────────────

function WorkspaceCard({ ws }: { ws: Workspace }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${ws.iconBg} flex items-center justify-center text-base font-bold text-white shrink-0`}>
          {ws.iconText}
        </div>
        <h3 className="font-semibold text-slate-800 text-sm leading-tight group-hover:text-indigo-700 transition-colors">
          {ws.name}
        </h3>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Users className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="text-xs">{ws.members}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <LayoutGrid className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="text-xs">{ws.boards} boards</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="text-xs">{ws.lastActive}</span>
        </div>
      </div>

      {/* Footer link */}
      <div className="flex items-center gap-1 text-xs font-medium text-indigo-600 group-hover:text-indigo-700">
        <span>View workspace</span>
        <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  );
}

function CreateWorkspaceCard() {
  return (
    <button className="bg-transparent rounded-2xl border-2 border-dashed border-slate-300 p-5 flex flex-col items-center justify-center gap-3 h-full min-h-[152px] hover:border-indigo-400 hover:bg-indigo-50/30 transition-all duration-200 group">
      <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
        <Plus className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
      </div>
      <p className="text-sm text-slate-500 group-hover:text-indigo-600 font-medium transition-colors">
        Create a new workspace
      </p>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardDesign() {
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
                  board.active ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
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
          <div className="flex items-center gap-2.5 px-2.5 py-2 mt-1">
            <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-[11px] font-bold text-white">MK</div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-200 text-xs font-medium truncate">Mohit Kumar</p>
              <p className="text-slate-500 text-[10px] truncate">mohit@acme.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-5">
          <h1 className="text-base font-semibold text-slate-800">Good morning, Alex 👋</h1>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 text-sm hover:border-indigo-300 hover:text-slate-600 transition-colors min-w-[200px]">
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs">Search or press</span>
              <kbd className="ml-auto text-[10px] font-medium bg-white border border-slate-200 rounded px-1 py-0.5 text-slate-500">⌘K</kbd>
            </button>
            <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
              <Bell className="w-4 h-4 text-slate-500" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-1 ring-white" />
            </button>
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-[11px] font-bold text-white cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all">
              MK
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* Section header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Your Workspaces</h2>
            <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
              New Workspace
            </button>
          </div>

          {/* Workspace grid */}
          <div className="grid grid-cols-3 gap-4">
            {WORKSPACES.map((ws) => (
              <WorkspaceCard key={ws.id} ws={ws} />
            ))}
            <CreateWorkspaceCard />
          </div>
        </main>
      </div>
    </div>
  );
}
