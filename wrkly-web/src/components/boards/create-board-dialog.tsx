'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useCreateBoard } from '@/hooks/use-boards';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplatePicker } from './template-picker';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#4F46E5', // Indigo
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#6366F1', // Indigo (light)
];

const createBoardSchema = z.object({
  name: z.string().min(1, 'Board name is required'),
  background: z.string().min(1),
});

type CreateBoardValues = z.infer<typeof createBoardSchema>;

interface CreateBoardDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBoardDialog({ workspaceId, open, onOpenChange }: CreateBoardDialogProps) {
  const router = useRouter();
  const createBoardParams = useCreateBoard(workspaceId);
  const { mutateAsync: createBoard, isPending } = createBoardParams;

  const form = useForm<CreateBoardValues>({
    resolver: zodResolver(createBoardSchema),
    defaultValues: {
      name: '',
      background: PRESET_COLORS[0],
    },
  });

  // Reset form when opened
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  const onSubmit = async (data: CreateBoardValues) => {
    try {
      const resp = await createBoard(data);
      handleOpenChange(false);
      router.push(`/board/${resp.board.id}`);
    } catch {
      // Error handled by mutation hook via toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] gap-0 p-0 overflow-hidden">
        <div className="p-6 pb-4 bg-muted/10 border-b border-border">
          <DialogHeader>
            <DialogTitle>Create new board</DialogTitle>
            <DialogDescription>
              Add a new board or use a template to organize your projects.
            </DialogDescription>
          </DialogHeader>
        </div>

        <Tabs defaultValue="blank" className="w-full flex-1 min-h-0 flex flex-col">
          <div className="px-6 py-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="blank">Blank Board</TabsTrigger>
              <TabsTrigger value="template">From Template</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="blank" className="m-0 border-t border-border/50 px-6 py-5 data-[state=active]:flex-1 flex flex-col">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 flex flex-col">
                <div className="space-y-4 flex-1">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Board Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Marketing Campaign" {...field} disabled={isPending} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="background"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Background Color</FormLabel>
                        <FormControl>
                          <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className={cn(
                                  "h-8 w-8 rounded-full shadow-sm ring-offset-background transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                  field.value === color ? "scale-110 ring-2 ring-foreground" : "border border-border/50"
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => field.onChange(color)}
                                disabled={isPending}
                              />
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Board
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="template" className="m-0 border-t border-border/50 px-6 py-5 data-[state=active]:flex-1 min-h-[300px]">
            <TemplatePicker
              workspaceId={workspaceId}
              onSuccess={(boardId) => {
                handleOpenChange(false);
                router.push(`/board/${boardId}`);
              }}
              onCancel={() => handleOpenChange(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
