import { describe, it, expect } from 'vitest';
import {
  upsertCatalogApproval,
  removeCatalogApproval,
  approvedCatalogRefs,
} from '../dna/catalog-approval';
import { emptyTemplateManifest, type TemplateManifest } from '../dna/template-paths';
import { makeApproval } from '../approval';

/**
 * Approving a CATALOG template: the record is the workspace's, because the
 * catalog is one shared read-only library and a stamp written there would
 * approve the template for everyone.
 */

const stamp = makeApproval('renaud', { at: '2026-09-17T10:00:00.000Z' });
const REF = 'catalog/templates/advertising/display/mrec';

const withOwn = (): TemplateManifest => ({
  ...emptyTemplateManifest('Ours'),
  examples: [
    { slug: 'poster-quote', title: 'House poster', type: 'design', open: 'read_design', path: 'templates/poster-quote/poster-quote.dsgn' },
  ],
});

describe('upsertCatalogApproval', () => {
  it('adds an entry that points at the catalog rather than copying it', () => {
    const m = upsertCatalogApproval(emptyTemplateManifest('Ours'), { catalogRef: REF, approval: stamp });
    expect(m.examples).toHaveLength(1);
    expect(m.examples[0]).toMatchObject({ slug: 'mrec', catalogRef: REF, path: REF });
    expect(m.examples[0]!.approved).toMatchObject({ by: 'renaud' });
  });

  it('carries the catalog entry across so a listing renders without reading the catalog', () => {
    const m = upsertCatalogApproval(emptyTemplateManifest('Ours'), {
      catalogRef: REF,
      approval: stamp,
      entry: { title: 'MREC 300x250', type: 'design', teaches: 'The smallest served canvas.' },
    });
    expect(m.examples[0]).toMatchObject({ title: 'MREC 300x250', teaches: 'The smallest served canvas.' });
  });

  it('re-approving the same ref refreshes the stamp instead of duplicating it', () => {
    const first = upsertCatalogApproval(emptyTemplateManifest('Ours'), { catalogRef: REF, approval: stamp });
    const again = makeApproval('someone-else', { at: '2026-09-18T09:00:00.000Z' });
    const m = upsertCatalogApproval(first, { catalogRef: REF, approval: again });
    expect(m.examples).toHaveLength(1);
    expect(m.examples[0]!.approved).toMatchObject({ by: 'someone-else' });
  });

  it("leaves the workspace's own same-named template alone", () => {
    // A workspace curating its own `poster-quote` AND approving the catalog's
    // must not have one collapse into the other — the match is on catalogRef.
    const m = upsertCatalogApproval(withOwn(), {
      catalogRef: 'catalog/templates/poster-quote',
      approval: stamp,
      entry: { slug: 'poster-quote', title: 'Platform poster' },
    });
    expect(m.examples).toHaveLength(2);
    expect(m.examples[0]).toMatchObject({ title: 'House poster', path: 'templates/poster-quote/poster-quote.dsgn' });
    expect(m.examples[0]!.catalogRef).toBeUndefined();
  });
});

describe('removeCatalogApproval', () => {
  it('removes a bare pointer entirely — it existed only to carry the stamp', () => {
    const m = upsertCatalogApproval(emptyTemplateManifest('Ours'), { catalogRef: REF, approval: stamp });
    expect(removeCatalogApproval(m, REF).examples).toHaveLength(0);
  });

  it('keeps an entry a person customised, minus the stamp', () => {
    const m = upsertCatalogApproval(emptyTemplateManifest('Ours'), {
      catalogRef: REF, approval: stamp, entry: { teaches: 'Our house use of it.' },
    });
    const after = removeCatalogApproval(m, REF);
    expect(after.examples).toHaveLength(1);
    expect(after.examples[0]!.approved).toBeUndefined();
    expect(after.examples[0]!.teaches).toBe('Our house use of it.');
  });

  it('touches nothing when the ref was never approved', () => {
    const m = withOwn();
    expect(removeCatalogApproval(m, REF).examples).toHaveLength(1);
  });
});

describe('approvedCatalogRefs', () => {
  it('lists the catalog refs this workspace approved, and only those', () => {
    let m = upsertCatalogApproval(withOwn(), { catalogRef: REF, approval: stamp });
    m = upsertCatalogApproval(m, { catalogRef: 'catalog/templates/a/b', approval: stamp });
    expect(approvedCatalogRefs(m)).toEqual([REF, 'catalog/templates/a/b']);
  });
});
