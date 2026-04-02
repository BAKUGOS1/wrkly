'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Crown, Zap, CheckCircle2, ArrowUpRight, Loader2, LayoutGrid, Bot, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PlanData {
  plan: 'FREE' | 'PRO';
  hasStripeCustomer: boolean;
  workspaceCount: number;
  limits: {
    FREE: { workspaces: number; boards: number; aiRuns: number };
    PRO:  { workspaces: number; boards: number; aiRuns: number };
  };
}

// ── Feature row ───────────────────────────────────────────────────────────────
function FeatureRow({ label, free, pro }: { label: string; free: string; pro: string }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-3 text-sm border-b border-border/40 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-center">{free}</span>
      <span className="text-center font-medium text-primary">{pro}</span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function BillingTab() {
  const token = useAuthStore((s) => s.token);
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['billing-plan'],
    queryFn: () => apiFetch<PlanData>('/api/billing/plan'),
    enabled: !!token,
  });

  const checkoutMutation = useMutation({
    mutationFn: () => apiFetch<{ url: string }>('/api/billing/checkout', { method: 'POST' }),
    onSuccess: (res) => { window.location.href = res.url; },
    onError: () => toast({ title: 'Error', description: 'Could not start checkout. Please try again.', variant: 'destructive' }),
  });

  const portalMutation = useMutation({
    mutationFn: () => apiFetch<{ url: string }>('/api/billing/portal', { method: 'POST' }),
    onSuccess: (res) => { window.location.href = res.url; },
    onError: () => toast({ title: 'Error', description: 'Could not open billing portal.', variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  const plan = data?.plan ?? 'FREE';
  const isPro = plan === 'PRO';
  const wsCount = data?.workspaceCount ?? 0;

  return (
    <div className="space-y-6">

      {/* Current Plan Card */}
      <div className={cn(
        'relative overflow-hidden rounded-2xl border p-6',
        isPro ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
      )}>
        {isPro && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 pointer-events-none" />
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl',
              isPro ? 'bg-primary/10' : 'bg-muted'
            )}>
              {isPro ? <Crown className="h-5 w-5 text-primary" /> : <Zap className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">{isPro ? 'Wrkly Pro' : 'Free Plan'}</h3>
                <Badge variant={isPro ? 'default' : 'secondary'} className={cn('text-[10px]', isPro && 'bg-primary')}>
                  {plan}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isPro ? 'Unlimited everything · Priority support' : `${wsCount} workspace${wsCount !== 1 ? 's' : ''} used`}
              </p>
            </div>
          </div>

          {isPro ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              disabled={portalMutation.isPending}
              onClick={() => portalMutation.mutate()}
            >
              {portalMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
              Manage Subscription
            </Button>
          ) : (
            <Button
              size="sm"
              className="gap-1.5 shrink-0 bg-primary"
              disabled={checkoutMutation.isPending}
              onClick={() => checkoutMutation.mutate()}
            >
              {checkoutMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crown className="h-3.5 w-3.5" />}
              Upgrade to Pro
            </Button>
          )}
        </div>

        {/* Usage meters (Free plan) */}
        {!isPro && (
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { icon: LayoutGrid, label: 'Workspaces', used: wsCount, max: 3 },
              { icon: Bot, label: 'AI Runs / mo', used: 0, max: 5 },
              { icon: Users, label: 'Members', used: 0, max: 10 },
            ].map(({ icon: Icon, label, used, max }) => (
              <div key={label} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min((used / max) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{used} / {max}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan comparison */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h4 className="font-semibold text-[15px] mb-4">Plan Comparison</h4>
        <div className="grid grid-cols-3 gap-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <span>Feature</span>
          <span className="text-center">Free</span>
          <span className="text-center text-primary">Pro</span>
        </div>
        <Separator className="mb-1" />
        <FeatureRow label="Workspaces"     free="3"         pro="Unlimited" />
        <FeatureRow label="Boards"         free="10"        pro="Unlimited" />
        <FeatureRow label="Members"        free="10"        pro="Unlimited" />
        <FeatureRow label="AI Runs / mo"   free="5"         pro="500" />
        <FeatureRow label="UltraPlan"       free="—"         pro="✓" />
        <FeatureRow label="Agent Mode"      free="—"         pro="✓" />
        <FeatureRow label="Automations"     free="5 rules"   pro="Unlimited" />
        <FeatureRow label="File Uploads"    free="100 MB"    pro="10 GB" />
        <FeatureRow label="Priority Support" free="—"        pro="✓" />

        {!isPro && (
          <div className="mt-5 flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 p-4">
            <div>
              <p className="font-semibold text-sm">Upgrade to Wrkly Pro</p>
              <p className="text-xs text-muted-foreground">Unlock AI features, unlimited boards & priority support</p>
            </div>
            <Button
              size="sm"
              className="gap-1.5 bg-primary shrink-0"
              disabled={checkoutMutation.isPending}
              onClick={() => checkoutMutation.mutate()}
            >
              {checkoutMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Get Pro
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
