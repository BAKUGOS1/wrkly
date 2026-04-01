'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import {
  Share2,
  Copy,
  Check,
  Link2,
  Users,
  Loader2,
  UserPlus,
  Crown,
  Shield,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Member {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}

interface ShareBoardDialogProps {
  boardId: string;
  boardName: string;
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Role Icon ─────────────────────────────────────────────────────────────────

function RoleIcon({ role }: { role: string }) {
  if (role === 'OWNER') return <Crown className="h-3 w-3 text-amber-500" />;
  if (role === 'ADMIN') return <Shield className="h-3 w-3 text-blue-500" />;
  if (role === 'VIEWER') return <Eye className="h-3 w-3 text-muted-foreground" />;
  return <Users className="h-3 w-3 text-primary" />;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ShareBoardDialog({
  boardId,
  boardName,
  workspaceId,
  open,
  onOpenChange,
}: ShareBoardDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');

  // Fetch workspace members
  const { data, isLoading } = useQuery({
    queryKey: ['workspaces', workspaceId, 'members'],
    queryFn: () => apiFetch<{ members: Member[] }>(`/api/workspaces/${workspaceId}/members`),
    enabled: !!token && open,
  });

  const members = data?.members ?? [];

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/workspaces/${workspaceId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'members'] });
      setInviteEmail('');
      toast({ title: '✅ Member added to workspace!' });
    },
    onError: (err) =>
      toast({
        title: 'Failed to invite',
        description: err instanceof Error ? err.message : 'User may not exist',
        variant: 'destructive',
      }),
  });

  const boardUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/board/${boardId}`
    : `/board/${boardId}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(boardUrl);
    setCopied(true);
    toast({ title: 'Link copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            Share &quot;{boardName}&quot;
          </DialogTitle>
        </DialogHeader>

        {/* Board link */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Board Link</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 text-sm bg-muted/50 rounded-lg border border-border/50 overflow-hidden">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate text-muted-foreground">{boardUrl}</span>
            </div>
            <Button size="icon" variant="outline" onClick={handleCopy} className="shrink-0">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Only workspace members can access this board.
          </p>
        </div>

        <Separator />

        {/* Invite section */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Invite to Workspace</p>
          <div className="flex gap-2">
            <Input
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inviteEmail) inviteMutation.mutate();
              }}
            />
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as typeof inviteRole)}>
              <SelectTrigger className="w-[100px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="VIEWER">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={!inviteEmail || inviteMutation.isPending}
              size="icon"
              className="shrink-0"
            >
              {inviteMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <UserPlus className="h-4 w-4" />
              }
            </Button>
          </div>
        </div>

        {/* Members list */}
        <div className="space-y-2 max-h-[220px] overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {members.length} Member{members.length !== 1 ? 's' : ''}
          </p>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            members.map((m) => {
              const initials = m.user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={m.userId} className="flex items-center gap-2.5 py-1.5">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={m.user.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {m.user.name}
                      {m.userId === currentUserId && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground capitalize shrink-0">
                    <RoleIcon role={m.role} />
                    {m.role.toLowerCase()}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
