import { describe, expect, it } from 'vitest';
import {
  agentManifestPath,
  checkAgentManifest,
  manifestIssues,
  manifestToCard,
  manifestToolDiff,
  parseAgentManifest,
  remoteToolNames,
  agentScope,
  scopeAllowsPath,
  scopeAllowsRead,
  scopeProblems,
  workspaceRootNames,
} from './agent-manifest';
import { MAKER_TOOLS, resolveExposedTools } from './archetype-tools';

const base = { agent: true as const, archetype: 'maker', does: 'Makes things.' };

describe('parseAgentManifest', () => {
  it('refuses anything without the marker', () => {
    expect(parseAgentManifest({ archetype: 'maker' }, 'main')).toBeNull();
    expect(parseAgentManifest({ agent: false }, 'main')).toBeNull();
    expect(parseAgentManifest(null, 'main')).toBeNull();
    expect(parseAgentManifest('agent', 'main')).toBeNull();
  });

  it('takes the slug from the folder, never from the file', () => {
    const m = parseAgentManifest({ ...base, slug: 'imposter' }, 'dispatch');
    expect(m?.slug).toBe('dispatch');
  });

  it('refuses a folder name that is not addressable', () => {
    expect(parseAgentManifest(base, 'Not A Slug')).toBeNull();
    expect(parseAgentManifest(base, '../escape')).toBeNull();
    expect(parseAgentManifest(base, '')).toBeNull();
  });

  it('drops a misspelled archetype without losing the agent', () => {
    const m = parseAgentManifest({ ...base, archetype: 'makerr' }, 'main');
    expect(m).not.toBeNull();
    expect(m?.archetype).toBeUndefined();
    expect(checkAgentManifest(m!, { ...base, archetype: 'makerr' })).toContainEqual(
      expect.stringContaining('is not one of'),
    );
  });

  it('keeps context paths workspace-relative', () => {
    const m = parseAgentManifest(
      { ...base, context: ['meta/voice.md', '../../etc/passwd', 'https://x.test/a.md', '/abs.md'] },
      'main',
    );
    expect(m?.context).toEqual(['meta/voice.md']);
  });

  it('refuses a skill name carrying a path separator', () => {
    // The same rule `skills-config.names()` enforces — it is what keeps
    // `_proposed/` unroutable and `../` unrepresentable.
    const m = parseAgentManifest(
      { ...base, skills: { all: ['brand-voice', '_proposed/draft', '../x'] } },
      'main',
    );
    expect(m?.skills?.all).toEqual(['brand-voice']);
  });

  it('keeps only known skill routes', () => {
    const m = parseAgentManifest(
      { ...base, skills: { all: ['a'], narrate: ['b'], nonsense: ['c'] } },
      'main',
    );
    expect(m?.skills).toEqual({ all: ['a'], narrate: ['b'] });
  });
});

describe('servers', () => {
  it('drops a row with no id or no absolute url, and says so by index', () => {
    const raw = {
      ...base,
      servers: [
        { id: 'crm', url: 'https://mcp.acme.test', tokenRef: 'ACME_MCP_TOKEN', tools: ['lookup'] },
        { url: 'https://nameless.test' },
        { id: 'relative', url: '/mcp' },
        { id: 'Not A Slug', url: 'https://x.test' },
      ],
    };
    const m = parseAgentManifest(raw, 'main')!;
    expect(m.servers?.map((s) => s.id)).toEqual(['crm']);
    const problems = checkAgentManifest(m, raw);
    expect(problems).toContainEqual(expect.stringContaining('servers[1]'));
    expect(problems).toContainEqual(expect.stringContaining('servers[2]'));
    expect(problems).toContainEqual(expect.stringContaining('servers[3]'));
  });

  it('reports an inline token as a published credential', () => {
    const raw = {
      ...base,
      servers: [{ id: 'crm', url: 'https://mcp.acme.test', token: 'sk-live-abc', tools: ['lookup'] }],
    };
    const m = parseAgentManifest(raw, 'main')!;
    // Parsing never carries it — there is no `token` field to carry it into.
    expect(JSON.stringify(m)).not.toContain('sk-live-abc');
    expect(checkAgentManifest(m, raw)).toContainEqual(expect.stringContaining('inline `token`'));
  });

  it('warns when a server lists no tools, because its surface can then drift', () => {
    const raw = { ...base, servers: [{ id: 'crm', url: 'https://x.test', tokenRef: 'T' }] };
    const m = parseAgentManifest(raw, 'main')!;
    expect(checkAgentManifest(m, raw)).toContainEqual(expect.stringContaining('lists no tools'));
  });

  it('prefixes remote tool names with the server id', () => {
    const m = parseAgentManifest(
      {
        ...base,
        servers: [
          { id: 'crm', url: 'https://a.test', tools: ['lookup', 'create'] },
          { id: 'docs', url: 'https://b.test', tools: ['search'] },
        ],
      },
      'main',
    )!;
    expect(remoteToolNames(m)).toEqual(['crm__create', 'crm__lookup', 'docs__search']);
  });

  it('keeps remote names out of the tool diff', () => {
    // They would land in `Actor.exposedTools`, where the registry audit would
    // report a working customer endpoint as unservable.
    const m = parseAgentManifest(
      { ...base, tools: { add: ['read_file'] }, servers: [{ id: 'crm', url: 'https://a.test', tools: ['lookup'] }] },
      'main',
    )!;
    expect(manifestToolDiff(m)?.local).toEqual(['read_file']);
  });
});

describe('manifestToolDiff — exceptions, never a copy', () => {
  it('is undefined when the manifest states none', () => {
    expect(manifestToolDiff(parseAgentManifest(base, 'main'))).toBeUndefined();
    expect(manifestToolDiff(null)).toBeUndefined();
  });

  it('carries add as local and remove as disabled', () => {
    const m = parseAgentManifest({ ...base, tools: { add: ['run_tool'], remove: ['generate_video'] } }, 'main');
    expect(manifestToolDiff(m)).toEqual({ disabled: ['generate_video'], local: ['run_tool'] });
  });

  it('expands packages into local, deduped and sorted', () => {
    const m = parseAgentManifest({ ...base, tools: { packages: ['orient'], add: ['run_tool'] } }, 'main');
    const diff = manifestToolDiff(m)!;
    expect(diff.local).toContain('run_tool');
    expect(diff.local!.length).toBeGreaterThan(1);
    expect(diff.local).toEqual([...diff.local!].sort());
    expect(new Set(diff.local).size).toBe(diff.local!.length);
  });

  it('contributes nothing for an unknown package, and reports it instead', () => {
    const m = parseAgentManifest({ ...base, tools: { packages: ['not-a-package'] } }, 'main')!;
    expect(manifestToolDiff(m)).toBeUndefined();
    expect(manifestIssues(m)).toContainEqual(expect.stringContaining('unknown package'));
    expect(checkAgentManifest(m, {})).toContainEqual(expect.stringContaining('unknown tool package'));
  });

  it('refuses to lend the estate package', () => {
    const m = parseAgentManifest({ ...base, tools: { packages: ['workspace'] } }, 'main')!;
    expect(manifestIssues(m)).toContainEqual(expect.stringContaining('estate tooling'));
  });

  it('THE FREEZE FIX: a diff moves with the archetype where a copy would not', () => {
    const m = parseAgentManifest({ ...base, tools: { remove: ['generate_video'] } }, 'main')!;
    const card = manifestToCard(m);
    const effective = resolveExposedTools(card, null, manifestToolDiff(m));

    // Everything the archetype lends except the one exception, so a tool added
    // to MAKER_TOOLS tomorrow reaches this agent without touching its file.
    expect(effective).not.toContain('generate_video');
    expect(effective.length).toBe(MAKER_TOOLS.length - 1);
    for (const tool of MAKER_TOOLS) {
      if (tool !== 'generate_video') expect(effective).toContain(tool);
    }
  });

  it('reports a diff with no archetype, where the base it applies to is empty', () => {
    const m = parseAgentManifest({ agent: true, tools: { remove: ['read_file'] } }, 'main')!;
    expect(checkAgentManifest(m, {})).toContainEqual(expect.stringContaining('no archetype'));
    expect(resolveExposedTools(manifestToCard(m), null, manifestToolDiff(m))).toEqual([]);
  });
});

describe('manifestToCard', () => {
  it('projects the roster half and drops the workspace half', () => {
    const m = parseAgentManifest(
      {
        ...base,
        accent: '#ff8800',
        logo: 'assets/mark.svg',
        tools: { add: ['read_file'] },
        skills: { all: ['brand-voice'] },
        flows: ['catalog-layout'],
        servers: [{ id: 'crm', url: 'https://a.test', tools: ['x'] }],
      },
      'main',
    )!;
    expect(manifestToCard(m)).toEqual({
      agentPersona: true,
      archetype: 'maker',
      does: 'Makes things.',
      accent: '#ff8800',
      logo: 'assets/mark.svg',
    });
  });

  it('carries the same archetype rules the card is checked against', () => {
    const m = parseAgentManifest({ agent: true, archetype: 'maker', does: 'x', delegatesTo: ['sy'] }, 'main')!;
    expect(checkAgentManifest(m, {})).toContainEqual(expect.stringContaining('only an assistant delegates'));

    const eng = parseAgentManifest({ agent: true, archetype: 'engineer', does: 'x' }, 'main')!;
    expect(checkAgentManifest(eng, {})).toContainEqual(expect.stringContaining('spawned nowhere'));
  });
});

describe('paths', () => {
  it('addresses a manifest by folder', () => {
    expect(agentManifestPath('main')).toBe('agents/main/agent.json');
    expect(agentManifestPath('dispatch')).toBe('agents/dispatch/agent.json');
  });
});

describe('scope — the map that makes two agents in one workspace separate', () => {
  const catalogue = parseAgentManifest(
    { ...base, scope: ['assets', 'projects', 'config', 'meta'] },
    'catalogue',
  )!;
  const admin = parseAgentManifest({ ...base, scope: ['admin', 'config'] }, 'admin')!;
  const unscoped = parseAgentManifest(base, 'main')!;

  it('ABSENT scope is the whole workspace — every existing agent is unchanged', () => {
    expect(agentScope(unscoped)).toBeNull();
    expect(scopeAllowsRead(agentScope(unscoped), 'admin/employees/payroll.csv')).toBe(true);
    expect(agentScope(null)).toBeNull();
    // An empty array is not a scope of nothing — it is no scope at all, which
    // keeps `"scope": []` from silently blinding an agent.
    expect(agentScope(parseAgentManifest({ ...base, scope: [] }, 'x')!)).toBeNull();
  });

  it('THE POINT: the catalogue agent cannot read employees, the admin agent can', () => {
    const c = agentScope(catalogue);
    const a = agentScope(admin);
    expect(scopeAllowsRead(c, 'admin/employees/payroll.csv')).toBe(false);
    expect(scopeAllowsRead(a, 'admin/employees/payroll.csv')).toBe(true);
    // …and the reverse, so the separation is mutual rather than a hierarchy.
    expect(scopeAllowsRead(a, 'projects/catalog-layout/page.dsgn')).toBe(false);
    expect(scopeAllowsRead(c, 'projects/catalog-layout/page.dsgn')).toBe(true);
  });

  it('compares by SEGMENT, so `assets` never admits `assets-private`', () => {
    const c = agentScope(catalogue);
    expect(scopeAllowsRead(c, 'assets/imagery/hero.png')).toBe(true);
    expect(scopeAllowsRead(c, 'assets-private/secret.png')).toBe(false);
    expect(scopeAllowsRead(c, 'assetsomething')).toBe(false);
  });

  it('an ANCESTOR is listable but never readable', () => {
    // An agent scoped to `admin/accounting` must see that `admin/` exists or it
    // cannot navigate to its own folder; it must NOT be able to read
    // `admin/employees`, which is the whole reason the scope is there.
    const acct = agentScope(parseAgentManifest({ ...base, scope: ['admin/accounting', 'config'] }, 'acct')!);
    expect(scopeAllowsPath(acct, 'admin')).toBe(true);
    expect(scopeAllowsRead(acct, 'admin')).toBe(false);
    expect(scopeAllowsRead(acct, 'admin/employees/payroll.csv')).toBe(false);
    expect(scopeAllowsRead(acct, 'admin/accounting/2026/ledger.csv')).toBe(true);
  });

  it('normalises entries so no consumer has to, and refuses an escape', () => {
    const m = parseAgentManifest(
      { ...base, scope: ['/assets/', 'projects\\deep', '../etc', 'config'] },
      'x',
    )!;
    expect(m.scope).toEqual(['assets', 'projects/deep', 'config']);
  });

  it('reports a root the organism does not define, rather than matching nothing', () => {
    const m = parseAgentManifest({ ...base, scope: ['assets', 'nonsense', 'config'] }, 'x')!;
    const problems = scopeProblems(m);
    expect(problems.some((p) => p.includes('"nonsense"'))).toBe(true);
    // And every real root is offered, so the fix is in the message.
    expect(problems.some((p) => p.includes('projects'))).toBe(true);
  });

  it('warns when a scope would leave the agent unable to read its own brand', () => {
    const m = parseAgentManifest({ ...base, scope: ['projects'] }, 'x')!;
    expect(scopeProblems(m).some((p) => p.includes('config/'))).toBe(true);
    // …and stays quiet when config is in scope.
    expect(scopeProblems(catalogue).some((p) => p.includes('config/'))).toBe(false);
  });

  it('rides through checkAgentManifest, so one call reports everything', () => {
    const m = parseAgentManifest({ ...base, scope: ['nonsense'] }, 'x')!;
    expect(checkAgentManifest(m, {}).some((p) => p.includes('"nonsense"'))).toBe(true);
  });

  it('every workspace root is a legal scope entry', () => {
    // The guard that keeps this in step with the organism: a root added to
    // WORKSPACE_CONFIG must be scopeable without touching this file.
    for (const root of workspaceRootNames()) {
      const m = parseAgentManifest({ ...base, scope: [root, 'config'] }, 'x')!;
      expect(scopeProblems(m).some((p) => p.includes(`"${root}"`))).toBe(false);
    }
  });
});
