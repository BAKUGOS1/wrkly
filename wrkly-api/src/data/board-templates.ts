// ── Board template definitions (MVP hardcoded) ────────────────────────────────

export interface BoardTemplate {
  id:          string;
  name:        string;
  description: string;
  lists:       string[];
  preview:     string; // emoji or short icon key used by the frontend
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id:          'sprint-board',
    name:        'Sprint Board',
    description: 'Agile sprint workflow with backlog, active work, and review stages',
    lists:       ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'],
    preview:     '🏃',
  },
  {
    id:          'content-calendar',
    name:        'Content Calendar',
    description: 'Content pipeline from ideation to publication',
    lists:       ['Ideas', 'Drafting', 'Editing', 'Scheduled', 'Published'],
    preview:     '📅',
  },
  {
    id:          'bug-tracker',
    name:        'Bug Tracker',
    description: 'Track and resolve bugs by severity and status',
    lists:       ['Reported', 'Confirmed', 'In Progress', 'Testing', 'Resolved'],
    preview:     '🐛',
  },
  {
    id:          'simple-kanban',
    name:        'Simple Kanban',
    description: 'Basic three-column workflow',
    lists:       ['To Do', 'Doing', 'Done'],
    preview:     '📋',
  },
];

/** Quick lookup by template ID. */
export const TEMPLATES_BY_ID = new Map(
  BOARD_TEMPLATES.map((t) => [t.id, t])
);
