import { describe, expect, it } from 'vitest';
import {
  authorityForTool,
  capabilitiesInUse,
  checkAgentPermissions,
  classifyTool,
  DEFAULT_PERMISSIONS,
  NO_ARCHETYPE_PERMISSIONS,
  parseAgentPermissions,
  resolvePermissions,
  CAPABILITY_CLASSES,
} from '../dna/agent-permissions';
import { manifestToCard, parseAgentManifest, checkAgentManifest } from '../dna/agent-manifest';

describe('classifyTool', () => {
  it('separates making a file from overwriting one', () => {
    // The distinction the metadata cannot carry: both are `destructive`, and
    // only one of them can lose work.
    expect(classifyTool('hydrate_format')).toBe('create');
    expect(classifyTool('write_file')).toBe('write');
  });

  it('keeps delete out of write, because editing back does not undo it', () => {
    expect(classifyTool('delete_file')).toBe('delete');
  });

  it('treats leaving the workspace as its own class', () => {
    expect(classifyTool('publish_feed')).toBe('publish');
    expect(classifyTool('schedule_post')).toBe('publish');
  });

  it('calls repainting the brand `configure`, not `write`', () => {
    // One of these silently changes every later render.
    expect(classifyTool('write_dna')).toBe('configure');
    expect(classifyTool('apply_brand')).toBe('configure');
    expect(classifyTool('edit_design_slots')).toBe('write');
  });

  it('falls back to `read` for a tool that changes nothing', () => {
    expect(classifyTool('some_new_lookup', { destructive: false })).toBe('read');
  });

  it('falls back to `write` for an unclassified tool that does change state', () => {
    // Conservative on purpose: an unknown state-changing tool is likelier to
    // overwrite than to publish, and `write` is the class a maker holds.
    expect(classifyTool('some_new_mutator', { destructive: true })).toBe('write');
  });

  it('strips a remote server prefix before classifying', () => {
    expect(classifyTool('acme__write_file', { destructive: true })).toBe('write');
  });
});

describe('resolvePermissions', () => {
  it('answers every class, always', () => {
    const table = resolvePermissions({ agentPersona: true, archetype: 'maker' });
    for (const cls of CAPABILITY_CLASSES) expect(table[cls]).toBeDefined();
  });

  it('lets a maker make, and makes it ask before anything it cannot take back', () => {
    const t = DEFAULT_PERMISSIONS.maker;
    expect(t.create).toBe('allow');
    expect(t.write).toBe('allow');
    expect(t.delete).toBe('ask');
    expect(t.publish).toBe('ask');
    expect(t.configure).toBe('ask');
  });

  it('gives `run` to the engineer alone — its shell is bounded by `repos`', () => {
    expect(DEFAULT_PERMISSIONS.engineer.run).toBe('allow');
    expect(DEFAULT_PERMISSIONS.maker.run).toBe('ask');
    expect(DEFAULT_PERMISSIONS.assistant.run).toBe('ask');
  });

  it('does not let an assistant write unattended', () => {
    expect(DEFAULT_PERMISSIONS.assistant.write).toBe('ask');
  });

  it('lets the agent override its archetype', () => {
    const table = resolvePermissions(
      { agentPersona: true, archetype: 'maker' },
      { publish: 'allow', write: 'deny' },
    );
    expect(table.publish).toBe('allow');
    expect(table.write).toBe('deny');
    // Untouched classes keep the archetype's answer.
    expect(table.create).toBe('allow');
  });

  it('falls to a read-only floor with no archetype', () => {
    expect(resolvePermissions(null)).toEqual(NO_ARCHETYPE_PERMISSIONS);
    expect(resolvePermissions(null).write).toBe('ask');
  });
});

describe('parseAgentPermissions', () => {
  it('drops an unknown class rather than defaulting it', () => {
    // A typo must never quietly widen an agent.
    expect(parseAgentPermissions({ wrtie: 'allow' })).toBeUndefined();
  });

  it('drops an unknown authority', () => {
    expect(parseAgentPermissions({ write: 'yes' })).toBeUndefined();
  });

  it('keeps the valid half of a partly wrong block', () => {
    expect(parseAgentPermissions({ write: 'allow', nope: 'ask' })).toEqual({ write: 'allow' });
  });
});

describe('checkAgentPermissions', () => {
  it('reports the typo the parser dropped', () => {
    expect(checkAgentPermissions({ wrtie: 'allow' })[0]).toContain('not a capability');
    expect(checkAgentPermissions({ write: 'yes' })[0]).toContain('must be allow | ask | deny');
  });

  it('says nothing about an absent block', () => {
    expect(checkAgentPermissions(undefined)).toEqual([]);
  });
});

describe('authorityForTool', () => {
  const maker = resolvePermissions({ agentPersona: true, archetype: 'maker' });

  it('lets a maker hydrate a template on its own — the gate that used to time out', () => {
    expect(authorityForTool(maker, 'use_template')).toEqual({
      capability: 'create',
      authority: 'allow',
    });
  });

  it('still asks before a delete', () => {
    expect(authorityForTool(maker, 'delete_file').authority).toBe('ask');
  });
});

describe('capabilitiesInUse', () => {
  it('groups the tools by what they do', () => {
    const used = capabilitiesInUse(['read_file', 'write_file', 'delete_file', 'publish_feed']);
    expect(used.write).toEqual(['write_file']);
    expect(used.delete).toEqual(['delete_file']);
    expect(used.publish).toEqual(['publish_feed']);
  });
});

describe('the manifest carries it end to end', () => {
  const raw = {
    agent: true,
    archetype: 'maker',
    does: 'makes decks',
    tools: { packages: ['create', 'edit'] },
    permissions: { publish: 'deny' },
    scope: ['projects'],
  };

  it('parses, and rides onto the card the gate reads', () => {
    const manifest = parseAgentManifest(raw, 'design');
    expect(manifest?.permissions).toEqual({ publish: 'deny' });
    // von-node loads `agentCard` and never sees the workspace file, so a
    // permission that did not reach the card could not be enforced.
    expect(manifestToCard(manifest!).permissions).toEqual({ publish: 'deny' });
  });

  it('reports a grant that reaches no tool this agent holds', () => {
    const manifest = parseAgentManifest(
      { ...raw, tools: { packages: ['see'] }, permissions: { delete: 'allow' } },
      'design',
    );
    const problems = checkAgentManifest(manifest!, {
      ...raw,
      tools: { packages: ['see'] },
      permissions: { delete: 'allow' },
    });
    expect(problems.some((p) => p.includes('holds no delete tool'))).toBe(true);
  });
});
