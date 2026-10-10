/**
 * TOOLS THAT CHANGED NAME — old name → current name, one copy.
 *
 * The card tools became task tools when the ledger split into tasks and notes
 * (`ledger/tasks-notes.ts`). A name is written down in more places than code:
 * a workspace's `config/mcp*.json` allowlist, a prompt queued on a lane before
 * the rename, a skill served from an older build, a person's muscle memory.
 * So an old name is never an error. `parseMcpDeclaration` reads it as the
 * current one, and the agent's registry answers a call made by it.
 */
export const TOOL_RENAMES: Readonly<Record<string, string>> = {
  list_cards: 'list_tasks',
  resolve_card: 'resolve_task',
  create_card: 'create_task',
  card_activity: 'task_activity',
};

/** The current name for a tool name, old or new. */
export function currentToolName(name: string): string {
  return TOOL_RENAMES[name] ?? name;
}
