export const queryKeys = {
  workspaces: {
    all: ['workspaces'] as const,
    members: (id: string) => ['workspaces', id, 'members'] as const,
  },
  boards: {
    byWorkspace: (wsId: string) => ['boards', { workspaceId: wsId }] as const,
    detail: (id: string) => ['boards', id] as const,
  },
  cards: {
    detail: (id: string) => ['cards', id] as const,
  },
  blocks: {
    byCard: (cardId: string) => ['blocks', { cardId }] as const,
  },
  comments: {
    byCard: (cardId: string) => ['comments', { cardId }] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    unread: ['notifications', 'unread-count'] as const,
  },
  search: {
    query: (q: string, workspaceId?: string) => ['search', { q, workspaceId }] as const,
  },
  automations: {
    byBoard: (boardId: string) => ['automations', boardId] as const,
  },
} as const;
