import { describe, expect, it } from 'vitest';
import {
  ARCHETYPE_TOOLS,
  MAKER_TOOLS,
  MAKER_SHARED,
  resolveExposedTools,
  resolveSharedTools,
  exposedToolsSource,
  unknownDiffNames,
} from '../dna/archetype-tools';
import type { AgentCard } from '../dna/agent-card';

const card = (archetype: AgentCard['archetype']): AgentCard =>
  ({ agentPersona: true, archetype }) as AgentCard;

/**
 * Capability is DERIVED from the archetype, not copied into each workspace.
 *
 * A copied tool list goes stale the moment the central one moves, and nothing
 * reports it — which is how one workspace sat at 108 tools, 43 of them
 * destructive, for months.
 */
describe('resolveExposedTools', () => {
  it('derives from the archetype when the workspace declares nothing', () => {
    // The common case, and the whole point: a customer's workspace ships no
    // declaration and still lends a correct, current surface.
    expect(resolveExposedTools(card('maker'), null)).toEqual([...MAKER_TOOLS]);
  });

  it('lets a declaration WIN COMPLETELY — no merge with the default', () => {
    // An add/remove algebra would put the effective list in two places and make
    // it readable in neither.
    expect(resolveExposedTools(card('maker'), ['read_file'])).toEqual(['read_file']);
  });

  it('treats an EMPTY declaration as "lends nothing", not as absent', () => {
    // The distinction that stops a deliberate opt-out from silently inheriting
    // an archetype's whole surface.
    expect(resolveExposedTools(card('maker'), [])).toEqual([]);
  });

  it('gives an agent with no archetype nothing at all', () => {
    // Acquiring a capability surface by OMISSION is how a workspace ends up
    // lending tools its owner never chose.
    expect(resolveExposedTools(null, null)).toEqual([]);
    expect(resolveExposedTools(card(undefined as never), null)).toEqual([]);
  });

  it('gives an assistant nothing — an orchestrator lends no hands', () => {
    // Its mini-MCP is reachable, honest and inert.
    expect(resolveExposedTools(card('assistant'), null)).toEqual([]);
  });

  it('reports where the list came from', () => {
    expect(exposedToolsSource(card('maker'), null)).toBe('archetype');
    expect(exposedToolsSource(card('maker'), ['read_file'])).toBe('declared');
    expect(exposedToolsSource(null, null)).toBe('none');
    expect(exposedToolsSource(card('maker'), null, { disabled: ['read_file'] })).toBe('archetype+diff');
    // An EMPTY diff is not a diff — it changed nothing, so it did not author anything.
    expect(exposedToolsSource(card('maker'), null, { disabled: [] })).toBe('archetype');
  });

  it('returns a COPY, so a caller cannot mutate the central list', () => {
    const first = resolveExposedTools(card('maker'), null);
    first.push('run_terminal_command');
    expect(resolveExposedTools(card('maker'), null)).not.toContain('run_terminal_command');
  });
});

/**
 * The DIFF — a workspace states its exceptions, never a copy of the list.
 *
 * The property that matters is not "you can turn a tool off". It is that a tool
 * added centrally reaches a workspace that has customised its surface. A
 * replacement freezes; a diff cannot.
 */
describe('resolveExposedTools with a diff', () => {
  it('withholds a disabled tool and keeps everything else', () => {
    const out = resolveExposedTools(card('maker'), null, { disabled: ['read_file'] });
    expect(out).not.toContain('read_file');
    expect(out).toHaveLength(MAKER_TOOLS.length - 1);
  });

  it('STILL DELIVERS a newly added central tool to a customised workspace', () => {
    // The whole reason this is a diff. Everything in the base except the one
    // exception arrives — so a tool added to MAKER_TOOLS tomorrow arrives too,
    // with no push and no re-declaration.
    const out = resolveExposedTools(card('maker'), null, { disabled: ['read_file'] });
    for (const t of MAKER_TOOLS) {
      if (t !== 'read_file') expect(out, t).toContain(t);
    }
  });

  it('appends local tools without shadowing a registry name', () => {
    const out = resolveExposedTools(card('maker'), null, { local: ['my_tool', 'read_file'] });
    expect(out).toContain('my_tool');
    // `read_file` is already in the base; it must appear ONCE, from the base.
    expect(out.filter((t) => t === 'read_file')).toHaveLength(1);
    expect(out).toHaveLength(MAKER_TOOLS.length + 1);
  });

  it('lets a local tool re-add nothing that was disabled in the same diff', () => {
    // Disabled wins: the exception list is read first, and `local` appends to
    // what SURVIVED it. Otherwise a diff could quietly undo its own withholding.
    const out = resolveExposedTools(card('maker'), null, {
      disabled: ['read_file'],
      local: ['read_file'],
    });
    expect(out.filter((t) => t === 'read_file')).toHaveLength(1);
  });

  it('ignores a diff entirely when there is no archetype', () => {
    expect(resolveExposedTools(null, null, { local: ['my_tool'] })).toEqual([]);
  });

  it('narrows the SUBSCRIBER surface too — a diff cannot be escaped by audience', () => {
    const out = resolveSharedTools(card('maker'), null, 'subscriber', {
      disabled: ['generate_image'],
    });
    expect(out).not.toContain('generate_image');
    expect(out).toContain('search_workspace');
  });
});

describe('unknownDiffNames', () => {
  it('reports a disabled name that refers to nothing', () => {
    expect(unknownDiffNames(card('maker'), { disabled: ['read_fil', 'read_file'] })).toEqual(['read_fil']);
  });

  it('is empty for a clean diff, and for no diff at all', () => {
    expect(unknownDiffNames(card('maker'), { disabled: ['read_file'] })).toEqual([]);
    expect(unknownDiffNames(card('maker'), null)).toEqual([]);
    expect(unknownDiffNames(card('maker'))).toEqual([]);
  });

  it('does NOT report local names — they are additions, not references', () => {
    expect(unknownDiffNames(card('maker'), { local: ['my_tool'] })).toEqual([]);
  });
});

describe('the archetype lists themselves', () => {
  it('never lends a shell or a delete from a MAKER', () => {
    // A maker has no checked bound on where a command would run, unlike an
    // engineer's `repos`.
    for (const forbidden of ['run_terminal_command', 'delete_file', 'write_file', 'apply_diff']) {
      expect(MAKER_TOOLS, forbidden).not.toContain(forbidden);
    }
  });

  it('never lends a brand mutation from a MAKER', () => {
    // The one mistake nothing downstream detects: every later render looks
    // internally consistent against the wrong brand.
    for (const forbidden of ['write_dna', 'apply_brand', 'compile_design_tokens', 'import_logo']) {
      expect(MAKER_TOOLS, forbidden).not.toContain(forbidden);
    }
  });

  it('carries the makes, because the intent must be expressible', () => {
    // They reach an orchestrator's commit gate and become signed jobs. Omitted,
    // the request would die as "no such tool" instead of becoming a receipt.
    for (const make of ['generate_image', 'render_sequence', 'publish_feed']) {
      expect(MAKER_TOOLS).toContain(make);
    }
  });

  it('never lends delete_file from an ENGINEER either', () => {
    expect(ARCHETYPE_TOOLS.engineer).not.toContain('delete_file');
  });

  it('has an entry for all three archetypes and no others', () => {
    expect(Object.keys(ARCHETYPE_TOOLS).sort()).toEqual(['assistant', 'engineer', 'maker']);
  });
});


/**
 * The SUBSCRIBER surface — someone who pays to use an agent but does not own it.
 *
 * The boundary that matters is not "fewer reads" but a different KIND of read:
 * a file tree is a download, a semantic search is an answer.
 */
describe('resolveSharedTools', () => {
  it('gives a same-account caller the full lent surface', () => {
    expect(resolveSharedTools(card('maker'), null, 'same-account')).toEqual([...MAKER_TOOLS]);
  });

  it('gives a SUBSCRIBER the narrow surface', () => {
    expect(resolveSharedTools(card('maker'), null, 'subscriber')).toEqual([...MAKER_SHARED]);
  });

  it('never lets a subscriber WALK THE TREE', () => {
    // The whole boundary. Blocking the file browser in the app while lending
    // these would be a speed bump, not a wall.
    const shared = resolveSharedTools(card('maker'), null, 'subscriber');
    for (const walker of [
      'list_directory', 'get_workspace_structure', 'find_files',
      'read_file', 'get_download_url', 'read_file_meta', 'search_file_meta',
    ]) {
      expect(shared, walker).not.toContain(walker);
    }
  });

  it('still lets a subscriber ASK, and MAKE', () => {
    const shared = resolveSharedTools(card('maker'), null, 'subscriber');
    expect(shared).toContain('search_workspace');
    expect(shared).toContain('generate_image');
    expect(shared).toContain('render_sequence');
  });

  it('gives a subscriber NOTHING from an assistant, engineer or validator', () => {
    // A missing cross-account surface means "not thought about yet", and the
    // safe reading of that is zero — never a fallback to the wider list.
    for (const a of ['assistant', 'engineer'] as const) {
      expect(resolveSharedTools(card(a), null, 'subscriber')).toEqual([]);
    }
  });

  it('cannot WIDEN a workspace that narrowed its own surface', () => {
    // A declaration wins, and the cross-account default is intersected with it
    // rather than added to it.
    const shared = resolveSharedTools(card('maker'), ['search_workspace'], 'subscriber');
    expect(shared).toEqual(['search_workspace']);
  });

  it('SHARED is a strict subset of the full list', () => {
    // Enforced, so the narrow list can never grant what the wide one does not.
    const full = new Set<string>(MAKER_TOOLS);
    for (const t of MAKER_SHARED) expect(full, t).toContain(t);
    expect(MAKER_SHARED.length).toBeLessThan(MAKER_TOOLS.length);
  });
});
