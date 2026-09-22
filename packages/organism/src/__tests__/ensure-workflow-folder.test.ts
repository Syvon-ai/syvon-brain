import { describe, expect, it } from 'vitest';

import {
  ensureWorkflowFolderStructure,
  DEFAULT_AGENT_SYSTEM_MD,
  type WorkflowFolderSeedData,
} from '../dna/ensure-workflow-folder';

/** In-memory storage port, pre-seedable to exercise the idempotency path. */
function store(initial: Record<string, string> = {}) {
  const files = new Map<string, string>(Object.entries(initial));
  return {
    files,
    readFile: async (p: string) => {
      const v = files.get(p);
      if (v === undefined) throw new Error(`ENOENT ${p}`);
      return v;
    },
    writeFile: async (p: string, c: string) => {
      files.set(p, c);
    },
  };
}

const seed = (over: Partial<WorkflowFolderSeedData> = {}): WorkflowFolderSeedData => ({
  kind: 'agent',
  ...over,
});

describe('ensureWorkflowFolderStructure — agent genre', () => {
  it('seeds the director furniture and the reserved entry graph', async () => {
    const s = store();
    const res = await ensureWorkflowFolderStructure('workspaces/ws1', 'promo', seed(), s);

    expect(res.written).toEqual([
      'workflows/promo/system.md',
      'workflows/promo/config.json',
      'workflows/promo/promo.flow',
    ]);
    expect(res.skipped).toEqual([]);
    // The entry graph MUST be `{slug}.flow` — that exact name is what
    // reconcileWorkflowsFromR2 lifts into Workflow.graph.
    expect(s.files.has('workspaces/ws1/workflows/promo/promo.flow')).toBe(true);
  });

  it('writes the entry graph as one prompt block plus an unnamed workflow-root', async () => {
    const s = store();
    await ensureWorkflowFolderStructure('workspaces/ws1', 'promo', seed(), s);
    const g = JSON.parse(s.files.get('workspaces/ws1/workflows/promo/promo.flow')!);

    expect(g.version).toBe(1);
    expect(g.nodes.map((n: { type: string }) => n.type)).toEqual(['io.prompt', 'io.workflow-root']);
    // No exemplars bound yet, so no edges — an unbound root keeps all.
    expect(g.edges).toEqual([]);
  });

  it('mirrors system.md verbatim into the prompt block so compile-parity holds', async () => {
    const s = store();
    const systemPrompt = '# Director\n\n## Voice\n\nTerse. Concrete.';
    await ensureWorkflowFolderStructure('workspaces/ws1', 'promo', seed({ systemPrompt }), s);

    const md = s.files.get('workspaces/ws1/workflows/promo/system.md')!;
    const g = JSON.parse(s.files.get('workspaces/ws1/workflows/promo/promo.flow')!);
    const block = g.nodes.find((n: { type: string }) => n.type === 'io.prompt');

    expect(md).toBe(`${systemPrompt}\n`);
    // A single block means the compiled prompt is the block text — parity by
    // construction, no section-splitting gate needed.
    expect(block.data.text).toBe(md.trimEnd());
  });

  it('falls back to the default system prompt when none is given', async () => {
    const s = store();
    await ensureWorkflowFolderStructure('workspaces/ws1', 'promo', seed(), s);
    expect(s.files.get('workspaces/ws1/workflows/promo/system.md')).toBe(DEFAULT_AGENT_SYSTEM_MD);
  });

  it('carries the caller-supplied workflow-root spec, and omits data.spec without one', async () => {
    const withSpec = store();
    await ensureWorkflowFolderStructure(
      'workspaces/ws1',
      'promo',
      seed({ workflowRootSpec: { family: 'io', component: 'RootNode' } }),
      withSpec,
    );
    const g1 = JSON.parse(withSpec.files.get('workspaces/ws1/workflows/promo/promo.flow')!);
    expect(g1.nodes[1].data.spec).toEqual({ family: 'io', component: 'RootNode' });

    const noSpec = store();
    await ensureWorkflowFolderStructure('workspaces/ws1', 'promo', seed(), noSpec);
    const g2 = JSON.parse(noSpec.files.get('workspaces/ws1/workflows/promo/promo.flow')!);
    expect(g2.nodes[1].data).toEqual({});
  });

  it('writes config.json with editing + settings, and NO audio — voice is brand-owned', async () => {
    const s = store();
    await ensureWorkflowFolderStructure('workspaces/ws1', 'promo', seed(), s);
    const cfg = JSON.parse(s.files.get('workspaces/ws1/workflows/promo/config.json')!);

    // Two blocks about generation, answering different questions: `editing` is
    // what a knob is SET to, `settings` is whether it can be set at all.
    expect(Object.keys(cfg)).toEqual(['editing', 'settings']);
    expect(cfg.editing.pacing).toBe('relaxed');
    // The point of this test: no `audio` block. WHICH voice speaks is read off
    // the Brand row, so a per-flow copy on disk would be a lie.
    expect(cfg.audio).toBeUndefined();
  });

  it('seeds every exposure knob as the user\'s — a new flow hides nothing', async () => {
    const s = store();
    await ensureWorkflowFolderStructure('workspaces/ws1', 'promo', seed(), s);
    const cfg = JSON.parse(s.files.get('workspaces/ws1/workflows/promo/config.json')!);

    // Spelled out rather than omitted, so an author can SEE the five knobs and
    // turn one off. An absent block would resolve to the same thing for a
    // motion flow — but only by inference, which is what this avoids.
    expect(Object.keys(cfg.settings).sort()).toEqual(['captions', 'format', 'music', 'pacing', 'voice']);
    for (const k of ['captions', 'music', 'pacing', 'voice']) {
      expect(cfg.settings[k]).toEqual({ mode: 'user' });
    }
    expect(cfg.settings.format).toEqual({ mode: 'user', quality: 'hd' });
  });

  it('merges editing overrides over the defaults', async () => {
    const s = store();
    await ensureWorkflowFolderStructure(
      'workspaces/ws1',
      'promo',
      seed({ editing: { pacing: 'brisk', maxShots: 6 } }),
      s,
    );
    const cfg = JSON.parse(s.files.get('workspaces/ws1/workflows/promo/config.json')!);
    expect(cfg.editing.pacing).toBe('brisk');
    expect(cfg.editing.maxShots).toBe(6);
    expect(cfg.editing.transitionStyle).toBe('cut'); // untouched default survives
  });

  it('writes suggestions.json only when suggestions are supplied', async () => {
    const without = store();
    await ensureWorkflowFolderStructure('workspaces/ws1', 'promo', seed(), without);
    expect(without.files.has('workspaces/ws1/workflows/promo/suggestions.json')).toBe(false);

    const with_ = store();
    await ensureWorkflowFolderStructure(
      'workspaces/ws1',
      'promo',
      seed({ suggestions: ['Make a teaser'] }),
      with_,
    );
    expect(JSON.parse(with_.files.get('workspaces/ws1/workflows/promo/suggestions.json')!)).toEqual({
      suggestions: ['Make a teaser'],
    });
  });
});

describe('ensureWorkflowFolderStructure — utility genre', () => {
  it('seeds only the entry graph, none of the director furniture', async () => {
    const s = store();
    const res = await ensureWorkflowFolderStructure(
      'workspaces/ws1',
      'veo-clip',
      seed({ kind: 'utility' }),
      s,
    );
    expect(res.written).toEqual(['workflows/veo-clip/veo-clip.flow']);
    expect(s.files.has('workspaces/ws1/workflows/veo-clip/system.md')).toBe(false);
    expect(s.files.has('workspaces/ws1/workflows/veo-clip/config.json')).toBe(false);
  });

  it('seeds an in/out pair with no root and no invalid edge', async () => {
    const s = store();
    await ensureWorkflowFolderStructure('workspaces/ws1', 'veo-clip', seed({ kind: 'utility' }), s);
    const g = JSON.parse(s.files.get('workspaces/ws1/workflows/veo-clip/veo-clip.flow')!);

    expect(g.nodes.map((n: { type: string }) => n.type)).toEqual(['io.prompt', 'io.output-asset']);
    // prompt→asset would be a type mismatch; the author inserts a generator.
    expect(g.edges).toEqual([]);
    expect(g.nodes.some((n: { type: string }) => n.type === 'io.workflow-root')).toBe(false);
  });
});

describe('ensureWorkflowFolderStructure — idempotency and prefixes', () => {
  it('never overwrites authored content on a second call', async () => {
    const s = store();
    await ensureWorkflowFolderStructure('workspaces/ws1', 'promo', seed(), s);
    s.files.set('workspaces/ws1/workflows/promo/system.md', '# Edited by hand\n');

    const res = await ensureWorkflowFolderStructure('workspaces/ws1', 'promo', seed(), s);

    expect(res.written).toEqual([]);
    expect(res.skipped).toEqual([
      'workflows/promo/system.md',
      'workflows/promo/config.json',
      'workflows/promo/promo.flow',
    ]);
    expect(s.files.get('workspaces/ws1/workflows/promo/system.md')).toBe('# Edited by hand\n');
  });

  it('treats an empty existing file as absent and reseeds it', async () => {
    const s = store({ 'workspaces/ws1/workflows/promo/system.md': '' });
    const res = await ensureWorkflowFolderStructure('workspaces/ws1', 'promo', seed(), s);
    expect(res.written).toContain('workflows/promo/system.md');
  });

  it('honours a non-default storage prefix and tolerates a trailing slash', async () => {
    const s = store();
    await ensureWorkflowFolderStructure('custom/root/', 'promo', seed({ kind: 'utility' }), s);
    expect([...s.files.keys()]).toEqual(['custom/root/workflows/promo/promo.flow']);
  });

  it('writes workspace-relative paths when the prefix is empty', async () => {
    const s = store();
    await ensureWorkflowFolderStructure('', 'promo', seed({ kind: 'utility' }), s);
    expect([...s.files.keys()]).toEqual(['workflows/promo/promo.flow']);
  });
});
