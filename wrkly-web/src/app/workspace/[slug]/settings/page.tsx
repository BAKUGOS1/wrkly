'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Settings,
  Users,
  Crown,
  Shield,
  Eye,
  Loader2,
  UserMinus,
  Mail,
  MoreVertical,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface Member {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const wsUpdateSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

type WsUpdateValues = z.infer<typeof wsUpdateSchema>;
type InviteValues = z.infer<typeof inviteSchema>;

// ── Role badge ────────────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  OWNER: { label: 'Owner', icon: <Crown className="h-3 w-3" />, cls: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  ADMIN: { label: 'Admin', icon: <Shield className="h-3 w-3" />, cls: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  MEMBER: { label: 'Member', icon: <Users className="h-3 w-3" />, cls: 'bg-primary/10 text-primary border-primary/20' },
  VIEWER: { label: 'Viewer', icon: <Eye className="h-3 w-3" />, cls: 'bg-muted text-muted-foreground border-border' },
};

function RoleBadge({ role }: { role: string }) {
  const m = ROLE_META[role] ?? ROLE_META.MEMBER;
  return (
    <span className={cn('flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border', m.cls)}>
      {m.icon}{m.label}
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function WorkspaceSettingsPage({ params }: { params: { slug: string } }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const token = useAuthStore((s) => s.token);

  const wsForm = useForm<WsUpdateValues>({ resolver: zodResolver(wsUpdateSchema) });
  const inviteForm = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'MEMBER' },
  });

  // Fetch workspace
  const { data: wsData, isLoading: wsLoading } = useQuery({
    queryKey: ['workspace', params.slug],
    queryFn: () => apiFetch<{ workspace: Workspace }>(`/api/workspaces/${params.slug}`),
    enabled: !!token,
    onSuccess: (d: { workspace: Workspace }) => {
      wsForm.reset({ name: d.workspace.name, description: d.workspace.description ?? '' });
    },
  });

  // Fetch members
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['workspaces', params.slug, 'members'],
    queryFn: () => apiFetch<{ members: Member[] }>(`/api/workspaces/${params.slug}/members`),
    enabled: !!token,
  });

  const workspace = wsData?.workspace;
  const members = membersData?.members ?? [];
  const myRole = members.find((m) => m.userId === currentUserId)?.role;
  const canAdmin = myRole === 'OWNER' || myRole === 'ADMIN';

  // Update workspace
  const updateMutation = useMutation({
    mutationFn: (data: WsUpdateValues) =>
      apiFetch(`/api/workspaces/${params.slug}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast({ title: 'Workspace updated!' });
    },
    onError: () => toast({ title: 'Failed to update', variant: 'destructive' }),
  });

  // Invite member
  const inviteMutation = useMutation({
    mutationFn: (data: InviteValues) =>
      apiFetch(`/api/workspaces/${params.slug}/members`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', params.slug, 'members'] });
      inviteForm.reset({ email: '', role: 'MEMBER' });
      toast({ title: '✅ Member added!' });
    },
    onError: (err) => toast({
      title: 'Failed to invite',
      description: err instanceof Error ? err.message : 'User may not exist yet',
      variant: 'destructive',
    }),
  });

  // Change role
  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiFetch(`/api/workspaces/${params.slug}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', params.slug, 'members'] });
      toast({ title: 'Role updated' });
    },
    onError: () => toast({ title: 'Failed to update role', variant: 'destructive' }),
  });

  // Remove member
  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/api/workspaces/${params.slug}/members/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', params.slug, 'members'] });
      toast({ title: 'Member removed' });
    },
    onError: () => toast({ title: 'Failed to remove member', variant: 'destructive' }),
  });

  if (wsLoading) {
    return (
      <div className="mx-auto max-w-3xl py-8 px-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-[300px] rounded-xl mt-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Workspace Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {workspace?.name} · {members.length} member{members.length !== 1 ? 's' : ''}
        </p>
      </div>

      <Tabs defaultValue="members">
        <TabsList className="mb-6">
          <TabsTrigger value="members" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Members
          </TabsTrigger>
          {canAdmin && (
            <TabsTrigger value="general" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" /> General
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Members Tab ── */}
        <TabsContent value="members" className="space-y-6 mt-0">
          {/* Invite form */}
          {canAdmin && (
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Invite a member
              </h2>
              <Form {...inviteForm}>
                <form
                  onSubmit={inviteForm.handleSubmit((d) => inviteMutation.mutate(d))}
                  className="flex gap-2"
                >
                  <FormField
                    control={inviteForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="colleague@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={inviteForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="MEMBER">Member</SelectItem>
                            <SelectItem value="VIEWER">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={inviteMutation.isPending} className="gap-2">
                    {inviteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Invite
                  </Button>
                </form>
              </Form>
            </div>
          )}

          {/* Members list */}
          <div className="rounded-xl border border-border/50 bg-card divide-y divide-border/30">
            {membersLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : members.map((member) => {
              const initials = member.user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
              const isMe = member.userId === currentUserId;
              const isOwner = member.role === 'OWNER';

              return (
                <div key={member.userId} className="flex items-center gap-3 px-4 py-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={member.user.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.user.name}
                      {isMe && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                  </div>
                  <RoleBadge role={member.role} />
                  {canAdmin && !isOwner && !isMe && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground ml-1">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => changeRoleMutation.mutate({ userId: member.userId, role: 'ADMIN' })}>
                          <Shield className="mr-2 h-4 w-4" /> Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => changeRoleMutation.mutate({ userId: member.userId, role: 'MEMBER' })}>
                          <Users className="mr-2 h-4 w-4" /> Make Member
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => changeRoleMutation.mutate({ userId: member.userId, role: 'VIEWER' })}>
                          <Eye className="mr-2 h-4 w-4" /> Make Viewer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <UserMinus className="mr-2 h-4 w-4" /> Remove
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove {member.user.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                They will lose access to all boards in this workspace.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeMutation.mutate(member.userId)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── General Tab ── */}
        {canAdmin && (
          <TabsContent value="general" className="space-y-6 mt-0">
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <h2 className="text-sm font-semibold mb-4">Workspace Details</h2>
              <Form {...wsForm}>
                <form onSubmit={wsForm.handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
                  <FormField
                    control={wsForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={wsForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Input placeholder="Optional description..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={updateMutation.isPending} className="gap-2">
                    {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </form>
              </Form>
            </div>

            <Separator />

            {/* Danger Zone */}
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
              <h2 className="text-sm font-semibold text-destructive mb-1 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Danger Zone
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                Deleting a workspace is permanent and cannot be undone. All boards and cards will be lost.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="h-4 w-4" /> Delete Workspace
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete &quot;{workspace?.name}&quot;?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. All boards, cards, and data in this workspace will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete Workspace
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
