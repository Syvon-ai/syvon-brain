import { describe, expect, it } from 'vitest';
import { exposedToolsFor, parseMcpDeclaration } from '../dna/mcp-declaration';

/**
 * `lend` separates SHOWN from LENT.
 *
 * One file was answering two questions with opposite instincts. A honeycomb is
 * a display of what an agent does, and a maker's is meant to be near-total —
 * syvon declares 108 tools and that is honest. `Actor.exposedTools` is a
 * capability grant to anyone holding the node token, and it was derived from
 * that same list, so "show everything" silently read as "lend everything",
 * run_terminal_command and delete_file included.
 */

function server(raw: Record<string, unknown>, slug = 'default') {
  return parseMcpDeclaration(raw, `config/mcp/${slug}.json`, slug)!;
}

describe('lend', () => {
  it('defaults to LENT, so every declaration written before it is unchanged', () => {
    const s = server({ tools: [{ name: 'read_file' }] });
    expect(s.lend).toBeUndefined();
    expect(exposedToolsFor([s])).toEqual(['read_file']);
  });

  it('grants nothing from a surface marked lend:false', () => {
    const s = server({ lend: false, tools: [{ name: 'run_terminal_command' }, { name: 'delete_file' }] });
    expect(exposedToolsFor([s])).toEqual([]);
  });

  it('keeps the tools on the parsed surface — they are still SHOWN', () => {
    // The honeycomb reads the same declaration. Dropping the tools here would
    // fix the grant by deleting the display, which is not the trade.
    const s = server({ lend: false, tools: [{ name: 'run_terminal_command' }] });
    expect(s.tools?.map((t) => t.name)).toEqual(['run_terminal_command']);
  });

  it('merges a shown-only surface with a lent one, taking only the lent names', () => {
    // syvon's real shape: a 108-tool honeycomb beside a small borrow surface.
    const honeycomb = server({ lend: false, tools: [{ name: 'delete_file' }, { name: 'read_file' }] }, 'legacy');
    const borrow = server({ tools: [{ name: 'read_file' }, { name: 'read_design' }] }, 'borrow');
    expect(exposedToolsFor([honeycomb, borrow])).toEqual(['read_design', 'read_file']);
  });

  it('ignores a non-boolean lend rather than treating it as false', () => {
    // A typo must not silently revoke an agent's whole surface — the failure
    // would look like an outage, not a config error.
    const s = server({ lend: 'no', tools: [{ name: 'read_file' }] });
    expect(s.lend).toBeUndefined();
    expect(exposedToolsFor([s])).toEqual(['read_file']);
  });

  it('still drops brain-runtime tools from a lent surface', () => {
    // The two exclusions are independent: one is "not an MCP tool", the other
    // is "not yours to run".
    const s = server({ tools: [{ name: 'search_agents', runtime: 'brain' }, { name: 'search_web' }] });
    expect(exposedToolsFor([s])).toEqual(['search_web']);
  });
});
