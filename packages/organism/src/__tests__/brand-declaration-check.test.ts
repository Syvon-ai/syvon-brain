import { describe, expect, it } from 'vitest';
import {
  checkBrandDeclarations,
  collectBrandEmbedPaths,
  type BrandDeclarationIO,
} from '../dna/brand-declaration-check';
import { readFileBrandDeclaration } from '../dna/brand-override';

const TOKENS = '{"variables":{}}';

/** An in-memory workspace: files by path, folders derived from them. */
function workspace(files: Record<string, string>): BrandDeclarationIO & { reads: string[] } {
  const reads: string[] = [];
  return {
    reads,
    readFile(p) {
      reads.push(p);
      return p in files ? files[p]! : null;
    },
    listDirs(dir) {
      const prefix = `${dir}/`;
      const names = new Set<string>();
      for (const key of Object.keys(files)) {
        if (!key.startsWith(prefix)) continue;
        const rest = key.slice(prefix.length);
        const slash = rest.indexOf('/');
        if (slash > 0) names.add(rest.slice(0, slash));
      }
      return [...names];
    },
  };
}

const dsgn = (brand: string | null, body = '') =>
  `<!--\n  @name: Page\n${brand === null ? '' : `  @brand: ${brand}\n`}-->\n<FormatCanvas width={1080} height={1080}>${body}</FormatCanvas>`;
const react = (brand: string) => `/* @syvon {"canvas":{"width":10,"height":10},"brand":${JSON.stringify(brand)}} */\nexport default () => null;`;

const BASE = {
  'config/design-tokens.json': TOKENS,
  'brands/cipher/config/design-tokens.json': TOKENS,
  'brands/lakeside/config/design-tokens.json': TOKENS,
  // a folder with no tokens is NOT an available sub-brand
  'brands/draft/meta/notes.md': 'x',
};
const OPTS = { workspaceSlugs: ['acme'] };

describe('checkBrandDeclarations — the declaration itself', () => {
  it('passes a file that declares nothing', async () => {
    expect(await checkBrandDeclarations('p.dsgn', dsgn(null), workspace(BASE), OPTS)).toEqual([]);
  });

  it('passes a local sub-brand that has tokens', async () => {
    expect(await checkBrandDeclarations('p.dsgn', dsgn('cipher'), workspace(BASE), OPTS)).toEqual([]);
  });

  it('errors on a missing local sub-brand, and lists the ones that exist', async () => {
    const [issue, ...rest] = await checkBrandDeclarations('projects/x/p.dsgn', dsgn('acme-lite'), workspace(BASE), OPTS);
    expect(rest).toEqual([]);
    expect(issue).toMatchObject({ severity: 'error', code: 'brand_not_found', ref: 'acme-lite', chain: ['projects/x/p.dsgn'] });
    expect(issue!.message).toContain('brands/acme-lite/config/design-tokens.json');
    expect(issue!.message).toContain('Available sub-brands: cipher, lakeside.');
    expect(issue!.message).not.toContain('draft');
    // …and names the unambiguous spelling of the other reading.
    expect(issue!.message).toContain('"acme-lite.default"');
  });

  it('says so when the workspace has no sub-brands at all', async () => {
    const [issue] = await checkBrandDeclarations('p.dsgn', dsgn('nope'), workspace({ 'config/design-tokens.json': TOKENS }), OPTS);
    expect(issue!.message).toContain('no sub-brands');
  });

  it('errors on a ref that does not parse', async () => {
    for (const bad of ['acme/cipher', 'a.b.c', '-bad']) {
      const [issue] = await checkBrandDeclarations('p.dsgn', dsgn(bad), workspace(BASE), OPTS);
      expect(issue, bad).toMatchObject({ severity: 'error', code: 'brand_ref_unparseable' });
      expect(issue!.message).toContain('expected `slug`, `workspace.brand` or `workspace.default`');
    }
  });

  it('errors on a non-string brand in a .comp', async () => {
    const [issue] = await checkBrandDeclarations('d.comp', '{"brand":42,"tracks":[]}', workspace(BASE), OPTS);
    expect(issue).toMatchObject({ severity: 'error', code: 'brand_ref_unparseable' });
  });

  it('always accepts `default` and `<this-ws>.default`, and the bare workspace name', async () => {
    for (const ok of ['default', 'acme.default', 'acme']) {
      expect(await checkBrandDeclarations('p.dsgn', dsgn(ok), workspace({}), OPTS), ok).toEqual([]);
    }
  });

  it('checks `<this-ws>.brand` locally — present passes, missing errors', async () => {
    expect(await checkBrandDeclarations('p.dsgn', dsgn('acme.cipher'), workspace(BASE), OPTS)).toEqual([]);
    const [issue] = await checkBrandDeclarations('p.dsgn', dsgn('acme.ghost'), workspace(BASE), OPTS);
    expect(issue).toMatchObject({ severity: 'error', code: 'brand_not_found' });
    expect(issue!.message).toContain('brands/ghost/config/design-tokens.json');
    expect(issue!.message).toContain('cipher, lakeside');
  });

  it('only WARNS for a workspace it cannot see', async () => {
    for (const foreign of ['catalog.cipher', 'catalog.default']) {
      const [issue, ...rest] = await checkBrandDeclarations('p.dsgn', dsgn(foreign), workspace(BASE), OPTS);
      expect(rest).toEqual([]);
      expect(issue, foreign).toMatchObject({ severity: 'warning', code: 'brand_unverifiable' });
      expect(issue!.message).toContain('cannot verify brand in workspace `catalog` from here');
    }
  });

  it('with the workspace name unknown, honours a dotted ref whose sub-brand exists here', async () => {
    expect(await checkBrandDeclarations('p.dsgn', dsgn('whoever.cipher'), workspace(BASE))).toEqual([]);
    const [issue] = await checkBrandDeclarations('p.dsgn', dsgn('whoever.ghost'), workspace(BASE));
    expect(issue).toMatchObject({ severity: 'warning' });
  });

  it('reads all three formats', async () => {
    const io = workspace(BASE);
    expect(await checkBrandDeclarations('c.react', react('ghost'), io, OPTS)).toHaveLength(1);
    expect(await checkBrandDeclarations('d.comp', '{"brand":"ghost"}', io, OPTS)).toHaveLength(1);
    expect(await checkBrandDeclarations('p.dsgn', dsgn('ghost'), io, OPTS)).toHaveLength(1);
  });
});

describe('checkBrandDeclarations — embeds', () => {
  it('walks .comp → .dsgn → .react and reports the leaf with its chain', async () => {
    const files = {
      ...BASE,
      'projects/x/deck.comp': JSON.stringify({
        $schema: 'seq/v2',
        mode: 'deck',
        brand: 'cipher',
        tracks: [{ id: 'pages', items: [{ id: 'p1', source: 'p1.dsgn' }, { id: 'bg', source: 'https://x/y.mp4' }] }],
      }),
      'projects/x/p1.dsgn': dsgn('lakeside', '<Asset src="assets/react/chart.react" width="fill" />'),
      'assets/react/chart.react': react('acme-lite'),
    };
    const issues = await checkBrandDeclarations('projects/x/deck.comp', files['projects/x/deck.comp'], workspace(files), OPTS);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: 'error',
      code: 'brand_not_found',
      file: 'assets/react/chart.react',
      chain: ['projects/x/deck.comp', 'projects/x/p1.dsgn', 'assets/react/chart.react'],
    });
    expect(issues[0]!.message).toMatch(
      /^projects\/x\/deck\.comp → projects\/x\/p1\.dsgn → assets\/react\/chart\.react: brand ref "acme-lite" not found/,
    );
  });

  it('does not follow embeds when asked not to', async () => {
    const files = { ...BASE, 'p2.dsgn': dsgn('ghost') };
    const root = dsgn(null, '<Asset src="p2.dsgn" />');
    expect(await checkBrandDeclarations('p1.dsgn', root, workspace(files), { ...OPTS, embeds: false })).toEqual([]);
    expect(await checkBrandDeclarations('p1.dsgn', root, workspace(files), OPTS)).toHaveLength(1);
  });

  it('walks a cycle once', async () => {
    const files = {
      ...BASE,
      'projects/x/a.dsgn': dsgn('ghost', '<Asset src="b.dsgn" />'),
      'projects/x/b.dsgn': dsgn(null, '<Asset src="./a.dsgn" />'),
    };
    const io = workspace(files);
    const issues = await checkBrandDeclarations('projects/x/a.dsgn', files['projects/x/a.dsgn'], io, OPTS);
    expect(issues).toHaveLength(1);
    expect(io.reads.filter((r) => r === 'projects/x/a.dsgn')).toHaveLength(0);
    expect(io.reads.filter((r) => r === 'projects/x/b.dsgn')).toHaveLength(1);
  });

  it('stops at the depth cap', async () => {
    const files: Record<string, string> = { ...BASE };
    for (let i = 0; i < 5; i++) files[`d${i}.dsgn`] = dsgn(null, `<Asset src="d${i + 1}.dsgn" />`);
    files['d5.dsgn'] = dsgn('ghost');
    expect(await checkBrandDeclarations('d0.dsgn', files['d0.dsgn'], workspace(files), { ...OPTS, maxDepth: 4 })).toEqual([]);
    expect(await checkBrandDeclarations('d0.dsgn', files['d0.dsgn'], workspace(files), { ...OPTS, maxDepth: 5 })).toHaveLength(1);
  });

  it('skips missing embeds and library refs silently', async () => {
    const root = dsgn(null, '<Asset src="gone.dsgn" /><Asset src="@design-library/cards/x.dsgn" /><Asset src="{slot}.dsgn" />');
    expect(await checkBrandDeclarations('p.dsgn', root, workspace(BASE), OPTS)).toEqual([]);
  });

  it('resolves embeds the way the readers do', () => {
    expect(
      collectBrandEmbedPaths(
        'projects/x/p.dsgn',
        '<FormatCanvas><Asset src="a.react" /><Asset src="../y/b.dsgn" /><Asset src="assets/react/c.react" /><Asset src="hero.png" /></FormatCanvas>',
      ),
    ).toEqual(['projects/x/a.react', 'projects/y/b.dsgn', 'assets/react/c.react']);
    expect(
      collectBrandEmbedPaths(
        'projects/x/deck.comp',
        JSON.stringify({
          tracks: [{ items: [{ source: 'p1.dsgn', inlineShot: { templatePath: 'p1.dsgn' } }, { source: 'templates/t.react' }] }],
          items: [{ source: 'legacy.dsgn' }],
        }),
      ),
    ).toEqual(['projects/x/p1.dsgn', 'templates/t.react', 'projects/x/legacy.dsgn']);
  });
});

describe('readFileBrandDeclaration', () => {
  it('tells undeclared apart from malformed', () => {
    expect(readFileBrandDeclaration('p.dsgn', dsgn(null))).toBeNull();
    expect(readFileBrandDeclaration('p.dsgn', dsgn('a/b'))).toEqual({ raw: 'a/b' });
    expect(readFileBrandDeclaration('c.comp', '{"brand":7}')).toEqual({ raw: 7 });
    expect(readFileBrandDeclaration('c.comp', '{"tracks":[]}')).toBeNull();
    expect(readFileBrandDeclaration('c.react', react('x.y'))).toEqual({ raw: 'x.y' });
  });
});

/**
 * What the check does when it does not know what this workspace is called.
 *
 * `workspaceSlugs` comes from `.Syvon/workspace.json` or, locally, the folder
 * name. A hosted workspace fresh out of onboarding has neither — it is created
 * with `assets/`, `config/` and `meta/` and nothing else — so `own` is empty
 * for every new signup. Erroring there turned "I cannot check this" into "this
 * is wrong, nothing was written", and `create_sequence` refused to write a deck
 * whose pages it had just built, over a brand ref that named the workspace's
 * own brand correctly.
 */
describe('checkBrandDeclarations — when this workspace has no known name', () => {
  const UNKNOWN = { workspaceSlugs: [] as string[] };

  it('allows a bare ref it has no way to disprove', async () => {
    expect(await checkBrandDeclarations('p.dsgn', dsgn('my-brand'), workspace(BASE), UNKNOWN)).toEqual([]);
  });

  it('still resolves a real sub-brand', async () => {
    expect(await checkBrandDeclarations('p.dsgn', dsgn('lakeside'), workspace(BASE), UNKNOWN)).toEqual([]);
  });

  it('still rejects a ref that does not parse', async () => {
    const issues = await checkBrandDeclarations('c.comp', '{"brand":7}', workspace(BASE), UNKNOWN);
    expect(issues.map((i) => i.code)).toEqual(['brand_ref_unparseable']);
  });

  it('keeps erroring once the name IS known', async () => {
    const issues = await checkBrandDeclarations('p.dsgn', dsgn('my-brand'), workspace(BASE), { workspaceSlugs: ['acme'] });
    expect(issues.map((i) => i.code)).toEqual(['brand_not_found']);
  });
});
