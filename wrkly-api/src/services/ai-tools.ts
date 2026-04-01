import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import prisma from '../lib/prisma';
import { cardEvents, listEvents } from '../lib/realtime';

// ── Tool Definitions (OpenAI function-calling format) ─────────────────────────

export const AI_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'move_card',
      description: 'Move a card to a different list (column) on the board.',
      parameters: {
        type: 'object',
        properties: {
          cardId:       { type: 'string', description: 'ID of the card to move' },
          targetListId: { type: 'string', description: 'ID of the target list to move the card into' },
        },
        required: ['cardId', 'targetListId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_card',
      description: 'Create a new card in a specific list.',
      parameters: {
        type: 'object',
        properties: {
          listId:      { type: 'string', description: 'ID of the list to create the card in' },
          title:       { type: 'string', description: 'Title of the new card' },
          description: { type: 'string', description: 'Optional description for the card' },
        },
        required: ['listId', 'title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_list',
      description: 'Create a new list (column) on the board.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the new list' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'assign_member',
      description: 'Assign a team member to a card. Use the member name and the system will resolve it.',
      parameters: {
        type: 'object',
        properties: {
          cardId:     { type: 'string', description: 'ID of the card' },
          memberName: { type: 'string', description: 'Name of the member to assign' },
        },
        required: ['cardId', 'memberName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_assignee',
      description: 'Remove a member from a card.',
      parameters: {
        type: 'object',
        properties: {
          cardId: { type: 'string', description: 'ID of the card' },
          userId: { type: 'string', description: 'User ID to remove' },
        },
        required: ['cardId', 'userId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_due_date',
      description: 'Set or update the due date on a card.',
      parameters: {
        type: 'object',
        properties: {
          cardId:  { type: 'string', description: 'ID of the card' },
          dueDate: { type: 'string', description: 'ISO-8601 date string (e.g. "2026-04-15")' },
        },
        required: ['cardId', 'dueDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_label',
      description: 'Add a label to a card. Creates the label if it does not exist.',
      parameters: {
        type: 'object',
        properties: {
          cardId: { type: 'string', description: 'ID of the card' },
          label:  { type: 'string', description: 'Label name to add' },
        },
        required: ['cardId', 'label'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'archive_card',
      description: 'Archive (soft-delete) a card.',
      parameters: {
        type: 'object',
        properties: {
          cardId: { type: 'string', description: 'ID of the card to archive' },
        },
        required: ['cardId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rename_list',
      description: 'Rename an existing list.',
      parameters: {
        type: 'object',
        properties: {
          listId:  { type: 'string', description: 'ID of the list to rename' },
          newName: { type: 'string', description: 'New name for the list' },
        },
        required: ['listId', 'newName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_cards',
      description: 'Search for cards by title or label. Returns matching cards with their IDs.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (searches card titles and labels)' },
        },
        required: ['query'],
      },
    },
  },
];

// ── Tool Result Type ──────────────────────────────────────────────────────────

export interface ToolCallResult {
  toolName: string;
  args: Record<string, unknown>;
  success: boolean;
  result: string;
}

// ── Tool Executors ────────────────────────────────────────────────────────────

const LABEL_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  boardId: string,
  workspaceId: string,
  userId: string,
): Promise<ToolCallResult> {
  try {
    switch (toolName) {
      case 'move_card': {
        const cardId = String(args.cardId ?? '');
        const targetListId = String(args.targetListId ?? '');
        if (!cardId || !targetListId) return { toolName, args, success: false, result: 'Missing cardId or targetListId' };

        const last = await prisma.card.findFirst({
          where: { listId: targetListId, isArchived: false },
          orderBy: { position: 'desc' },
          select: { position: true },
        });
        const position = last ? last.position + 1.0 : 1.0;

        const card = await prisma.card.update({
          where: { id: cardId },
          data: { listId: targetListId, position },
          select: { id: true, title: true, list: { select: { name: true } } },
        });

        cardEvents.updated(boardId, { cardId: card.id, changes: { listId: targetListId, position } }, userId);
        return { toolName, args, success: true, result: `Moved "${card.title}" to "${card.list.name}"` };
      }

      case 'create_card': {
        const listId = String(args.listId ?? '');
        const title = String(args.title ?? '');
        const description = args.description ? String(args.description) : undefined;
        if (!listId || !title) return { toolName, args, success: false, result: 'Missing listId or title' };

        const last = await prisma.card.findFirst({
          where: { listId, isArchived: false },
          orderBy: { position: 'desc' },
          select: { position: true },
        });
        const position = last ? last.position + 1.0 : 1.0;

        const card = await prisma.card.create({
          data: { listId, title, description, position, createdById: userId },
          select: { id: true, title: true },
        });

        cardEvents.created(boardId, { card, listId }, userId);
        return { toolName, args, success: true, result: `Created card "${card.title}" (id: ${card.id})` };
      }

      case 'create_list': {
        const name = String(args.name ?? '');
        if (!name) return { toolName, args, success: false, result: 'Missing list name' };

        const last = await prisma.list.findFirst({
          where: { boardId, isArchived: false },
          orderBy: { position: 'desc' },
          select: { position: true },
        });
        const position = last ? last.position + 1.0 : 1.0;

        const list = await prisma.list.create({
          data: { boardId, name, position },
          select: { id: true, name: true },
        });

        listEvents.created(boardId, { list }, userId);
        return { toolName, args, success: true, result: `Created list "${list.name}" (id: ${list.id})` };
      }

      case 'assign_member': {
        const cardId = String(args.cardId ?? '');
        const memberName = String(args.memberName ?? '');
        if (!cardId || !memberName) return { toolName, args, success: false, result: 'Missing cardId or memberName' };

        // Fuzzy-find user in workspace
        const member = await prisma.workspaceMember.findFirst({
          where: {
            workspaceId,
            user: { name: { contains: memberName, mode: 'insensitive' } },
          },
          select: { userId: true, user: { select: { name: true } } },
        });
        if (!member) return { toolName, args, success: false, result: `Member "${memberName}" not found in workspace` };

        await prisma.cardAssignee.upsert({
          where: { cardId_userId: { cardId, userId: member.userId } },
          create: { cardId, userId: member.userId },
          update: {},
        });

        return { toolName, args, success: true, result: `Assigned ${member.user.name} to card` };
      }

      case 'remove_assignee': {
        const cardId = String(args.cardId ?? '');
        const targetUserId = String(args.userId ?? '');
        if (!cardId || !targetUserId) return { toolName, args, success: false, result: 'Missing cardId or userId' };

        await prisma.cardAssignee.deleteMany({
          where: { cardId, userId: targetUserId },
        });

        return { toolName, args, success: true, result: `Removed assignee from card` };
      }

      case 'set_due_date': {
        const cardId = String(args.cardId ?? '');
        const dueDate = String(args.dueDate ?? '');
        if (!cardId || !dueDate) return { toolName, args, success: false, result: 'Missing cardId or dueDate' };

        const card = await prisma.card.update({
          where: { id: cardId },
          data: { dueDate: new Date(dueDate) },
          select: { title: true },
        });

        cardEvents.updated(boardId, { cardId, changes: { dueDate } }, userId);
        return { toolName, args, success: true, result: `Set due date on "${card.title}" to ${dueDate}` };
      }

      case 'add_label': {
        const cardId = String(args.cardId ?? '');
        const labelName = String(args.label ?? '');
        if (!cardId || !labelName) return { toolName, args, success: false, result: 'Missing cardId or label' };

        // Find or create label
        let label = await prisma.label.findFirst({
          where: { boardId, name: { equals: labelName, mode: 'insensitive' } },
          select: { id: true },
        });
        if (!label) {
          const colorIndex = await prisma.label.count({ where: { boardId } });
          label = await prisma.label.create({
            data: { boardId, name: labelName, color: LABEL_COLORS[colorIndex % LABEL_COLORS.length] },
            select: { id: true },
          });
        }

        await prisma.cardLabel.upsert({
          where: { cardId_labelId: { cardId, labelId: label.id } },
          create: { cardId, labelId: label.id },
          update: {},
        });

        return { toolName, args, success: true, result: `Added label "${labelName}" to card` };
      }

      case 'archive_card': {
        const cardId = String(args.cardId ?? '');
        if (!cardId) return { toolName, args, success: false, result: 'Missing cardId' };

        const card = await prisma.card.update({
          where: { id: cardId },
          data: { isArchived: true },
          select: { title: true },
        });

        cardEvents.updated(boardId, { cardId, changes: { isArchived: true } }, userId);
        return { toolName, args, success: true, result: `Archived "${card.title}"` };
      }

      case 'rename_list': {
        const listId = String(args.listId ?? '');
        const newName = String(args.newName ?? '');
        if (!listId || !newName) return { toolName, args, success: false, result: 'Missing listId or newName' };

        const list = await prisma.list.update({
          where: { id: listId },
          data: { name: newName },
          select: { name: true },
        });

        listEvents.updated(boardId, { listId, name: list.name }, userId);
        return { toolName, args, success: true, result: `Renamed list to "${list.name}"` };
      }

      case 'search_cards': {
        const query = String(args.query ?? '');
        if (!query) return { toolName, args, success: false, result: 'Missing search query' };

        const cards = await prisma.card.findMany({
          where: {
            list: { boardId, isArchived: false },
            isArchived: false,
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { labels: { some: { label: { name: { contains: query, mode: 'insensitive' } } } } },
            ],
          },
          take: 10,
          select: {
            id: true,
            title: true,
            list: { select: { name: true } },
            labels: { select: { label: { select: { name: true } } } },
          },
        });

        if (cards.length === 0) return { toolName, args, success: true, result: 'No cards found matching query' };

        const lines = cards.map(
          (c) => `• "${c.title}" (id: ${c.id}) in "${c.list.name}" [${c.labels.map((l) => l.label?.name).join(', ')}]`
        ).join('\n');
        return { toolName, args, success: true, result: `Found ${cards.length} cards:\n${lines}` };
      }

      default:
        return { toolName, args, success: false, result: `Unknown tool: ${toolName}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { toolName, args, success: false, result: `Error: ${message}` };
  }
}
