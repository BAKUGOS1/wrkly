"use client";

import { useState } from "react";
import {
  X, ChevronRight, Pencil, AlignLeft, LayoutList, Code2, MessageSquare,
  Send, Tag, Users, Calendar, Bell, ArrowRightLeft, Copy, Archive, Trash2,
  Plus, Check
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface Comment {
  id: string;
  author: string;
  initials: string;
  avatarColor: string;
  text: string;
  time: string;
}

// ─── Sample data ─────────────────────────────────────────────────────────────

const INITIAL_CHECKLIST: ChecklistItem[] = [
  { id: "c1", text: "Design wireframes", checked: true },
  { id: "c2", text: "Build prototype", checked: false },
  { id: "c3", text: "Get stakeholder approval", checked: false },
];

const COMMENTS: Comment[] = [
  {
    id: "co1",
    author: "Sarah K.",
    initials: "SK",
    avatarColor: "bg-indigo-500",
    text: "Looks great! Can we add the dark mode variant too?",
    time: "2h ago",
  },
  {
    id: "co2",
    author: "James D.",
    initials: "JD",
    avatarColor: "bg-emerald-500",
    text: "I'll start on the mobile breakpoints this afternoon.",
    time: "45m ago",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-slate-400">{icon}</span>
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function SidebarSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      {children}
    </div>
  );
}

function AvatarGroup({ colors }: { colors: string[] }) {
  const initials = ["AK", "SM", "JD"];
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-1.5">
        {colors.map((color, i) => (
          <div key={i} className={`w-6 h-6 rounded-full ${color} flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-white`}>
            {initials[i]}
          </div>
        ))}
      </div>
      <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">+ Add</button>
    </div>
  );
}

// ─── Main Modal Component ────────────────────────────────────────────────────

export default function CardDetailModal() {
  const [title, setTitle] = useState("Redesign dashboard layout");
  const [comment, setComment] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>(INITIAL_CHECKLIST);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // In the /design preview, close is a no-op (no router in static preview)
  const handleClose = () => {};

  const toggleCheck = (id: string) => {
    setChecklist((prev) => prev.map((item) => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const completedCount = checklist.filter((i) => i.checked).length;

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Modal header / breadcrumb */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <span>Product Roadmap</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-500 font-medium">In Progress</span>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Left panel ── */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* Title */}
            <div>
              {isEditingTitle ? (
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(false)}
                  className="w-full text-xl font-bold text-slate-800 bg-transparent border-0 border-b-2 border-indigo-400 focus:outline-none pb-0.5"
                />
              ) : (
                <h2
                  onClick={() => setIsEditingTitle(true)}
                  className="text-xl font-bold text-slate-800 cursor-text hover:bg-slate-50 rounded-lg px-1 -mx-1 py-0.5 transition-colors"
                >
                  {title}
                </h2>
              )}
              <div className="flex items-center mt-2 gap-2">
                <span className="text-[11px] text-slate-400">in list</span>
                <span className="bg-indigo-100 text-indigo-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  In Progress
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <SectionHeader icon={<AlignLeft className="w-3.5 h-3.5" />} label="Description" />
              <div className="bg-slate-50 rounded-xl p-3 min-h-[80px] text-sm text-slate-500 cursor-text hover:bg-slate-100 transition-colors">
                <p>Complete visual overhaul of the main dashboard, including new widget layout, improved data visualizations, and updated typography to match the new design system.</p>
              </div>
            </div>

            {/* Content Blocks */}
            <div>
              <SectionHeader icon={<LayoutList className="w-3.5 h-3.5" />} label="Content Blocks" />
              <div className="space-y-3">

                {/* Text block */}
                <div className="flex gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-slate-500">T</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    The new layout should prioritize the activity feed and board summary widgets above the fold.
                  </p>
                </div>

                {/* Checklist block */}
                <div className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-500">Checklist</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{completedCount}/{checklist.length}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1 bg-slate-100 rounded-full mb-3 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${(completedCount / checklist.length) * 100}%` }}
                    />
                  </div>
                  <div className="space-y-2">
                    {checklist.map((item) => (
                      <label key={item.id} className="flex items-center gap-2.5 cursor-pointer group">
                        <div
                          onClick={() => toggleCheck(item.id)}
                          className={`w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 transition-all ${
                            item.checked
                              ? "bg-indigo-500 border-indigo-500"
                              : "border-slate-300 group-hover:border-indigo-400"
                          }`}
                        >
                          {item.checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                        </div>
                        <span className={`text-sm ${item.checked ? "line-through text-slate-400" : "text-slate-700"}`}>
                          {item.text}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Code block */}
                <div className="rounded-xl bg-slate-800 p-4 overflow-x-auto">
                  <div className="flex items-center gap-2 mb-3">
                    <Code2 className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Code</span>
                  </div>
                  <pre className="text-[12px] font-mono text-slate-300 leading-relaxed">
{`const Dashboard = () => {
  const { data } = useWorkspaceData();
  return <DashboardView data={data} />;
};`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Comments */}
            <div>
              <SectionHeader icon={<MessageSquare className="w-3.5 h-3.5" />} label="Comments" />
              <div className="space-y-4">
                {COMMENTS.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className={`w-7 h-7 rounded-full ${c.avatarColor} flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5`}>
                      {c.initials}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-slate-700">{c.author}</span>
                        <span className="text-[10px] text-slate-400">{c.time}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">{c.text}</p>
                    </div>
                  </div>
                ))}

                {/* Comment input */}
                <div className="flex gap-3 pt-1">
                  <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    MK
                  </div>
                  <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-3 py-2 focus-within:border-indigo-300 focus-within:bg-white transition-all">
                    <input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 text-sm bg-transparent focus:outline-none text-slate-700 placeholder:text-slate-400"
                    />
                    <button className="text-indigo-500 hover:text-indigo-700 transition-colors disabled:opacity-30" disabled={!comment.trim()}>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <aside className="w-56 shrink-0 border-l border-slate-100 overflow-y-auto px-4 py-5 space-y-5">

            {/* Labels */}
            <SidebarSection label="Labels">
              <div className="flex flex-wrap gap-1.5">
                <span className="bg-blue-100 text-blue-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">Feature</span>
                <span className="bg-amber-100 text-amber-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">Urgent</span>
                <button className="flex items-center gap-0.5 text-[11px] text-slate-400 hover:text-indigo-500 border border-dashed border-slate-300 hover:border-indigo-400 rounded-full px-2 py-0.5 transition-colors">
                  <Plus className="w-2.5 h-2.5" />
                  <span>Add</span>
                </button>
              </div>
            </SidebarSection>

            {/* Assignees */}
            <SidebarSection label="Assignees">
              <AvatarGroup colors={["bg-indigo-500", "bg-emerald-500", "bg-orange-500"]} />
            </SidebarSection>

            {/* Due date */}
            <SidebarSection label="Due Date">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs">Mar 28, 2026</span>
                </div>
                <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">Overdue</span>
              </div>
            </SidebarSection>

            {/* Reminder */}
            <SidebarSection label="Reminder">
              <div className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-slate-400" />
                <select className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none focus:border-indigo-400">
                  <option>1 day before</option>
                  <option>2 hours before</option>
                  <option>1 week before</option>
                </select>
              </div>
            </SidebarSection>

            <hr className="border-slate-100" />

            {/* Actions */}
            <SidebarSection label="Actions">
              <div className="space-y-1">
                {[
                  { icon: <ArrowRightLeft className="w-3.5 h-3.5" />, label: "Move to list", color: "text-slate-600 hover:text-slate-800 hover:bg-slate-50" },
                  { icon: <Copy className="w-3.5 h-3.5" />, label: "Copy card", color: "text-slate-600 hover:text-slate-800 hover:bg-slate-50" },
                  { icon: <Archive className="w-3.5 h-3.5" />, label: "Archive", color: "text-slate-600 hover:text-slate-800 hover:bg-slate-50" },
                  { icon: <Trash2 className="w-3.5 h-3.5" />, label: "Delete", color: "text-red-500 hover:text-red-700 hover:bg-red-50" },
                ].map(({ icon, label, color }) => (
                  <button key={label} className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${color}`}>
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            </SidebarSection>
          </aside>
        </div>
      </div>
    </div>
  );
}
