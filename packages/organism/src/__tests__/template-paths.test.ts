import { describe, expect, it } from 'vitest';
import {
  TEMPLATES_INDEX_FILE,
  TEMPLATE_MANIFEST_SCHEMA,
  templatesIndexKey,
  templateFolderKey,
  templateFileKey,
  getWorkspaceTemplatesRoot,
  getCatalogTemplatesRoot,
  templateLibraryRoots,
  templateRootFor,
  isValidTemplateSlug,
  parseTemplateRef,
  formatTemplateRef,
  parseTemplateManifest,
  emptyTemplateManifest,
  mergeTemplateManifests,
  findTemplateEntry,
  findTemplateMatches,
  packManifestKey,
  templateEntryFiles,
  upsertTemplateEntry,
  templateOpenTool,
  templateTypeOf,
  isTemplateLibraryPath,
} from '../dna/template-paths';
import type { TemplateManifest } from '../dna/template-paths';
import { WS_TEMPLATES } from '../workspace-config';

const wsManifest: TemplateManifest = {
  $schema: TEMPLATE_MANIFEST_SCHEMA,
  title: 'Ours',
  examples: [
    { slug: 'poster-quote', title: 'Our poster', type: 'design', open: 'read_design', path: 'templates/poster-quote/poster-quote.dsgn' },
    { slug: 'house-deck', title: 'House deck', type: 'composition', open: 'read_comp', path: 'templates/house-deck/house-deck.comp', files: ['templates/house-deck/house-deck.comp', 'templates/house-deck/cover.dsgn'] },
  ],
};

const catalogManifest: TemplateManifest = {
  $schema: TEMPLATE_MANIFEST_SCHEMA,
  title: 'Catalog',
  examples: [
    { slug: 'poster-quote', title: 'Platform poster', type: 'design', open: 'read_design', path: 'catalog/templates/poster-quote/poster-quote.dsgn' },
    { slug: 'pulse-badge', title: 'Pulse badge', type: 'react-component', open: 'read_react', path: 'catalog/templates/pulse-badge/pulse-badge.react' },
  ],
};

describe('templates library roots', () => {
  it('derives the workspace root from the WS_TEMPLATES registry constant', () => {
    expect(getWorkspaceTemplatesRoot()).toBe(WS_TEMPLATES);
    expect(templateFolderKey(getWorkspaceTemplatesRoot(), 'x').startsWith(`${WS_TEMPLATES}/`)).toBe(true);
  });

  it('orders the roots workspace-first — the order IS the precedence', () => {
    expect(templateLibraryRoots().map((r) => r.scope)).toEqual(['workspace', 'catalog']);
    expect(templateRootFor('workspace')).toBe('templates');
    expect(templateRootFor('catalog')).toBe('catalog/templates');
  });

  it('composes manifest / folder / file keys off a root', () => {
    const root = getCatalogTemplatesRoot();
    expect(templatesIndexKey(root)).toBe(`catalog/templates/${TEMPLATES_INDEX_FILE}`);
    expect(templateFolderKey(root, 'poster-quote')).toBe('catalog/templates/poster-quote');
    expect(templateFileKey(root, 'poster-quote', 'a.dsgn')).toBe('catalog/templates/poster-quote/a.dsgn');
  });
});

describe('template refs', () => {
  it('accepts the four spellings of one template', () => {
    expect(parseTemplateRef('poster-quote')).toEqual({ scope: null, slug: 'poster-quote' });
    expect(parseTemplateRef('templates/poster-quote')).toEqual({ scope: 'workspace', slug: 'poster-quote' });
    expect(parseTemplateRef('catalog/poster-quote')).toEqual({ scope: 'catalog', slug: 'poster-quote' });
    expect(parseTemplateRef('catalog/templates/poster-quote')).toEqual({ scope: 'catalog', slug: 'poster-quote' });
  });

  it('is a NAME, not a path — traversal and foreign roots are rejected', () => {
    // A ref is filled in by a model. If any of these parsed, the reader would
    // compose a key that leaves the library root.
    for (const bad of [
      '../secrets', 'templates/../config', 'templates/poster-quote/../../config/brand.json',
      'projects/mine/thing.dsgn', 'workflows/deck-basics', 'catalog/brands/von',
      'templates/', '', '   ', 'Poster Quote', 'a/b/c/d',
    ]) {
      expect(parseTemplateRef(bad), bad).toBeNull();
    }
  });

  it('round-trips through the canonical spelling', () => {
    expect(formatTemplateRef({ scope: 'workspace', slug: 'poster-quote' })).toBe('templates/poster-quote');
    expect(formatTemplateRef({ scope: 'catalog', slug: 'poster-quote' })).toBe('catalog/templates/poster-quote');
    expect(parseTemplateRef(formatTemplateRef({ scope: 'catalog', slug: 'x' }))).toEqual({ scope: 'catalog', slug: 'x' });
  });

  it('validates slugs as folder names', () => {
    expect(isValidTemplateSlug('poster-quote')).toBe(true);
    expect(isValidTemplateSlug('a1')).toBe(true);
    for (const bad of ['Poster', 'a_b', 'a/b', 'a.b', '-a', 'a-', '..']) {
      expect(isValidTemplateSlug(bad), bad).toBe(false);
    }
  });
});

describe('merge + lookup', () => {
  it('lets the workspace shadow the catalog on a clashing slug', () => {
    const merged = mergeTemplateManifests({ workspace: wsManifest, catalog: catalogManifest });
    expect(merged.map((e) => `${e.scope}:${e.slug}`)).toEqual([
      'workspace:poster-quote',
      'workspace:house-deck',
      'catalog:pulse-badge',
    ]);
    expect(merged[0].title).toBe('Our poster');
    expect(merged[0].ref).toBe('templates/poster-quote');
  });

  it('skips a scope with no manifest — the ordinary workspace has none of its own', () => {
    const merged = mergeTemplateManifests({ workspace: null, catalog: catalogManifest });
    expect(merged.every((e) => e.scope === 'catalog')).toBe(true);
  });

  it('honours an explicit scope on lookup, and defaults to workspace-first', () => {
    const merged = mergeTemplateManifests({ workspace: wsManifest, catalog: catalogManifest });
    expect(findTemplateEntry(merged, { scope: null, slug: 'poster-quote' })?.scope).toBe('workspace');
    // The catalog's shadowed entry is not in the merged list at all, so an
    // explicit catalog scope for a shadowed slug finds nothing rather than
    // silently returning the workspace's.
    expect(findTemplateEntry(merged, { scope: 'catalog', slug: 'poster-quote' })).toBeNull();
    expect(findTemplateEntry(merged, { scope: null, slug: 'nope' })).toBeNull();
  });
});

describe('manifest helpers', () => {
  it('returns null rather than throwing on an unusable manifest', () => {
    expect(parseTemplateManifest('{ not json')).toBeNull();
    expect(parseTemplateManifest('{"title":"x"}')).toBeNull();
    expect(parseTemplateManifest('{"examples":[]}')?.examples).toEqual([]);
  });

  it('drops entries with no slug rather than carrying a half-entry', () => {
    const m = parseTemplateManifest('{"examples":[{"slug":"a","path":"p"},{"title":"no slug"}]}');
    expect(m?.examples).toHaveLength(1);
  });

  it('upserts by slug, keeping order stable', () => {
    const base = emptyTemplateManifest('Ours');
    const one = upsertTemplateEntry(base, wsManifest.examples[0]);
    const two = upsertTemplateEntry(one, wsManifest.examples[1]);
    const replaced = upsertTemplateEntry(two, { ...wsManifest.examples[0], title: 'Renamed' });
    expect(replaced.examples.map((e) => e.slug)).toEqual(['poster-quote', 'house-deck']);
    expect(replaced.examples[0].title).toBe('Renamed');
    expect(base.examples).toHaveLength(0); // input untouched
  });

  it('reports EVERY file a template ships — a deck copied by `path` alone lands broken', () => {
    expect(templateEntryFiles(wsManifest.examples[1])).toHaveLength(2);
    expect(templateEntryFiles(wsManifest.examples[0])).toEqual([wsManifest.examples[0].path]);
  });

  it('maps a filename to its reader and its kind', () => {
    expect(templateOpenTool('a.comp')).toBe('read_comp');
    expect(templateOpenTool('a.react')).toBe('read_react');
    expect(templateOpenTool('a.dsgn')).toBe('read_design');
    expect(templateTypeOf('a.comp')).toBe('composition');
    expect(templateTypeOf('a.react')).toBe('react-component');
    expect(templateTypeOf('a.dsgn')).toBe('design');
  });

  it('recognises paths inside either library', () => {
    expect(isTemplateLibraryPath('templates/poster-quote/a.dsgn')).toBe(true);
    expect(isTemplateLibraryPath('Templates/Poster/a.dsgn')).toBe(true);
    expect(isTemplateLibraryPath('catalog/templates/x/a.dsgn')).toBe(true);
    expect(isTemplateLibraryPath('templates')).toBe(true);
    expect(isTemplateLibraryPath('projects/x/a.dsgn')).toBe(false);
    expect(isTemplateLibraryPath('templatesish/a.dsgn')).toBe(false);
  });
});

/**
 * PACKS — a `type: "library"` entry points at another manifest, and everything
 * inside it was unreachable by name until refs learned to say which pack.
 *
 * The catalog ships four packs and nothing else: all six presentation themes,
 * all three brand-guideline themes and every chart component sit behind them.
 * `use_template("boardroom")` answering `unknown_template` is what made a deck
 * cost one `copy_file` per slide.
 */
describe('pack refs', () => {
  it('reads {pack}/{slug} as a pack, not a root', () => {
    expect(parseTemplateRef('presentations/boardroom')).toEqual({
      scope: null,
      slug: 'boardroom',
      pack: 'presentations',
    });
  });

  it('accepts the scoped and full-key spellings of the same thing', () => {
    expect(parseTemplateRef('templates/presentations/boardroom')).toEqual({
      scope: 'workspace',
      slug: 'boardroom',
      pack: 'presentations',
    });
    expect(parseTemplateRef('catalog/presentations/boardroom')).toEqual({
      scope: 'catalog',
      slug: 'boardroom',
      pack: 'presentations',
    });
    expect(parseTemplateRef('catalog/templates/presentations/boardroom')).toEqual({
      scope: 'catalog',
      slug: 'boardroom',
      pack: 'presentations',
    });
  });

  it('keeps `catalog/templates/{slug}` meaning a TOP-LEVEL entry', () => {
    // Three parts, and the pack reading would have taken it. This spelling
    // predates packs and every issued ref using it has to keep resolving.
    expect(parseTemplateRef('catalog/templates/poster-quote')).toEqual({
      scope: 'catalog',
      slug: 'poster-quote',
    });
  });

  it('still rejects a foreign ROOT in the pack position', () => {
    for (const bad of [
      'workflows/deck-basics',
      'catalog/brands/von',
      'projects/my-deck',
      'assets/logo',
      'templates/workflows/x',
    ]) {
      expect(parseTemplateRef(bad), bad).toBeNull();
    }
  });

  it('round-trips a packed ref through its canonical spelling', () => {
    const ref = formatTemplateRef({ scope: 'catalog', slug: 'boardroom', pack: 'presentations' });
    expect(ref).toBe('catalog/templates/presentations/boardroom');
    expect(parseTemplateRef(ref)).toEqual({
      scope: 'catalog',
      slug: 'boardroom',
      pack: 'presentations',
    });
  });
});

describe('merging a library that has packs in it', () => {
  const entry = (slug: string, type = 'composition') =>
    ({ slug, title: slug, type, open: 'read_comp', path: `catalog/templates/${slug}.comp` }) as never;

  const root = {
    $schema: 'catalog-examples/v1',
    title: 'root',
    examples: [
      entry('poster-quote', 'design'),
      { ...(entry('presentations', 'library') as object), path: 'catalog/templates/presentations/index.json' },
      { ...(entry('brand-guidelines', 'library') as object), path: 'catalog/templates/brand-guidelines/index.json' },
    ],
  } as never;

  const packs = new Map([
    [
      packManifestKey('catalog', 'presentations'),
      { $schema: 'x', title: 'p', examples: [entry('boardroom'), entry('editorial')] } as never,
    ],
    [
      packManifestKey('catalog', 'brand-guidelines'),
      { $schema: 'x', title: 'b', examples: [entry('swiss'), entry('editorial')] } as never,
    ],
  ]);

  it('inlines a pack right after the entry that points at it', () => {
    const merged = mergeTemplateManifests({ catalog: root }, packs);
    expect(merged.map((e) => e.ref)).toEqual([
      'catalog/templates/poster-quote',
      'catalog/templates/presentations',
      'catalog/templates/presentations/boardroom',
      'catalog/templates/presentations/editorial',
      'catalog/templates/brand-guidelines',
      'catalog/templates/brand-guidelines/swiss',
      'catalog/templates/brand-guidelines/editorial',
    ]);
  });

  it('keeps the SAME slug in two packs as two entries', () => {
    // `editorial` is a theme in both systems. Deduping it by slug would delete
    // one of the two real templates.
    const merged = mergeTemplateManifests({ catalog: root }, packs);
    expect(merged.filter((e) => e.slug === 'editorial')).toHaveLength(2);
  });

  it('leaves the library entry standing when its pack could not be read', () => {
    const merged = mergeTemplateManifests({ catalog: root });
    expect(merged.map((e) => e.ref)).toEqual([
      'catalog/templates/poster-quote',
      'catalog/templates/presentations',
      'catalog/templates/brand-guidelines',
    ]);
  });

  it('resolves an unqualified slug only when it is unique', () => {
    const merged = mergeTemplateManifests({ catalog: root }, packs);
    const one = findTemplateEntry(merged, parseTemplateRef('boardroom')!);
    expect(one?.ref).toBe('catalog/templates/presentations/boardroom');

    // Ambiguous: null from the single-answer helper, both from the list.
    const ambiguous = parseTemplateRef('editorial')!;
    expect(findTemplateEntry(merged, ambiguous)).toBeNull();
    expect(findTemplateMatches(merged, ambiguous).map((e) => e.ref)).toEqual([
      'catalog/templates/presentations/editorial',
      'catalog/templates/brand-guidelines/editorial',
    ]);

    // Qualifying it picks one.
    expect(
      findTemplateEntry(merged, parseTemplateRef('brand-guidelines/editorial')!)?.ref,
    ).toBe('catalog/templates/brand-guidelines/editorial');
  });

  it('prefers a TOP-LEVEL entry over a packed one of the same slug', () => {
    const withTop = {
      ...(root as object),
      examples: [...(root as never as { examples: unknown[] }).examples, entry('editorial', 'design')],
    } as never;
    const merged = mergeTemplateManifests({ catalog: withTop }, packs);
    expect(findTemplateEntry(merged, parseTemplateRef('editorial')!)?.ref).toBe(
      'catalog/templates/editorial',
    );
  });
});
