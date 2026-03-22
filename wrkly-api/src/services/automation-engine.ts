import prisma from '../lib/prisma';
import { createNotification } from './notifications';
import { cardEvents } from '../lib/realtime';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BoardEvent {
  type: string; // "card.moved", "card.created", "label.added", etc.
  boardId: string;
  cardId?: string;
  userId?: string;
  data: Record<string, unknown>;
}

interface AutomationTrigger {
  event: string;
  [key: string]: unknown;
}

interface AutomationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'not_equals';
  value: unknown;
}

interface AutomationAction {
  type: string;
  params: Record<string, unknown>;
}

interface AutomationRuleRecord {
  id: string;
  boardId: string;
  name: string;
  isActive: boolean;
  trigger: unknown;
  conditions: unknown;
  actions: unknown;
  runCount: number;
  lastRunAt: Date | null;
  createdById: string;
}

// ── Anti-loop protection ──────────────────────────────────────────────────────

const MAX_RECURSION_DEPTH = 3;
/** Tracks recursion depth per ruleId within a single top-level evaluate() call. */
const executionDepth = new Map<string, number>();

class AutomationEngine {
  // ── Public evaluate() ─────────────────────────────────────────────────────────

  async evaluate(event: BoardEvent): Promise<void> {
    const rules = await prisma.automationRule.findMany({
      where: { boardId: event.boardId, isActive: true },
    });

    for (const rule of rules) {
      const ruleRecord = rule as unknown as AutomationRuleRecord;

      try {
        if (!this.matchesTrigger(ruleRecord, event)) continue;
        if (!this.matchesConditions(ruleRecord, event)) continue;

        // Check recursion depth
        const depth = executionDepth.get(rule.id) ?? 0;
        if (depth >= MAX_RECURSION_DEPTH) {
          console.warn(`[automation] Rule "${rule.name}" (${rule.id}) recursion depth exceeded — skipping`);
          continue;
        }

        // Fetch the card if cardId is present
        let card: { id: string; title: string; listId: string; list: { boardId: string; workspaceId?: string } } | null = null;
        if (event.cardId) {
          card = await prisma.card.findUnique({
            where: { id: event.cardId },
            select: {
              id:    true,
              title: true,
              listId: true,
              list: { select: { boardId: true } },
            },
          }) as typeof card;
        }

        executionDepth.set(rule.id, depth + 1);
        await this.executeActions(ruleRecord, card, event);
      } catch (err) {
        console.error(`[automation] Rule "${rule.name}" (${rule.id}) failed:`, err);
      } finally {
        // Decrement depth (reset if back at top-level)
        const current = executionDepth.get(rule.id) ?? 1;
        if (current <= 1) {
          executionDepth.delete(rule.id);
        } else {
          executionDepth.set(rule.id, current - 1);
        }
      }
    }
  }

  // ── executeActions() ─────────────────────────────────────────────────────────

  async executeActions(
    rule: AutomationRuleRecord,
    card: { id: string; title: string; listId: string; list: { boardId: string } } | null,
    event: BoardEvent
  ): Promise<void> {
    const actions = (Array.isArray(rule.actions) ? rule.actions : []) as AutomationAction[];

    // Fetch workspaceId once
    const board = await prisma.board.findUnique({
      where: { id: rule.boardId },
      select: { workspaceId: true },
    });
    if (!board) return;

    for (const action of actions) {
      try {
        await this.executeAction(action, card, event, rule.boardId, board.workspaceId, rule);
      } catch (err) {
        console.error(`[automation] Action "${action.type}" in rule "${rule.name}" failed:`, err);
        // Continue — never block other actions
      }
    }

    // Increment runCount and update lastRunAt
    await prisma.automationRule.update({
      where: { id: rule.id },
      data: { runCount: { increment: 1 }, lastRunAt: new Date() },
    });

    // Log automation activity
    await prisma.activityLog.create({
      data: {
        workspaceId: board.workspaceId,
        boardId:     rule.boardId,
        cardId:      card?.id,
        userId:      event.userId,
        action:      `automation:ran:${rule.name}`,
        metadata:    { ruleId: rule.id, trigger: event.type },
      },
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private matchesTrigger(rule: AutomationRuleRecord, event: BoardEvent): boolean {
    const trigger = rule.trigger as AutomationTrigger;
    if (!trigger || trigger.event !== event.type) return false;

    // Extra trigger-specific conditions (e.g., from_list, to_list on card.moved)
    if (trigger.from_list_name && event.data.fromListName !== trigger.from_list_name) return false;
    if (trigger.to_list_name   && event.data.toListName   !== trigger.to_list_name)   return false;
    if (trigger.label_name     && event.data.labelName     !== trigger.label_name)     return false;

    return true;
  }

  private matchesConditions(rule: AutomationRuleRecord, event: BoardEvent): boolean {
    if (!rule.conditions) return true;
    const conditions = (Array.isArray(rule.conditions) ? rule.conditions : []) as AutomationCondition[];

    return conditions.every((condition) => {
      const fieldValue = this.resolveField(condition.field, event);
      switch (condition.operator) {
        case 'equals':     return fieldValue === condition.value;
        case 'not_equals': return fieldValue !== condition.value;
        case 'contains':   return typeof fieldValue === 'string' && fieldValue.includes(String(condition.value));
        default:           return true;
      }
    });
  }

  private resolveField(field: string, event: BoardEvent): unknown {
    // Support dot-notation access on event.data
    return field.split('.').reduce<unknown>((obj, key) => {
      if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
      return undefined;
    }, event.data);
  }

  // ── Individual action executors ───────────────────────────────────────────────

  private async executeAction(
    action: AutomationAction,
    card: { id: string; title: string; listId: string; list: { boardId: string } } | null,
    event: BoardEvent,
    boardId: string,
    workspaceId: string,
    rule: AutomationRuleRecord
  ): Promise<void> {
    switch (action.type) {
      // ── add_label ─────────────────────────────────────────────────────────────
      case 'add_label': {
        if (!card) return;
        const labelName = String(action.params.label ?? '').trim();
        if (!labelName) return;

        const label = await prisma.label.findFirst({
          where: { boardId, name: { equals: labelName, mode: 'insensitive' } },
          select: { id: true },
        });
        if (!label) return;

        await prisma.cardLabel.upsert({
          where:  { cardId_labelId: { cardId: card.id, labelId: label.id } },
          update: {},
          create: { cardId: card.id, labelId: label.id },
        });

        const labels = await prisma.cardLabel.findMany({
          where:  { cardId: card.id },
          select: { label: { select: { id: true, name: true, color: true } } },
        });
        cardEvents.labelsChanged(boardId, { cardId: card.id, labels: labels.map((cl: { label: { id: string; name: string | null; color: string } }) => cl.label) });
        break;
      }

      // ── remove_label ──────────────────────────────────────────────────────────
      case 'remove_label': {
        if (!card) return;
        const labelName = String(action.params.label ?? '').trim();
        if (!labelName) return;

        const label = await prisma.label.findFirst({
          where: { boardId, name: { equals: labelName, mode: 'insensitive' } },
          select: { id: true },
        });
        if (!label) return;

        await prisma.cardLabel.deleteMany({
          where: { cardId: card.id, labelId: label.id },
        });

        const labels = await prisma.cardLabel.findMany({
          where:  { cardId: card.id },
          select: { label: { select: { id: true, name: true, color: true } } },
        });
        cardEvents.labelsChanged(boardId, { cardId: card.id, labels: labels.map((cl: { label: { id: string; name: string | null; color: string } }) => cl.label) });
        break;
      }

      // ── move_card ─────────────────────────────────────────────────────────────
      case 'move_card': {
        if (!card) return;
        const targetListName = String(action.params.list_name ?? '').trim();
        if (!targetListName) return;

        const targetList = await prisma.list.findFirst({
          where: { boardId, name: { equals: targetListName, mode: 'insensitive' }, isArchived: false },
          select: { id: true },
        });
        if (!targetList) return;
        if (targetList.id === card.listId) return; // Already there — idempotent

        const lastCard = await prisma.card.findFirst({
          where:   { listId: targetList.id, isArchived: false },
          orderBy: { position: 'desc' },
          select:  { position: true },
        });
        const newPosition = lastCard ? lastCard.position + 1.0 : 1.0;

        await prisma.card.update({
          where: { id: card.id },
          data:  { listId: targetList.id, position: newPosition },
        });

        cardEvents.moved(boardId, {
          cardId:     card.id,
          fromListId: card.listId,
          toListId:   targetList.id,
          position:   newPosition,
        });

        // Fire a new event so subsequent rule evaluations see the move
        await automationEngine.evaluate({
          type:    'card.moved',
          boardId,
          cardId:  card.id,
          userId:  event.userId,
          data: {
            fromListId:  card.listId,
            toListId:    targetList.id,
            toListName:  targetListName,
          },
        });
        break;
      }

      // ── assign_user ───────────────────────────────────────────────────────────
      case 'assign_user': {
        if (!card) return;
        const userId = String(action.params.userId ?? '').trim();
        if (!userId) return;

        await prisma.cardAssignee.upsert({
          where:  { cardId_userId: { cardId: card.id, userId } },
          update: {},
          create: { cardId: card.id, userId },
        });

        const assignees = await prisma.cardAssignee.findMany({
          where:  { cardId: card.id },
          select: { user: { select: { id: true, name: true, avatarUrl: true } } },
        });
        cardEvents.assigneesChanged(boardId, { cardId: card.id, assignees: assignees.map((a: { user: { id: string; name: string; avatarUrl: string | null } }) => a.user) });
        break;
      }

      // ── set_due_date ──────────────────────────────────────────────────────────
      case 'set_due_date': {
        if (!card) return;
        let dueDate: Date | null = null;

        if (action.params.offset_days !== undefined) {
          const offsetDays = Number(action.params.offset_days);
          dueDate = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
        } else if (action.params.date) {
          dueDate = new Date(String(action.params.date));
          if (isNaN(dueDate.getTime())) dueDate = null;
        }

        await prisma.card.update({
          where: { id: card.id },
          data:  { dueDate },
        });

        cardEvents.updated(boardId, { cardId: card.id, changes: { dueDate: dueDate?.toISOString() ?? null } });
        break;
      }

      // ── send_notification ─────────────────────────────────────────────────────
      case 'send_notification': {
        const title = String(action.params.title ?? 'Automation notification').trim();
        const body  = action.params.body ? String(action.params.body) : undefined;

        // Send to assignees, creator, or specific userId
        const targetUserIds: string[] = [];

        if (action.params.target === 'assignees' && card) {
          const assignees = await prisma.cardAssignee.findMany({
            where:  { cardId: card.id },
            select: { userId: true },
          });
          targetUserIds.push(...assignees.map((a: { userId: string }) => a.userId));
        } else if (action.params.target === 'workspace_members') {
          const members = await prisma.workspaceMember.findMany({
            where:  { workspaceId: workspaceId },
            select: { userId: true },
          });
          targetUserIds.push(...members.map((m: { userId: string }) => m.userId));
        } else if (action.params.userId) {
          targetUserIds.push(String(action.params.userId));
        }

        for (const userId of [...new Set(targetUserIds)]) {
          await createNotification({
            userId,
            type:  'automation',
            title,
            body,
            link:  card ? `/board/${boardId}?card=${card.id}` : `/board/${boardId}`,
          });
        }
        break;
      }

      // ── add_comment ───────────────────────────────────────────────────────────
      case 'add_comment': {
        if (!card) return;
        const content = String(action.params.content ?? '').trim();
        if (!content) return;

        // Use the rule creator as the comment author (or a system placeholder)
        const authorId = String(action.params.userId ?? rule.createdById);

        await prisma.comment.create({
          data: {
            cardId:  card.id,
            userId:  authorId,
            content: `[Automation: ${rule.name}] ${content}`,
          },
        });
        break;
      }

      // ── archive_card ──────────────────────────────────────────────────────────
      case 'archive_card': {
        if (!card) return;

        await prisma.card.update({
          where: { id: card.id },
          data:  { isArchived: true },
        });

        cardEvents.archived(boardId, { cardId: card.id, listId: card.listId });
        break;
      }

      // ── webhook ───────────────────────────────────────────────────────────────
      case 'webhook': {
        const url = String(action.params.url ?? '').trim();
        if (!url) return;

        const payload = {
          event,
          rule: { id: rule.id, name: rule.name },
          card: card ? { id: card.id, title: card.title } : null,
        };

        // Fire-and-forget the webhook — don't await so it never blocks
        fetch(url, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
          signal:  AbortSignal.timeout(10_000), // 10s timeout
        }).catch((err) => {
          console.warn(`[automation] Webhook to ${url} failed:`, err.message ?? err);
        });
        break;
      }

      default:
        console.warn(`[automation] Unknown action type: ${action.type}`);
    }
  }
}

export const automationEngine = new AutomationEngine();
