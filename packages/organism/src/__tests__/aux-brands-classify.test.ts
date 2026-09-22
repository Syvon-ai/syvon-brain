import { describe, it, expect } from 'vitest';
import { classifyBrandsFolders, listAuxBrandSlugs } from '../dna/aux-brands';
import {
  parseBrandOverrideRef,
  readReactBrandOverride,
  readFileBrandOverride,
  resolveLocalBrandOverride,
  type BrandOverrideRef,
} from '../dna/brand-override';

const ROOT = ['config/design-tokens.json', 'config/brand.json'];
const auxKeys = (slug: string) => [
  `brands/${slug}/config/design-tokens.json`,
  `brands/${slug}/config/brand.json`,
  `brands/${slug}/assets/logos/logo.svg`,
  `brands/${slug}/meta/kit.json`,
];

describe('classifyBrandsFolders — auxiliary brand vs v8.6 residue', () => {
  it('a complete theme root in a flattened workspace is an auxiliary brand', () => {
    const v = classifyBrandsFolders({ keys: [...ROOT, ...auxKeys('lakeside-college')] });
    expect(v).toEqual([{ slug: 'lakeside-college', kind: 'aux' }]);
    expect(listAuxBrandSlugs({ keys: [...ROOT, ...auxKeys('lakeside-college')] })).toEqual(['lakeside-college']);
  });

  it('everything under brands/ is residue when the root was never flattened', () => {
    const v = classifyBrandsFolders({ keys: auxKeys('acme') });
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ slug: 'acme', kind: 'residue' });
  });

  it('the workspace\'s OWN brand name under brands/ is residue, not a second brand', () => {
    const v = classifyBrandsFolders({ keys: [...ROOT, ...auxKeys('acme')], ownSlugs: ['Acme', null] });
    expect(v[0]).toMatchObject({ slug: 'acme', kind: 'residue' });
  });

  it('brands/default/ is residue — `default` is the root brand\'s name', () => {
    const v = classifyBrandsFolders({ keys: [...ROOT, ...auxKeys('default')] });
    expect(v[0]).toMatchObject({ slug: 'default', kind: 'residue' });
  });

  it('pre-v11 files loose in the brand folder, or a wrapper/, mark residue', () => {
    const loose = classifyBrandsFolders({ keys: [...ROOT, 'brands/old/design-tokens.json', 'brands/old/config/design-tokens.json'] });
    expect(loose[0]).toMatchObject({ slug: 'old', kind: 'residue' });
    const site = classifyBrandsFolders({ keys: [...ROOT, ...auxKeys('site'), 'brands/site/wrapper/site.json'] });
    expect(site[0]).toMatchObject({ slug: 'site', kind: 'residue' });
  });

  it('a dotfile in the brand folder (.keep, .DS_Store) does not make a complete brand residue', () => {
    const v = classifyBrandsFolders({ keys: [...ROOT, ...auxKeys('lakeside'), 'brands/lakeside/.keep', 'brands/lakeside/.DS_Store'] });
    expect(v).toEqual([{ slug: 'lakeside', kind: 'aux' }]);
  });

  it('loose files directly under brands/ are residue', () => {
    const v = classifyBrandsFolders({ keys: [...ROOT, 'brands/.keep'] });
    expect(v).toEqual([expect.objectContaining({ slug: '', kind: 'residue' })]);
  });

  it('an uppercase folder is residue — refs are lowercased, so nothing could ever address it', () => {
    const v = classifyBrandsFolders({ keys: [...ROOT, ...auxKeys('Lakeside')] });
    expect(v[0]).toMatchObject({ slug: 'Lakeside', kind: 'residue' });
  });

  it('a well-named folder with no tokens is incomplete, not residue', () => {
    const v = classifyBrandsFolders({ keys: [...ROOT, 'brands/half/assets/logos/logo.svg'] });
    expect(v).toEqual([expect.objectContaining({ slug: 'half', kind: 'incomplete' })]);
    expect(listAuxBrandSlugs({ keys: [...ROOT, 'brands/half/assets/logos/logo.svg'] })).toEqual([]);
  });

  it('ignores keys outside brands/ and returns slugs sorted', () => {
    const v = classifyBrandsFolders({ keys: [...ROOT, ...auxKeys('zeta'), ...auxKeys('alpha'), 'projects/brands/x.dsgn'] });
    expect(v.map((x) => x.slug)).toEqual(['alpha', 'zeta']);
  });
});

describe('readReactBrandOverride / readFileBrandOverride', () => {
  it('reads `brand` from a .react header', () => {
    const src = '/* @syvon {"canvas":{"width":10,"height":10},"brand":"lakeside-college"} */\nexport default () => null;';
    expect(readReactBrandOverride(src)).toEqual({ workspace: 'lakeside-college', local: true });
  });

  it('degrades to null on a missing or malformed header', () => {
    expect(readReactBrandOverride('export default 1')).toBeNull();
    expect(readReactBrandOverride('/* @syvon {not json} */')).toBeNull();
    expect(readReactBrandOverride(null)).toBeNull();
  });

  it('dispatches by extension', () => {
    expect(readFileBrandOverride('projects/a/x.dsgn', '<!--\n  @brand: edu.lakeside\n-->\n<FormatCanvas />'))
      .toEqual({ workspace: 'edu', brand: 'lakeside' });
    expect(readFileBrandOverride('projects/a/x.comp', JSON.stringify({ brand: 'st-mary' })))
      .toEqual({ workspace: 'st-mary', local: true });
    expect(readFileBrandOverride('projects/a/x.react', '/* @syvon {"brand":"acme.cipher"} */'))
      .toEqual({ workspace: 'acme', brand: 'cipher' });
    expect(readFileBrandOverride('projects/a/x.comp', '{broken')).toBeNull();
    expect(readFileBrandOverride('assets/x.png', 'brand: acme')).toBeNull();
  });
});

describe('resolveLocalBrandOverride', () => {
  const has = (...slugs: string[]) => (slug: string) => slugs.includes(slug);
  const ref = (raw: string) => parseBrandOverrideRef(raw) as BrandOverrideRef;

  it('a bare name is this workspace\'s auxiliary brand first', async () => {
    expect(await resolveLocalBrandOverride(ref('lakeside'), 'edustudio', has('lakeside')))
      .toEqual({ kind: 'aux', slug: 'lakeside', root: 'brands/lakeside' });
  });

  it('a bare name that is this workspace (and no aux brand) is the root', async () => {
    expect(await resolveLocalBrandOverride(ref('edustudio'), 'edustudio', has())).toEqual({ kind: 'root' });
  });

  it('a bare name that is neither is foreign', async () => {
    expect((await resolveLocalBrandOverride(ref('catalog'), 'edustudio', has())).kind).toBe('foreign');
  });

  it('dotted refs to this workspace resolve to aux, or missing when absent', async () => {
    expect(await resolveLocalBrandOverride(ref('edustudio.lakeside'), 'edustudio', has('lakeside')))
      .toEqual({ kind: 'aux', slug: 'lakeside', root: 'brands/lakeside' });
    expect(await resolveLocalBrandOverride(ref('edustudio.gone'), 'edustudio', has()))
      .toEqual({ kind: 'missing', slug: 'gone' });
    expect(await resolveLocalBrandOverride(ref('edustudio.default'), 'edustudio', has())).toEqual({ kind: 'root' });
  });

  it('dotted refs to another workspace are foreign', async () => {
    expect((await resolveLocalBrandOverride(ref('catalog.cipher'), 'edustudio', has('cipher'))).kind).toBe('foreign');
  });

  it('with no known workspace slug, a dotted ref is honoured only when the aux brand exists', async () => {
    expect((await resolveLocalBrandOverride(ref('whatever.lakeside'), null, has('lakeside'))).kind).toBe('aux');
    expect((await resolveLocalBrandOverride(ref('whatever.lakeside'), null, has())).kind).toBe('foreign');
  });

  it('accepts an async existence check', async () => {
    const r = await resolveLocalBrandOverride(ref('lakeside'), 'edustudio', async (s) => s === 'lakeside');
    expect(r.kind).toBe('aux');
  });
});
