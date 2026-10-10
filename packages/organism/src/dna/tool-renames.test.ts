import { describe, expect, it } from 'vitest';
import { TOOL_RENAMES, currentToolName } from './tool-renames';
import { parseMcpDeclaration } from './mcp-declaration';

describe('tool renames', () => {
  it('maps every card tool to its task name and leaves others alone', () => {
    expect(TOOL_RENAMES).toEqual({ list_cards: 'list_tasks', resolve_card: 'resolve_task',
      create_card: 'create_task', card_activity: 'task_activity' });
    expect(currentToolName('list_cards')).toBe('list_tasks');
    expect(currentToolName('list_tasks')).toBe('list_tasks');
    expect(currentToolName('validate')).toBe('validate');
  });

  it('reads an allowlist written with old names as the current tools', () => {
    const parsed = parseMcpDeclaration({ tools: ['list_cards', { name: 'resolve_card', icon: 'task_alt' }, 'validate'] },
      'config/mcp/build.json', 'build');
    expect(parsed?.tools?.map((t) => t.name)).toEqual(['list_tasks', 'resolve_task', 'validate']);
  });
});
