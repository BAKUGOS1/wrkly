'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Clock } from 'lucide-react';
import { useUpdateCard } from '@/hooks/use-cards';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DueDatePicker({ boardId, card }: { boardId: string; card: any }) {
  const { mutateAsync: updateCard } = useUpdateCard(boardId);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(card.dueDate ? new Date(card.dueDate) : undefined);

  const handleSelect = async (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    await updateCard({ 
      cardId: card.id, 
      data: { dueDate: selectedDate ? selectedDate.toISOString() : null } 
    });
    setOpen(false);
  };

  const handleRemove = async () => {
    setDate(undefined);
    await updateCard({ cardId: card.id, data: { dueDate: null } });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" className="w-full justify-start text-muted-foreground w-full">
          <Clock className="mr-2 h-4 w-4" />
          Due Date
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
        />
        <div className="border-t border-border p-3 flex flex-col gap-2">
           <select className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm">
             <option>Reminder: None</option>
             <option>At due time</option>
             <option>1 hour before</option>
             <option>1 day before</option>
             <option>3 days before</option>
           </select>
           {date && (
             <Button variant="destructive" size="sm" className="w-full" onClick={handleRemove}>
               Remove Due Date
             </Button>
           )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
