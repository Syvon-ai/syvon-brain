import { describe, expect, it } from 'vitest';
import {
  declarationIssues,
  exposedToolsFor,
  exposedToolsMatch,
  flattenMcpTools,
  mcpDeclarationPath,
  mcpServerSlugFromFile,
  parseMcpDeclaration,
  type ResolvedMcpServer,
} from './mcp-declaration';

const server = (slug: string, tools: { name: string; icon?: string }[]): ResolvedMcpServer => ({
  slug,
  tools,
  source: `config/mcp/${slug}.json`,
});

describe('parseMcpDeclaration', () => {
  it('takes the filename stem when the file names no slug', () => {
    const out = parseMcpDeclaration({ tools: [] }, 'config/mcp/orchestrate.json', 'orchestrate');
    expect(out?.slug).toBe('orchestrate');
  });

  it('lets an explicit slug win over the filename', () => {
    const out = parseMcpDeclaration({ slug: 'routing' }, 'config/mcp/orchestrate.json', 'orchestrate');
    expect(out?.slug).toBe('routing');
  });

  it('accepts a bare string as a tool', () => {
    const out = parseMcpDeclaration({ tools: ['invite'] }, 'p', 's');
    expect(out?.tools).toEqual([{ name: 'invite' }]);
  });

  /**
   * The failure this exists to prevent: one bad row blanking an agent's whole
   * surface. The honeycomb showing three of four balls beats showing none, and
   * throwing here would take out the roster for every tenant on the page.
   */
  it('drops malformed tool rows and keeps the rest', () => {
    const out = parseMcpDeclaration(
      { tools: [{ name: 'invite' }, { icon: 'bolt' }, null, 42, { name: '' }, { name: 'search_web' }] },
      'p',
      's',
    );
    expect(out?.tools?.map((t) => t.name)).toEqual(['invite', 'search_web']);
  });

  it('returns null for a non-object, so a corrupt file is a miss not a crash', () => {
    expect(parseMcpDeclaration(null, 'p', 's')).toBeNull();
    expect(parseMcpDeclaration('nope', 'p', 's')).toBeNull();
    expect(parseMcpDeclaration([1, 2], 'p', 's')).toBeNull();
  });

  it('keeps only GET/POST methods on an endpoint', () => {
    const out = parseMcpDeclaration(
      { endpoints: [{ id: 'a', url: 'https://x.test', methods: ['POST', 'DELETE', 'GET'] }] },
      'p',
      's',
    );
    expect(out?.endpoints?.[0].methods).toEqual(['POST', 'GET']);
  });

  it('drops an endpoint with no url', () => {
    const out = parseMcpDeclaration({ endpoints: [{ id: 'a' }, { id: 'b', url: 'https://x.test' }] }, 'p', 's');
    expect(out?.endpoints?.map((e) => e.id)).toEqual(['b']);
  });

  it('records the source path, so an error can name the file', () => {
    const out = parseMcpDeclaration({}, 'config/mcp/orchestrate.json', 'orchestrate');
    expect(out?.source).toBe('config/mcp/orchestrate.json');
  });
});

describe('flattenMcpTools', () => {
  it('de-duplicates by name, first declaration winning', () => {
    const out = flattenMcpTools([
      server('orchestrate', [{ name: 'search_web', icon: 'language' }]),
      server('default', [{ name: 'search_web', icon: 'search' }, { name: 'read_file', icon: 'search' }]),
    ]);
    expect(out).toEqual([
      { name: 'search_web', icon: 'language' },
      { name: 'read_file', icon: 'search' },
    ]);
  });

  it('falls back to a generic icon rather than emitting undefined', () => {
    expect(flattenMcpTools([server('s', [{ name: 'invite' }])])).toEqual([{ name: 'invite', icon: 'extension' }]);
  });

  it('is empty for an agent that declares nothing', () => {
    expect(flattenMcpTools([])).toEqual([]);
  });
});

describe('exposedToolsFor', () => {
  it('unions every server and sorts, so an unchanged workspace is byte-identical', () => {
    const a = exposedToolsFor([
      server('orchestrate', [{ name: 'invite' }, { name: 'search_agents' }]),
      server('make', [{ name: 'render_sequence' }, { name: 'invite' }]),
    ]);
    const b = exposedToolsFor([
      server('make', [{ name: 'invite' }, { name: 'render_sequence' }]),
      server('orchestrate', [{ name: 'search_agents' }, { name: 'invite' }]),
    ]);
    expect(a).toEqual(['invite', 'render_sequence', 'search_agents']);
    // Server order and tool order must not change the allowlist, or every
    // reconcile reads as a change and no diff means anything.
    expect(b).toEqual(a);
  });

  it('is [] for no declarations — inert, which is not the same as unconfigured', () => {
    expect(exposedToolsFor([])).toEqual([]);
  });
});

describe('package lending', () => {
  const pkgServer = (
    packages: string[],
    tools: { name: string }[] = [],
  ): ResolvedMcpServer => ({
    slug: 'lender',
    tools,
    packages,
    source: 'config/mcp/lender.json',
  });

  it('parses packages and drops non-string rows like it drops bad tool rows', () => {
    const out = parseMcpDeclaration({ packages: ['see', 42, null, ''] }, 'p', 's');
    expect(out?.packages).toEqual(['see']);
  });

  it('absent packages stays absent — every existing declaration is unchanged', () => {
    const out = parseMcpDeclaration({ tools: ['invite'] }, 'p', 's');
    expect(out?.packages).toBeUndefined();
  });

  it('expands packages into the allowlist, unioned with named tools', () => {
    const tools = exposedToolsFor([pkgServer(['see', 'edit'], [{ name: 'validate' }])]);
    expect(tools).toContain('read');
    expect(tools).toContain('show');
    expect(tools).toContain('apply_diff');
    expect(tools).toContain('validate');
    // Sorted + stable, same contract as named tools.
    expect([...tools].sort()).toEqual(tools);
  });

  it('lends nothing for an estate or unknown package — and SAYS SO', () => {
    const servers = [pkgServer(['workspace', 'ghost', 'ship'])];
    // ship expands; workspace/ghost contribute nothing…
    const tools = exposedToolsFor(servers);
    expect(tools).toContain('publish_feed');
    expect(tools).not.toContain('workspace_push');
    // …and the refusal is reported, not silently narrowed.
    const issues = declarationIssues(servers);
    expect(issues.some((i) => i.includes('estate') && i.includes('workspace'))).toBe(true);
    expect(issues.some((i) => i.includes('unknown') && i.includes('ghost'))).toBe(true);
  });

  it('is quiet when every package resolves', () => {
    expect(declarationIssues([pkgServer(['see', 'edit'])])).toEqual([]);
    expect(declarationIssues([])).toEqual([]);
  });

  it('honors lend:false for packages exactly as for tools', () => {
    const hidden: ResolvedMcpServer = { ...pkgServer(['see']), lend: false };
    expect(exposedToolsFor([hidden])).toEqual([]);
  });

  it('shows package tools in the honeycomb as the tools they expand to', () => {
    const out = flattenMcpTools([pkgServer(['ship'])]);
    expect(out.map((t) => t.name).sort()).toEqual(['check_contrast', 'create_draft_post', 'publish_feed', 'schedule_post', 'validate']);
  });
});

describe('exposedToolsMatch', () => {
  it('treats null as a mismatch so a never-set column always gets written', () => {
    expect(exposedToolsMatch(null, [])).toBe(false);
    expect(exposedToolsMatch(undefined, ['invite'])).toBe(false);
  });

  it('matches an already-correct allowlist so the reconcile can skip the write', () => {
    expect(exposedToolsMatch(['invite', 'search_web'], ['invite', 'search_web'])).toBe(true);
  });

  it('does not match on length or content differences', () => {
    expect(exposedToolsMatch(['invite'], ['invite', 'search_web'])).toBe(false);
    expect(exposedToolsMatch(['invite', 'search_web'], ['invite', 'search_agents'])).toBe(false);
  });

  it('distinguishes [] (inert) from null (never set)', () => {
    expect(exposedToolsMatch([], [])).toBe(true);
    expect(exposedToolsMatch(null, [])).toBe(false);
  });
});

describe('paths', () => {
  it('builds and reverses a declaration path', () => {
    expect(mcpDeclarationPath('orchestrate')).toBe('config/mcp/orchestrate.json');
    expect(mcpServerSlugFromFile('orchestrate.json')).toBe('orchestrate');
    expect(mcpServerSlugFromFile('orchestrate.JSON')).toBe('orchestrate');
  });
});

describe('tool runtime — registry vs brain', () => {
  /**
   * The correction this field exists for. Sy declared four tools; three live in
   * services/brain/src/routes/syvon.ts, not the shared registry, so von-node
   * could serve exactly one. Allowlisting all four put names in
   * Actor.exposedTools that could only be warned about and dropped.
   */
  it('keeps brain tools OUT of the allowlist but IN the display list', () => {
    const sy = {
      slug: 'orchestrate',
      source: 'config/mcp/orchestrate.json',
      tools: [
        { name: 'search_agents', icon: 'hub', runtime: 'brain' as const },
        { name: 'invite', icon: 'bolt', runtime: 'brain' as const },
        { name: 'search_web', icon: 'language', runtime: 'registry' as const },
      ],
    };
    expect(exposedToolsFor([sy])).toEqual(['search_web']);
    expect(flattenMcpTools([sy]).map((t) => t.name)).toEqual(['search_agents', 'invite', 'search_web']);
  });

  it('defaults an unmarked tool to registry, so existing declarations are unchanged', () => {
    const out = parseMcpDeclaration({ tools: [{ name: 'read_file' }] }, 'p', 's');
    expect(out?.tools?.[0].runtime).toBe('registry');
    expect(exposedToolsFor([out!])).toEqual(['read_file']);
  });

  /**
   * A typo must not silently revoke a working tool: anything that is not
   * exactly 'brain' has to fall back to registry, or `runtime: "brian"` would
   * drop the tool from the allowlist and von-node would stop serving it.
   */
  it('treats an unrecognised runtime as registry', () => {
    const out = parseMcpDeclaration({ tools: [{ name: 'read_file', runtime: 'brian' }] }, 'p', 's');
    expect(out?.tools?.[0].runtime).toBe('registry');
    expect(exposedToolsFor([out!])).toEqual(['read_file']);
  });

  it('yields an empty allowlist when every tool is brain-side', () => {
    const out = parseMcpDeclaration(
      { tools: [{ name: 'invite', runtime: 'brain' }, { name: 'search_agents', runtime: 'brain' }] },
      'p',
      's',
    );
    // [] is inert-but-declared, which von-node distinguishes from null.
    expect(exposedToolsFor([out!])).toEqual([]);
    expect(flattenMcpTools([out!])).toHaveLength(2);
  });
});
