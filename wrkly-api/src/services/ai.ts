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

// ── Board Insights Types ──────────────────────────────────────────────────────

export interface BoardInsightsContext extends BoardContext {
  members: Array<{
    userId:     string;
    name:       string;
    openCards:  number;
    doneCards:  number;
  }>;
  cardsWithDates: Array<{
    id:        string;
    title:     string;
    listName:  string;
    dueDate:   string | null;
    createdAt: string;
    assignees: string[];
    labels:    string[];
  }>;
  recentActivity: Array<{
    action:    string;
    createdAt: string;
  }>;
}

export interface BoardInsights {
  healthScore:    number; // 0–100
  healthLabel:    string; // "Excellent" | "Good" | "Fair" | "Needs Attention"
  bottlenecks:    Array<{ listName: string; cardCount: number; reason: string }>;
  velocity: {
    cardsCompletedThisWeek: number;
    cardsCompletedLastWeek: number;
    trend: 'up' | 'down' | 'stable';
  };
  distribution: {
    byList:     Array<{ name: string; count: number }>;
    byLabel:    Array<{ name: string; count: number }>;
    byAssignee: Array<{ name: string; count: number }>;
  };
  recommendations: string[];
}

export interface AssigneeSuggestion {
  userId:     string;
  name:       string;
  reason:     string;
  confidence: number; // 0–1
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

  // ── 5. analyzeBoardHealth ─────────────────────────────────────────────────

  /**
   * Analyzes full board state and returns structured health insights.
   * Temperature 0.4 — mostly deterministic with slight creativity for recommendations.
   */
  async analyzeBoardHealth(context: BoardInsightsContext): Promise<BoardInsights> {
    const memberLines = context.members
      .map((m) => `  • ${m.name}: ${m.openCards} open, ${m.doneCards} done`)
      .join('\n');

    const cardLines = context.cardsWithDates
      .slice(0, 60)
      .map((c) => {
        const due = c.dueDate ? `due: ${c.dueDate}` : 'no due date';
        const assignees = c.assignees.length ? `assigned: ${c.assignees.join(', ')}` : 'unassigned';
        return `  • "${c.title}" in "${c.listName}" [${due}, ${assignees}, labels: ${c.labels.join(', ') || 'none'}]`;
      })
      .join('\n');

    const activityLines = context.recentActivity
      .slice(0, 30)
      .map((a) => `  • ${a.action} at ${a.createdAt}`)
      .join('\n');

    const systemPrompt = `You are a project analytics AI. Analyze a Kanban board and return structured insights.

Always respond with ONLY valid JSON — no prose, no markdown fences.

Response format:
{
  "healthScore": <number 0-100>,
  "healthLabel": "<Excellent|Good|Fair|Needs Attention>",
  "bottlenecks": [{ "listName": "<string>", "cardCount": <number>, "reason": "<why this is a bottleneck>" }],
  "velocity": {
    "cardsCompletedThisWeek": <number>,
    "cardsCompletedLastWeek": <number>,
    "trend": "<up|down|stable>"
  },
  "distribution": {
    "byList": [{ "name": "<list name>", "count": <number of cards> }],
    "byLabel": [{ "name": "<label name>", "count": <number of cards> }],
    "byAssignee": [{ "name": "<member name>", "count": <number of open cards> }]
  },
  "recommendations": ["<actionable suggestion 1>", "<suggestion 2>", "<suggestion 3>"]
}

Rules:
- healthScore: 80-100 if "Done" list has more cards and few overdue. 0-40 if many overdue/stuck.
- bottlenecks: List any column with >5 cards or >40% of all cards.
- velocity: Estimate from recent activity timestamps and "done" patterns.
- recommendations: 3 specific, actionable suggestions like "Move 3 cards from In Progress to Review" or "Card X is overdue by 5 days".`;

    const userContent = [
      `Board: "${context.boardName}" (id: ${context.boardId})`,
      '',
      'Lists:', contextString(context),
      '',
      'Team Members:', memberLines || '  (no members)',
      '',
      'Cards with details:', cardLines || '  (no cards)',
      '',
      'Recent Activity (last 7 days):', activityLines || '  (no recent activity)',
    ].join('\n');

    const response = await this.client.chat.completions.create({
      model:       'gpt-4o-mini',
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '';
    const parsed = parseJSONSafely<BoardInsights>(raw);

    // Validate and default
    if (typeof parsed.healthScore !== 'number') parsed.healthScore = 50;
    if (!parsed.healthLabel) parsed.healthLabel = 'Fair';
    if (!Array.isArray(parsed.bottlenecks)) parsed.bottlenecks = [];
    if (!parsed.velocity) parsed.velocity = { cardsCompletedThisWeek: 0, cardsCompletedLastWeek: 0, trend: 'stable' };
    if (!parsed.distribution) parsed.distribution = { byList: [], byLabel: [], byAssignee: [] };
    if (!Array.isArray(parsed.recommendations)) parsed.recommendations = [];

    return parsed;
  }

  // ── 6. suggestAssignee ──────────────────────────────────────────────────

  /**
   * Suggests the best team member(s) to assign to a card based on workload and patterns.
   */
  async suggestAssignee(
    cardTitle: string,
    cardLabels: string[],
    listName: string,
    members: Array<{ userId: string; name: string; openCards: number; labels: string[] }>
  ): Promise<AssigneeSuggestion[]> {
    const systemPrompt = `You are a team workload optimizer. Given a card and team data, suggest the best assignee.

Always respond with ONLY valid JSON — no prose, no markdown fences.

Response format:
[
  { "userId": "<exact userId>", "name": "<member name>", "reason": "<short explanation>", "confidence": <0-1> }
]

Rules:
- Return 1-3 suggestions, ranked by fitness.
- Prefer members who already work on similar labels/lists (domain expertise).
- Penalize members with many open cards (overloaded).
- If a member has 0 open cards and matching labels, they're ideal.
- Use exact userId values from the provided data.`;

    const memberLines = members
      .map((m) => `  • ${m.name} (id: ${m.userId}): ${m.openCards} open cards, works on: ${m.labels.join(', ') || 'various'}`)
      .join('\n');

    const userContent = [
      `Card: "${cardTitle}" in list "${listName}"`,
      `Labels: ${cardLabels.join(', ') || 'none'}`,
      '',
      'Team Members:',
      memberLines,
    ].join('\n');

    const response = await this.client.chat.completions.create({
      model:       'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '';
    const parsed = parseJSONSafely<AssigneeSuggestion[]>(raw);

    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 3);
  }

  // ── 7. suggestCommentReplies ────────────────────────────────────────────

  /**
   * Generates 3 contextual reply suggestions for a card's comment thread.
   */
  async suggestCommentReplies(
    cardTitle: string,
    cardDescription: string | null,
    recentComments: Array<{ user: string; content: string }>
  ): Promise<string[]> {
    const systemPrompt = `You are a helpful project assistant. Given a card and its recent comments, suggest 3 short, contextual reply options.

Always respond with ONLY valid JSON — no prose, no markdown fences.

Response format: ["<reply 1>", "<reply 2>", "<reply 3>"]

Rules:
- Each reply should be 5-20 words, conversational and professional.
- Replies should be contextually relevant to the card's topic and recent comments.
- Include a mix: one acknowledgment, one question, one actionable suggestion.
- Never generate generic phrases like "I agree" — always reference specifics.`;

    const commentLines = recentComments
      .slice(-5)
      .map((c) => `  ${c.user}: "${c.content}"`)
      .join('\n');

    const userContent = [
      `Card: "${cardTitle}"`,
      cardDescription ? `Description: ${cardDescription.slice(0, 200)}` : '',
      '',
      'Recent comments:',
      commentLines || '  (no comments yet — suggest conversation starters)',
    ].join('\n');

    const response = await this.client.chat.completions.create({
      model:       'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '';
    const parsed = parseJSONSafely<string[]>(raw);

    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 3);
  }

  // ── 8. consolidateMemory ──────────────────────────────────────────────────

  /**
   * Compresses board history into a compact ~300-word summary.
   * Used by the "Dream Engine" background job.
   */
  async consolidateMemory(
    boardName: string,
    archivedCards: Array<{ title: string; listName: string; doneAt: string }>,
    activitySummary: string,
    memberNames: string[]
  ): Promise<string> {
    const systemPrompt = `You are a memory consolidation engine for a project management tool.
Given a board's historical data (archived cards, activity, team), compress it into a dense, structured summary of ~300 words.

Rules:
- Include which types of work were done (features, bugs, design, etc.)
- Note team member specializations observed from past work
- Summarize velocity patterns (how fast work moved)
- Highlight any recurring themes or patterns
- Do NOT list individual cards — summarize themes
- Respond in plain text only, no markdown fences`;

    const cardLines = archivedCards
      .slice(0, 100)
      .map((c) => `  • "${c.title}" in "${c.listName}" (closed: ${c.doneAt})`)
      .join('\n');

    const userContent = [
      `Board: "${boardName}"`,
      `Team: ${memberNames.join(', ')}`,
      '',
      `Archived/Closed Cards (${archivedCards.length} total):`,
      cardLines || '  (none)',
      '',
      'Recent Activity Summary:',
      activitySummary || '  (no activity)',
    ].join('\n');

    const response = await this.client.chat.completions.create({
      model:       'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent },
      ],
    });

    return (response.choices[0]?.message?.content ?? '').trim();
  }

  // ── 9. generateProjectPlan (ULTRAPLAN) ────────────────────────────────────

  /**
   * Generates a full project plan with lists, cards (max 50), assignments, and milestones.
   */
  async generateProjectPlan(
    goal: string,
    boardName: string,
    memberNames: string[],
    existingListNames: string[]
  ): Promise<ProjectPlan> {
    const systemPrompt = `You are an expert project planner and Kanban board architect.

Given a project goal, generate a complete project plan.

Always respond with ONLY valid JSON — no prose, no markdown fences.

Response format:
{
  "projectTitle": "<concise project title>",
  "lists": [
    {
      "name": "<list name>",
      "cards": [
        {
          "title": "<concise task title>",
          "description": "<1-2 sentence description>",
          "suggestedAssignee": "<team member name or null>",
          "estimatedDays": <number 1-14>,
          "labels": ["<label1>", "<label2>"],
          "priority": "<high|medium|low>"
        }
      ]
    }
  ],
  "milestones": ["<milestone 1>", "<milestone 2>", "<milestone 3>"]
}

Rules:
- Create 3-7 lists with logical workflow stages
- Total cards across all lists MUST NOT exceed 50
- Each card should be specific, actionable, and have a clear title
- Assign members based on name matching — use exact names from the provided team
- Set estimatedDays realistically (1-14 range)
- Add 2-5 milestones that mark key project checkpoints
- Labels should be consistent across cards (e.g., "design", "dev", "research")
- If existing lists are provided, reuse their names where appropriate
- Do NOT generate IDs — the system will assign them`;

    const userContent = [
      `Project Goal: "${goal}"`,
      `Board: "${boardName}"`,
      `Team Members: ${memberNames.length ? memberNames.join(', ') : 'none specified'}`,
      `Existing Lists: ${existingListNames.length ? existingListNames.join(', ') : 'none (create new)'}`,
    ].join('\n');

    const response = await this.client.chat.completions.create({
      model:       'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '';
    const parsed = parseJSONSafely<ProjectPlan>(raw);

    // Validate and cap
    if (!parsed.projectTitle) parsed.projectTitle = goal.slice(0, 60);
    if (!Array.isArray(parsed.lists)) parsed.lists = [];
    if (!Array.isArray(parsed.milestones)) parsed.milestones = [];

    // Enforce 50 card cap
    let totalCards = 0;
    for (const list of parsed.lists) {
      if (!Array.isArray(list.cards)) list.cards = [];
      const remaining = 50 - totalCards;
      if (list.cards.length > remaining) {
        list.cards = list.cards.slice(0, remaining);
      }
      totalCards += list.cards.length;
    }

    return parsed;
  }

  // ── 10. executeWithTools (Agent Mode) ─────────────────────────────────────

  /**
   * Uses OpenAI function-calling to plan tool calls for a command.
   * Returns the planned tool calls for user confirmation (does NOT execute them).
   */
  async planWithTools(
    command: string,
    context: BoardContext,
    memoryContext?: string
  ): Promise<AgentPlan> {
    const { AI_TOOLS } = await import('./ai-tools');

    const memorySection = memoryContext
      ? `\n\nBoard Memory (compressed history):\n${memoryContext}`
      : '';

    const systemPrompt = `You are an intelligent project management agent with access to tools.

Given a natural language command and the current board state, use available tools to accomplish the task.
Plan and call as many tools as needed to fully accomplish the user's request.

Important rules:
- Use exact IDs from the board context — never invent IDs
- If you need to search before acting (e.g., finding cards by name), use search_cards first
- For bulk operations, emit one tool call per item
- Be thorough — if the user says "all", operate on every matching item

Current board context:
${contextString(context)}${memorySection}`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string; tool_call_id?: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: command },
    ];

    // Let the model make up to 5 rounds of tool calls (for chaining e.g., search then operate)
    const allToolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

    for (let round = 0; round < 5; round++) {
      const response = await this.client.chat.completions.create({
        model:       'gpt-4o-mini',
        temperature: 0.2,
        messages:    messages as Parameters<typeof this.client.chat.completions.create>[0]['messages'],
        tools:       AI_TOOLS,
        tool_choice: round === 0 ? 'auto' : 'auto',
      });

      const assistantMessage = response.choices[0]?.message;
      if (!assistantMessage) break;

      // If no tool calls, the model is done planning
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        break;
      }

      // Collect tool calls
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages.push(assistantMessage as any);

      for (const tc of assistantMessage.tool_calls) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const funcCall = tc as any;
        if (!funcCall.function) continue;
        const args = JSON.parse(funcCall.function.arguments || '{}');
        allToolCalls.push({ name: funcCall.function.name, args });

        // For search_cards, we simulate the result so the model can chain
        if (funcCall.function.name === 'search_cards') {
          const query = String(args.query ?? '');
          const matchingCards = context.cards
            .filter((c) => c.title.toLowerCase().includes(query.toLowerCase())
              || c.labels.some((l) => l.toLowerCase().includes(query.toLowerCase())))
            .slice(0, 10);

          const resultText = matchingCards.length === 0
            ? 'No cards found'
            : matchingCards.map((c) => `• "${c.title}" (id: ${c.id}) → list: ${c.listId}`).join('\n');

          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: resultText,
          });
        } else {
          // For non-search tools, acknowledge they'll be executed later
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: `[Queued for execution after user approval]`,
          });
        }
      }
    }

    // Generate a summary of what was planned
    const summary = allToolCalls.length === 0
      ? 'No actions needed for this command.'
      : `Planned ${allToolCalls.length} action(s) to execute.`;

    return {
      toolCalls: allToolCalls.filter((tc) => tc.name !== 'search_cards'), // Exclude search from execution
      summary,
    };
  }
}

// ── Types (exported) ──────────────────────────────────────────────────────────

export interface ProjectPlanCard {
  title:             string;
  description?:      string;
  suggestedAssignee?: string | null;
  estimatedDays?:    number;
  labels?:           string[];
  priority?:         string;
}

export interface ProjectPlanList {
  name:  string;
  cards: ProjectPlanCard[];
}

export interface ProjectPlan {
  projectTitle: string;
  lists:        ProjectPlanList[];
  milestones:   string[];
}

export interface AgentPlan {
  toolCalls: Array<{ name: string; args: Record<string, unknown> }>;
  summary:   string;
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const aiService = new AIService();
