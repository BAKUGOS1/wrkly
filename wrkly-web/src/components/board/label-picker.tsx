'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Tag, Check, Plus } from 'lucide-react';
import { useBoard } from '@/hooks/use-boards';
import { useUpdateCard } from '@/hooks/use-cards';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LabelPicker({ boardId, card }: { boardId: string; card: any }) {
  const { data } = useBoard(boardId);
  const { mutateAsync: updateCard } = useUpdateCard(boardId);
  const [open, setOpen] = useState(false);

  const boardLabels = data?.board?.labels || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeLabelIds = card.labels?.map((l: any) => l.id) || [];

  const toggleLabel = async (labelId: string) => {
    const isAdding = !activeLabelIds.includes(labelId);
    let newLabels = [];
    if (isAdding) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newLabels = [...card.labels, boardLabels.find((l: any) => l.id === labelId)];
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newLabels = card.labels.filter((l: any) => l.id !== labelId);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateCard({ cardId: card.id, data: { labelIds: newLabels.map((l: any) => l.id) } });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" className="w-full justify-start text-[13px] font-medium text-muted-foreground h-[32px] px-[12px] hover:bg-surface-container-high bg-surface-container/50">
          <Tag className="mr-[8px] h-[14px] w-[14px]" />
          Labels
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <h4 className="mb-2 text-center text-sm font-semibold text-muted-foreground">Labels</h4>
        <div className="flex flex-col gap-2">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {boardLabels.map((label: any) => {
            const isActive = activeLabelIds.includes(label.id);
            return (
              <button
                key={label.id}
                onClick={() => toggleLabel(label.id)}
                className="group flex h-8 w-full items-center justify-between rounded px-3 text-left text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: label.color, color: '#fff' }}
              >
                <span className="truncate drop-shadow-sm">{label.name}</span>
                {isActive && <Check className="h-4 w-4 drop-shadow-sm" />}
              </button>
            );
          })}
        </div>
        <div className="mt-3 border-t pt-2">
          <Button variant="ghost" className="h-8 w-full justify-start text-xs text-muted-foreground">
            <Plus className="mr-2 h-3 w-3" />
            Create a new label
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
