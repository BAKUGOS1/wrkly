'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  LayoutGrid, AlertCircle, Users, TrendingUp,
  Activity, BarChart2, PieChart,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart as RePieChart, Pie, Legend,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkspaceStats {
  totalBoards: number;
  totalCards: number;
  activeTasks: number;
  overdueTasks: number;
  completedTasks: number;
  memberCount: number;
  velocityByWeek: Array<{ week: string; cards: number }>;
  cardsByList: Array<{ name: string; count: number }>;
  topAssignees: Array<{ userId: string; name: string; avatarUrl?: string | null; cards: number }>;
}

interface Activity {
  id: string;
  action: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  user: { id: string; name: string; avatarUrl?: string | null };
  board?: { id: string; name: string } | null;
  card?: { id: string; title: string } | null;
}

// ── Chart colors ──────────────────────────────────────────────────────────────
const PIE_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#f97316'];

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, icon: Icon, color, sub,
}: { label: string; value: number | string; icon: React.ElementType; color: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="font-semibold text-[15px]">{title}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ── Relative time ─────────────────────────────────────────────────────────────
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 2) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AnalyticsPage({ params }: { params: { slug: string } }) {
  const token = useAuthStore((s) => s.token);

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['workspace-stats', params.slug],
    queryFn: () => apiFetch<WorkspaceStats>(`/api/workspaces/${params.slug}/stats`),
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['workspace-activity', params.slug],
    queryFn: () => apiFetch<{ activities: Activity[] }>(`/api/workspaces/${params.slug}/activity?limit=20`),
    enabled: !!token,
  });

  const stats = statsData;
  const activities = activityData?.activities ?? [];

  if (statsLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Workspace overview · auto-refreshes every 30s
          </p>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Boards"   value={stats?.totalBoards   ?? 0} icon={LayoutGrid}   color="bg-indigo-500/10 text-indigo-500" />
          <KpiCard label="Active Tasks"   value={stats?.activeTasks   ?? 0} icon={Activity}     color="bg-emerald-500/10 text-emerald-500" />
          <KpiCard label="Overdue Tasks"  value={stats?.overdueTasks  ?? 0} icon={AlertCircle}  color="bg-rose-500/10 text-rose-500" />
          <KpiCard label="Team Members"   value={stats?.memberCount   ?? 0} icon={Users}        color="bg-violet-500/10 text-violet-500" />
        </div>

        {/* ── Charts row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Velocity Line Chart (3/5) */}
          <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-6">
            <SectionHeader icon={TrendingUp} title="Task Velocity" sub="Cards created per week · last 8 weeks" />
            {(stats?.velocityByWeek && stats.velocityByWeek.length > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats.velocityByWeek} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <ReTooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 12 }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cards"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                No card data yet — create some tasks to see velocity.
              </div>
            )}
          </div>

          {/* Cards by List Doughnut (2/5) */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
            <SectionHeader icon={PieChart} title="Cards by List" sub="Distribution across all lists" />
            {(stats?.cardsByList && stats.cardsByList.length > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <RePieChart>
                  <Pie
                    data={stats.cardsByList}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {stats.cardsByList.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(value) => value.length > 14 ? value.slice(0, 14) + '…' : value}
                  />
                  <ReTooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 12 }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                No lists found in this workspace.
              </div>
            )}
          </div>
        </div>

        {/* ── Workload + Activity row ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Team Workload Bar Chart (3/5) */}
          <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-6">
            <SectionHeader icon={BarChart2} title="Team Workload" sub="Cards assigned per member" />
            {(stats?.topAssignees && stats.topAssignees.length > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.topAssignees} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={90}
                    tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + '…' : v}
                  />
                  <ReTooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 12 }}
                  />
                  <Bar dataKey="cards" radius={[0, 6, 6, 0]}>
                    {stats.topAssignees.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                No assigned cards yet.
              </div>
            )}
          </div>

          {/* Activity Feed (2/5) */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
            <SectionHeader icon={Activity} title="Recent Activity" sub="Latest events across all boards" />
            {activityLoading ? (
              <div className="space-y-3">
                {[0,1,2,3,4].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
              </div>
            ) : activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No activity yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {activities.map((a) => {
                  const initials = a.user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                  const actionLabel = String(a.action).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                  return (
                    <div key={a.id} className="flex items-start gap-3 rounded-xl p-2 hover:bg-muted/40 transition-colors">
                      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                        <AvatarImage src={a.user.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] leading-tight">
                          <span className="font-medium">{a.user.name}</span>
                          {' '}<span className="text-muted-foreground">{actionLabel}</span>
                          {a.card && <span className="font-medium"> &ldquo;{a.card.title}&rdquo;</span>}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {a.board && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                              {a.board.name}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">{relativeTime(a.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
