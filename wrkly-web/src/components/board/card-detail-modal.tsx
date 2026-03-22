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
      <DialogContent className="w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-[800px] overflow-hidden p-0 gap-0 border-0 bg-surface-container-lowest shadow-[0_20px_40px_rgba(0,0,0,0.12)] rounded-none sm:rounded-[16px] ring-1 ring-border/5">
         {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
         {(card as any).coverImage && (
            <div className="h-[80px] sm:h-[120px] w-full bg-muted">
               {/* eslint-disable-next-line @next/next/no-img-element, @typescript-eslint/no-explicit-any */}
               <img src={(card as any).coverImage} className="h-full w-full object-cover" alt="Cover" />
            </div>
         )}
         <div className="flex flex-col sm:flex-row h-full sm:h-[650px] overflow-hidden">
             
             {/* Left Column - Main Content (65%) */}
             <div className="flex-[0.65] flex flex-col p-[24px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20">
                <div className="mb-[24px] flex flex-col gap-1 pr-[24px] md:pr-0">
                  <div className="flex items-start gap-[12px]">
                     <LayoutTemplate className="mt-[6px] h-[20px] w-[20px] text-muted-foreground shrink-0" />
                     <div className="flex-1 overflow-hidden">
                        <Input 
                           value={title} 
                           onChange={(e) => setTitle(e.target.value)} 
                           onBlur={saveTitle}
                           onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                           className="text-[20px] font-bold bg-transparent border-transparent px-[4px] -ml-[4px] h-auto py-[4px] shadow-none focus-visible:ring-1 focus-visible:ring-border hover:bg-surface-container/50 transition-colors" 
                        />
                        <p className="text-[13px] text-muted-foreground mt-[4px] px-[4px]">
                           {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                           in list <span className="underline decoration-muted-foreground/30 underline-offset-4">{(card as any).list?.name || 'Loading...'}</span>
                        </p>
                     </div>
                  </div>
                </div>

                <div className="mb-[24px] flex gap-[12px]">
                   <AlignLeft className="mt-[4px] h-[20px] w-[20px] text-muted-foreground shrink-0" />
                   <div className="flex-1 flex flex-col gap-[8px] relative group/desc">
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
                          className="min-h-[100px] w-full resize-none rounded-[8px] bg-surface-container p-[12px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 hover:bg-surface-container-high transition-colors border border-transparent hover:border-border/30 focus:border-border/50"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          onBlur={saveDescription}
                       />
                   </div>
                </div>

                {/* Content Blocks */}
                <div className="mb-[24px] pl-[32px]">
                   <BlockEditor cardId={cardId} />
                </div>
                
                {/* Comments Section */}
                <div className="pl-[32px] flex-1">
                   <CardComments cardId={cardId} />
                </div>
             </div>

             {/* Right Column - Actions Sidebar (35%) */}
             <div className="flex-[0.35] bg-surface-container/30 p-[24px] border-l border-border/40 overflow-y-auto hidden md:block">
                <Button variant="ghost" size="icon" className="absolute right-[16px] top-[16px]" onClick={onClose}>
                   <X className="h-[16px] w-[16px]" />
                </Button>

                <div className="flex flex-col gap-[24px] mt-[8px]">
                   <div>
                       <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-[8px]">Add to card</h4>
                       <div className="flex flex-col gap-[8px]">
                          <MemberPicker workspaceId={workspaceId} boardId={boardId} card={card} />
                          <LabelPicker boardId={boardId} card={card} />
                          <DueDatePicker boardId={boardId} card={card} />
                       </div>
                   </div>

                   <Separator className="bg-border/60" />

                   <div>
                       <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-[8px]">Actions</h4>
                       <div className="flex flex-col gap-[8px]">
                          <Button variant="secondary" className="w-full justify-start text-[13px] font-medium text-muted-foreground h-[32px] px-[12px] hover:bg-surface-container-high bg-surface-container/50">
                             <ArrowRight className="mr-[8px] h-[14px] w-[14px]" /> Move
                          </Button>
                          <Button variant="secondary" className="w-full justify-start text-[13px] font-medium text-muted-foreground h-[32px] px-[12px] hover:bg-surface-container-high bg-surface-container/50">
                             <Copy className="mr-[8px] h-[14px] w-[14px]" /> Copy
                          </Button>
                          <Button variant="secondary" className="w-full justify-start text-destructive hover:bg-error-container hover:text-on-error-container text-[13px] font-medium h-[32px] px-[12px] border border-transparent bg-surface-container/50">
                             <Archive className="mr-[8px] h-[14px] w-[14px]" /> Archive
                          </Button>
                          <Button variant="secondary" className="w-full justify-start text-destructive hover:bg-error-container hover:text-on-error-container text-[13px] font-medium h-[32px] px-[12px] border border-transparent bg-surface-container/50">
                             <Trash2 className="mr-[8px] h-[14px] w-[14px]" /> Delete
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
