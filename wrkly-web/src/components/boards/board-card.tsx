'use client';

import Link from 'next/link';
import { MoreHorizontal, Edit, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Board } from '@/types';

interface BoardSummary extends Board {
  _count?: { lists: number; cards: number };
}

interface BoardCardProps {
  board: BoardSummary;
}

export function BoardCard({ board }: BoardCardProps) {
  const bgColor = board.background || '#4F46E5';
  
  return (
    <div className="group relative flex h-32 flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-md hover:border-primary/30">
      {/* Colored Header Area (60%) */}
      <div 
        className="flex-[0.6] p-4 transition-colors relative"
        style={{ backgroundColor: bgColor }}
      >
        <Link href={`/app/board/${board.id}`} className="absolute inset-0 z-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset" />
        <div className="relative z-10 flex items-start justify-between">
          <h3 className="font-semibold text-white truncate max-w-[85%] drop-shadow-sm">
            {board.name}
          </h3>
          <div className="relative z-20">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); /* TODO: Edit */ }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); /* TODO: Archive */ }}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Footer Area (40%) */}
      <div className="flex-[0.4] flex items-center px-4 bg-card border-t border-border/50">
        <p className="text-xs text-muted-foreground w-full truncate">
          {board._count?.lists ?? 0} lists &middot; {board._count?.cards ?? 0} cards
        </p>
      </div>
    </div>
  );
}
