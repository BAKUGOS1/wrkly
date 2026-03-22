'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AlignLeft, LayoutTemplate, X, Copy, Trash2, ArrowRight, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCard, useUpdateCard } from '@/hooks/use-cards';

import { LabelPicker } from './label-picker';
import { MemberPicker } from './member-picker';
import { DueDatePicker } from './due-date-picker';
import { CardComments } from './card-comments';
import { BlockEditor } from '@/components/blocks/block-editor';
import { SaveAsTemplateButton } from './card-template-menu';
import { ActivityFeed } from '@/components/activity/activity-feed';
import { AiContentAssist } from '@/components/blocks/ai-content-assist';

export function CardDetailModal({ 
  cardId, 
  boardId, 
  workspaceId, 
  onClose 
}: { 
  cardId: string; 
  boardId: string; 
  workspaceId: string; 
  onClose: () => void 
}) {
  const { data, isLoading } = useCard(cardId);
  const { mutateAsync: updateCard } = useUpdateCard(boardId);
  const card = data?.card;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Sync state with fetched data
  useEffect(() => {
    if (card) {
      setTitle(card.title || '');
      setDescription(card.description || '');
    }
  }, [card]);

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  const saveTitle = async () => {
    if (title !== card?.title) {
        await updateCard({ cardId, data: { title } });
    }
  };

  const saveDescription = async () => {
    if (description !== card?.description) {
        await updateCard({ cardId, data: { description } });
    }
  };

  if (isLoading || !card) return null;

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden p-0 gap-0 border-0 shadow-2xl">
         {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
         {(card as any).coverImage && (
            <div className="h-32 w-full bg-muted">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
               <img src={(card as any).coverImage} className="h-full w-full object-cover" alt="Cover" />
            </div>
         )}
         <div className="flex flex-col md:flex-row h-[70vh] md:h-[600px] overflow-hidden">
             
             {/* Left Column - Main Content (65%) */}
             <div className="flex-[0.65] flex flex-col p-6 overflow-y-auto scrollbar-thin bg-card">
                <div className="mb-6 flex flex-col gap-1 pr-6 md:pr-0">
                  <div className="flex items-start gap-3">
                     <LayoutTemplate className="mt-2 h-5 w-5 text-muted-foreground shrink-0" />
                     <div className="flex-1 overflow-hidden">
                        <Input 
                           value={title} 
                           onChange={(e) => setTitle(e.target.value)} 
                           onBlur={saveTitle}
                           onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                           className="text-xl font-bold bg-transparent border-transparent px-1 -ml-1 h-auto py-1 shadow-none focus-visible:ring-1 focus-visible:ring-border hover:bg-muted/50" 
                        />
                        <p className="text-sm text-muted-foreground mt-1 px-1">
                           {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                           in list <span className="underline decoration-muted-foreground/30 underline-offset-2">{(card as any).list?.name || 'Loading...'}</span>
                        </p>
                     </div>
                  </div>
                </div>

                <div className="mb-6 flex gap-3">
                   <AlignLeft className="mt-1 h-5 w-5 text-muted-foreground shrink-0" />
                   <div className="flex-1 flex flex-col gap-2 relative group/desc">
                       <div className="flex items-center justify-between">
                         <h3 className="font-semibold text-foreground">Description</h3>
                         <div className="opacity-0 group-hover/desc:opacity-100 transition-opacity">
                           <AiContentAssist
                             currentContent={description}
                             onApply={async (newContent: string) => {
                               setDescription(newContent);
                               if (newContent !== card?.description) {
                                 await updateCard({ cardId, data: { description: newContent } });
                               }
                             }}
                           />
                         </div>
                       </div>
                       <textarea
                          placeholder="Add a more detailed description..."
                          className="min-h-[100px] w-full resize-none rounded-md bg-muted/40 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary hover:bg-muted/60 transition-colors border border-transparent hover:border-border focus:border-border"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          onBlur={saveDescription}
                       />
                   </div>
                </div>

                {/* Content Blocks */}
                <div className="mb-6 pl-8">
                   <BlockEditor cardId={cardId} />
                </div>
                
                {/* Comments Section */}
                <div className="pl-8 flex-1">
                   <CardComments cardId={cardId} />
                </div>
             </div>

             {/* Right Column - Actions Sidebar (35%) */}
             <div className="flex-[0.35] bg-muted/30 p-6 border-l border-border overflow-y-auto hidden md:block">
                <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={onClose}>
                   <X className="h-4 w-4" />
                </Button>

                <div className="flex flex-col gap-6">
                   <div>
                       <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Add to card</h4>
                       <div className="flex flex-col gap-2">
                          <MemberPicker workspaceId={workspaceId} boardId={boardId} card={card} />
                          <LabelPicker boardId={boardId} card={card} />
                          <DueDatePicker boardId={boardId} card={card} />
                       </div>
                   </div>

                   <Separator />

                   <div>
                       <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Actions</h4>
                       <div className="flex flex-col gap-2">
                          <Button variant="secondary" className="w-full justify-start text-muted-foreground text-sm h-8 px-3 hover:bg-muted/80">
                             <ArrowRight className="mr-2 h-4 w-4" /> Move
                          </Button>
                          <Button variant="secondary" className="w-full justify-start text-muted-foreground text-sm h-8 px-3 hover:bg-muted/80">
                             <Copy className="mr-2 h-4 w-4" /> Copy
                          </Button>
                          <Button variant="secondary" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive text-sm h-8 px-3 border border-transparent">
                             <Archive className="mr-2 h-4 w-4" /> Archive
                          </Button>
                          <Button variant="secondary" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive text-sm h-8 px-3 border border-transparent">
                             <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </Button>
                       </div>
                   </div>
                </div>
             </div>

             {/* Mobile sticky sidebar header layout alternative would map here */}
         </div>
      </DialogContent>
    </Dialog>
  );
}
