'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Trash2, Settings, Users, Tags, Zap } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BoardSettingsClient({ board }: { board: { id: string; name: string; description: string | null; workspaceId: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description || '');

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const res = await apiFetch(`/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', board.id] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      await apiFetch(`/api/boards/${board.id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      router.push(`/workspace/${board.workspaceId}`);
    },
  });

  const handleSaveGeneral = () => {
    updateMutation.mutate({ name, description });
  };

  const handleArchive = () => {
    if (confirm('Are you sure you want to archive this board? This action can be reversed later via Workspace settings.')) {
      archiveMutation.mutate();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-surface-container-low overflow-y-auto">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between px-[32px] pt-[32px] pb-[24px]">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground font-manrope">
            Board Settings
          </h1>
          <p className="text-[14px] text-muted-foreground mt-[4px]">
            Manage configuration, members, and automations for <span className="font-semibold text-foreground">{board.name}</span>
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => router.push(`/board/${board.id}`)}
          className="text-muted-foreground hover:text-foreground hover:bg-surface-container h-[40px] px-[16px] rounded-[10px]"
        >
          <ArrowLeft className="mr-[8px] h-[16px] w-[16px]" />
          Back to Board
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="px-[32px] pb-[64px] max-w-[1000px]">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-[32px]">
            <TabsTrigger value="general" className="gap-[8px]">
              <Settings className="h-[14px] w-[14px]" />
              General
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-[8px]">
              <Users className="h-[14px] w-[14px]" />
              Members
            </TabsTrigger>
            <TabsTrigger value="labels" className="gap-[8px]">
              <Tags className="h-[14px] w-[14px]" />
              Labels
            </TabsTrigger>
            <TabsTrigger value="automations" className="gap-[8px]">
              <Zap className="h-[14px] w-[14px]" />
              Automations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-[24px] outline-none">
            {/* General Settings Card */}
            <div className="bg-surface-container-lowest rounded-[12px] p-[32px] ring-1 ring-border/30 shadow-sm">
              <div className="max-w-[500px] flex flex-col gap-[24px]">
                
                <div className="space-y-[8px]">
                  <label className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                    Board Name
                  </label>
                  <Input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="E.g., Marketing Q3"
                    className="bg-surface-container-highest border-transparent hover:border-border/50 focus:border-primary/50"
                  />
                </div>

                <div className="space-y-[8px]">
                  <label className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                    Description
                  </label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this board used for?"
                    className="w-full min-h-[100px] resize-none rounded-[10px] bg-surface-container-highest p-[12px] text-[14px] text-foreground placeholder:text-muted-foreground border border-transparent hover:border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  />
                </div>

                <div className="pt-[8px]">
                  <Button 
                    onClick={handleSaveGeneral} 
                    disabled={updateMutation.isPending || !name.trim()}
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>

              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-error/5 rounded-[12px] p-[32px] ring-1 ring-error/20 mt-[32px]">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[16px] font-semibold text-error-dim font-manrope">Archive Board</h3>
                  <p className="text-[13px] text-error-dim/80 mt-[4px] max-w-[500px]">
                    Archiving a board removes it from your active workspace. You can restore it later from the workspace settings, but all active webhooks will be paused.
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={handleArchive}
                  disabled={archiveMutation.isPending}
                  className="shrink-0"
                >
                  <Trash2 className="mr-[8px] h-[14px] w-[14px]" />
                  Archive this board
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="members" className="outline-none">
            <div className="bg-surface-container-lowest rounded-[12px] p-[32px] ring-1 ring-border/30 shadow-sm flex flex-col items-center justify-center min-h-[300px] text-center">
              <Users className="h-[32px] w-[32px] text-muted-foreground/50 mb-[16px]" />
              <h3 className="text-[16px] font-semibold text-foreground font-manrope">Manage Members</h3>
              <p className="text-[14px] text-muted-foreground mt-[4px] max-w-[400px]">
                Invite team members or manage their roles. Coming soon in a later phase.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="labels" className="outline-none">
            <div className="bg-surface-container-lowest rounded-[12px] p-[32px] ring-1 ring-border/30 shadow-sm flex flex-col items-center justify-center min-h-[300px] text-center">
              <Tags className="h-[32px] w-[32px] text-muted-foreground/50 mb-[16px]" />
              <h3 className="text-[16px] font-semibold text-foreground font-manrope">Label Manager</h3>
              <p className="text-[14px] text-muted-foreground mt-[4px] max-w-[400px]">
                Create, edit, or delete global board labels. Coming soon in a later phase.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="automations" className="outline-none">
            <div className="bg-surface-container-lowest rounded-[12px] p-[32px] ring-1 ring-border/30 shadow-sm flex flex-col items-center justify-center min-h-[300px] text-center">
              <Zap className="h-[32px] w-[32px] text-muted-foreground/50 mb-[16px]" />
              <h3 className="text-[16px] font-semibold text-foreground font-manrope">Automations</h3>
              <p className="text-[14px] text-muted-foreground mt-[4px] max-w-[400px]">
                Set up rules to automatically move cards or assign members. Coming soon.
              </p>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
