'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { UserPlus, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWorkspaceMembers } from '@/hooks/use-workspaces';
import { useUpdateCard } from '@/hooks/use-cards';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function MemberPicker({ workspaceId, boardId, card }: { workspaceId: string; boardId: string; card: any }) {
  const { data } = useWorkspaceMembers(workspaceId);
  const { mutateAsync: updateCard } = useUpdateCard(boardId);
  const [open, setOpen] = useState(false);

  const members = data?.members || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeUserIds = card.assignees?.map((a: any) => a.user.id) || [];

  const toggleMember = async (userId: string) => {
    const isAdding = !activeUserIds.includes(userId);
    let newAssigneesIds = [];
    if (isAdding) {
      newAssigneesIds = [...activeUserIds, userId];
    } else {
      newAssigneesIds = activeUserIds.filter((id: string) => id !== userId);
    }
    await updateCard({ cardId: card.id, data: { assigneeIds: newAssigneesIds } });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" className="w-full justify-start text-[13px] font-medium text-muted-foreground h-[32px] px-[12px] hover:bg-surface-container-high bg-surface-container/50">
          <UserPlus className="mr-[8px] h-[14px] w-[14px]" />
          Members
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 border-border" align="start">
        <h4 className="mb-2 text-center text-sm font-semibold text-muted-foreground tracking-tight">Members</h4>
        <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-1">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {members.map((m: any) => {
            const isActive = activeUserIds.includes(m.userId);
            const fallback = m.user.name.substring(0, 2).toUpperCase();
            return (
              <button
                key={m.id}
                onClick={() => toggleMember(m.userId)}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
              >
                <div className="relative">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={m.user.avatarUrl || ''} />
                    <AvatarFallback className="text-[10px]">{fallback}</AvatarFallback>
                  </Avatar>
                  {isActive && (
                    <div className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground border-2 border-background">
                      <Check className="h-2 w-2 stroke-[3]" />
                    </div>
                  )}
                </div>
                <span className="flex-1 truncate font-medium text-foreground">{m.user.name}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
