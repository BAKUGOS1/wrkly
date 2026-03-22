import OpenAI from 'openai';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BoardContext {
  boardId:   string;
  boardName: string;
  lists: Array<{
    id:        string;
    name:      string;
    cardCount: number;
  }>;
  cards: Array<{
    id:     string;
    title:  string;
    listId: string;
    labels: string[];
  }>;
}

export type ActionType =
  | 'create_list'
  | 'create_card'
  | 'move_card'
  | 'add_label'
  | 'set_due_date'
  | 'archive_card';

export interface ParsedAction {
  type:   ActionType;
  params: Record<string, unknown>;
}

export interface ParsedActions {
  interpretation: string;
  actions:        ParsedAction[];
  confidence:     number; // 0–1
}

export interface GeneratedCard {
  title:        string;
  description?: string;
}

export interface GeneratedList {
  name:  string;
  cards: GeneratedCard[];
}

export interface GeneratedBoard {
  lists: GeneratedList[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse JSON from an AI response, stripping markdown fences if present. */
function parseJSONSafely<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned) as T;
  return parsed;
}

/** Build a compact context string the model can reference. */
function contextString(board: BoardContext): string {
  const listLines = board.lists
    .map((l) => `  • "${l.name}" (id: ${l.id}, ${l.cardCount} cards)`)
    .join('\n');

  const cardLines = board.cards
    .slice(0, 80) // Cap at 80 cards to avoid token bloat
    .map((c) => {
      const labels = c.labels.length ? ` [${c.labels.join(', ')}]` : '';
      return `  • "${c.title}"${labels} → list id: ${c.listId}`;
    })
    .join('\n');

  return [
    `Board: "${board.boardName}" (id: ${board.boardId})`,
    'Lists:',
    listLines,
    'Cards:',
    cardLines || '  (no cards)',
  ].join('\n');
}

// ── Service class ─────────────────────────────────────────────────────────────

class AIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30_000,
    });
  }

  // ── 1. parseCommand ─────────────────────────────────────────────────────────

  /**
   * Parses a natural-language board command into a structured list of actions.
   *
   * Temperature 0.3 — deterministic, exact JSON output required.
   */
  async parseCommand(
    command: string,
    context: BoardContext
  ): Promise<ParsedActions> {
    const systemPrompt = `You are a project management AI that converts natural language commands into structured actions for a Kanban board.

Always respond with ONLY valid JSON — no prose, no markdown fences.

Response format:
{
  "interpretation": "<one-sentence plain-English explanation of what you understood>",
  "confidence": <number 0–1>,
  "actions": [
    {
      "type": "<one of: create_list | create_card | move_card | add_label | set_due_date | archive_card>",
      "params": {
        /* Fields depend on type:
           create_list  → { "name": string }
           create_card  → { "listId": string, "title": string, "description"?: string }
           move_card    → { "cardId": string, "targetListId": string }
           add_label    → { "cardId": string, "label": string }
           set_due_date → { "cardId": string, "dueDate": "ISO-8601 date string" }
           archive_card → { "cardId": string } */
      }
    }
  ]
}

Rules:
- Use exact IDs from the provided board context.
- If the command targets multiple items (e.g. "all bug cards"), emit one action per item.
- If you cannot match a name to a specific id, use the name as a "name" param instead and omit "id".
- Set confidence < 0.5 if the command is ambiguous.
- Never invent list or card IDs that are not in the context.`;

    const userContent = [
      'Current board context:',
      contextString(context),
      '',
      `Command: "${command}"`,
    ].join('\n');

    const response = await this.client.chat.completions.create({
      model:       'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        { role: 'system',  content: systemPrompt },
        { role: 'user',    content: userContent  },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '';
    const parsed = parseJSONSafely<ParsedActions>(raw);

    // Validate required fields
    if (typeof parsed.interpretation !== 'string') {
      throw new Error('AI returned invalid parseCommand response: missing interpretation');
    }
    if (!Array.isArray(parsed.actions)) {
      throw new Error('AI returned invalid parseCommand response: actions must be an array');
    }
    if (typeof parsed.confidence !== 'number') {
      parsed.confidence = 0.5; // Default gracefully
    }

    return parsed;
  }

  // ── 2. summarizeBoard ───────────────────────────────────────────────────────

  /**
   * Generates a concise 2–4 sentence status summary of the board.
   *
   * Temperature 0.5 — coherent prose, mild creativity.
   */
  async summarizeBoard(board: BoardContext): Promise<string> {
    const systemPrompt = `You are a concise project manager. Given a Kanban board's current state, write a 2-4 sentence status summary suitable for a daily standup. Be direct, concrete, and highlight blockers or progress. Respond in plain text only — no markdown, no bullet lists.`;

    const response = await this.client.chat.completions.create({
      model:       'gpt-4o-mini',
      temperature: 0.5,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: contextString(board) },
      ],
    });

    return (response.choices[0]?.message?.content ?? '').trim();
  }

  // ── 3. generateTasks ────────────────────────────────────────────────────────

  /**
   * Breaks down a project description into a Kanban board with lists and cards.
   *
   * Temperature 0.7 — creative, varied output.
   */
  async generateTasks(description: string): Promise<GeneratedBoard> {
    const systemPrompt = `You are an expert project planner. Given a project description, generate a complete Kanban board structure.

Always respond with ONLY valid JSON — no prose, no markdown fences.

Response format:
{
  "lists": [
    {
      "name": "<list name>",
      "cards": [
        { "title": "<concise task title>", "description": "<optional 1-sentence description>" }
      ]
    }
  ]
}

Rules:
- Create 3-5 lists (e.g. Backlog, In Progress, Review, Done — adapt to context).
- Each list should have 2-6 actionable, specific tasks.
- Task titles should be imperative (e.g. "Set up database schema").
- Keep descriptions short and optional — skip them if obvious from the title.
- Do not add IDs — the client will assign them.`;

    const response = await this.client.chat.completions.create({
      model:       'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: `Project description: ${description}` },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '';
    const parsed = parseJSONSafely<GeneratedBoard>(raw);

    // Validate structure
    if (!Array.isArray(parsed.lists)) {
      throw new Error('AI returned invalid generateTasks response: lists must be an array');
    }
    for (const list of parsed.lists) {
      if (typeof list.name !== 'string' || !Array.isArray(list.cards)) {
        throw new Error('AI returned malformed list in generateTasks response');
      }
    }

    return parsed;
  }

  // ── 4. assistCardContent ────────────────────────────────────────────────────

  async assistCardContent(
    currentContent: string,
    action: string,
    customPrompt?: string
  ): Promise<string> {
    let instruction = '';
    switch (action) {
      case 'improve':
        instruction = 'Improve the writing of the following text, making it clearer and more professional. Maintain the original meaning.';
        break;
      case 'shorter':
        instruction = 'Rewrite the following text to be significantly shorter and more concise while keeping the main points.';
        break;
      case 'detailed':
        instruction = 'Expand on the following text, adding more helpful context, potential acceptance criteria, or specific details suitable for a project management task.';
        break;
      case 'checklist':
        instruction = 'Convert the following text into a markdown checklist (using "- [ ] "). Extract the actionable items.';
        break;
      case 'custom':
        instruction = customPrompt ? customPrompt : 'Improve the following text.';
        break;
      default:
        instruction = 'Improve the writing of the following text.';
    }

    const systemPrompt = `You are a helpful AI writing assistant for a project management app.
Your task is to rewrite or modify the user's text based on the given instruction.
Respond ONLY with the modified text — no conversational filler, no markdown blocks around the text.`;

    const userContent = `Instruction: ${instruction}\n\nText to modify:\n${currentContent}`;

    const response = await this.client.chat.completions.create({
      model:       'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent },
      ],
    });

    return (response.choices[0]?.message?.content ?? '').trim();
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const aiService = new AIService();
