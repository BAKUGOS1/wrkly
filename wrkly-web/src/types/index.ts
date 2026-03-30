export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  oauthProvider?: string | null;
  oauthId?: string | null;
  notificationSettings?: {
    emailGlobal?: boolean;
    mentions?: boolean;
    dueReminders?: boolean;
    assignments?: boolean;
    automations?: boolean;
  } | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  ownerId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: string | Date;
}

export interface Board {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  background?: string | null;
  isArchived: boolean;
  createdById: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface List {
  id: string;
  boardId: string;
  name: string;
  position: number;
  isArchived: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Label {
  id: string;
  boardId: string;
  name?: string | null;
  color: string;
}

export interface Block {
  id: string;
  cardId: string;
  type: 'TEXT' | 'CHECKLIST' | 'CODE' | 'IMAGE' | 'FILE' | 'DIVIDER';
  content: Record<string, unknown>;
  position: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Comment {
  id: string;
  cardId: string;
  userId: string;
  content: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Card {
  id: string;
  listId: string;
  title: string;
  description?: string | null;
  position: number;
  dueDate?: string | Date | null;
  reminderAt?: string | Date | null;
  coverImage?: string | null;
  isArchived: boolean;
  createdById: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CardDetail extends Card {
  blocks: Block[];
  comments: Comment[];
  labels?: Label[];
  assignees?: User[];
}

export interface BoardFull extends Board {
  lists: (List & { cards: CardDetail[] })[];
  labels?: Label[];
}

export interface AutomationRule {
  id: string;
  boardId: string;
  name: string;
  isActive: boolean;
  trigger: Record<string, unknown>;
  conditions?: Record<string, unknown> | null;
  actions: Record<string, unknown>;
  createdById: string;
  runCount: number;
  lastRunAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  isRead: boolean;
  createdAt: string | Date;
}
