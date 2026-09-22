import { describe, it, expect } from 'vitest';
import {
  readFileBrandOverride,
  readReactBrandOverride,
  writeFileBrandOverride,
  writeReactBrandOverride,
} from '../dna/brand-override';

const LITE = { workspace: 'acme-lite', local: true } as const;

describe('writeReactBrandOverride', () => {
  it('adds brand to an existing header, keeping the other fields in order', () => {
    const src = `/* @syvon {"canvas":{"width":1920,"height":1080},"duration":6} */\nexport default () => null;`;
    const out = writeReactBrandOverride(src, LITE);
    expect(out.split('\n')[0]).toBe('/* @syvon {"canvas":{"width":1920,"height":1080},"duration":6,"brand":"acme-lite"} */');
    expect(readReactBrandOverride(out)?.workspace).toBe('acme-lite');
  });

  it('replaces a declared brand in place and clears it with null', () => {
    const src = `/* @syvon {"brand":"old","duration":4} */\nexport default () => null;`;
    expect(writeReactBrandOverride(src, { workspace: 'acme', brand: 'cipher' }).split('\n')[0])
      .toBe('/* @syvon {"brand":"acme.cipher","duration":4} */');
    expect(writeReactBrandOverride(src, null).split('\n')[0]).toBe('/* @syvon {"duration":4} */');
  });

  it('writes a header on line 1 when there is none, and leaves an undeclared file alone on clear', () => {
    const src = 'export default () => null;';
    expect(writeReactBrandOverride(src, LITE)).toBe(`/* @syvon {"brand":"acme-lite"} */\n${src}`);
    expect(writeReactBrandOverride(src, null)).toBe(src);
  });

  it('leaves a malformed header untouched', () => {
    const src = `/* @syvon {canvas: 1920} */\nexport default () => null;`;
    expect(writeReactBrandOverride(src, LITE)).toBe(src);
  });
});

describe('writeFileBrandOverride', () => {
  it('round-trips through readFileBrandOverride for all three formats', () => {
    const files: Array<[string, string]> = [
      ['projects/x/page.dsgn', '<FormatCanvas width={10} height={10}></FormatCanvas>'],
      ['projects/x/chart.react', 'export default () => null;'],
      ['projects/x/deck.comp', JSON.stringify({ version: 2, tracks: [] })],
    ];
    for (const [path, content] of files) {
      const written = writeFileBrandOverride(path, content, LITE);
      expect(readFileBrandOverride(path, written)?.workspace).toBe('acme-lite');
      const cleared = writeFileBrandOverride(path, written, null);
      expect(readFileBrandOverride(path, cleared)).toBeNull();
    }
  });

  it('returns unparseable comps and unknown extensions unchanged', () => {
    expect(writeFileBrandOverride('a.comp', '{not json', LITE)).toBe('{not json');
    expect(writeFileBrandOverride('a.md', '# hi', LITE)).toBe('# hi');
  });
});
