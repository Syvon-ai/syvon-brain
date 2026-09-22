import { describe, it, expect } from 'vitest';
import {
  parseBrandOverrideRef,
  formatBrandOverrideRef,
  sameBrandOverrideRef,
  describeBrandOverrideRef,
  readDsgnBrandOverride,
  writeDsgnBrandOverride,
  readCompBrandOverride,
  writeCompBrandOverride,
} from '../dna/brand-override';
import { resolveAuxBrandPath, joinAuxBrandRoot, isAuxBrandSlug } from '../dna/aux-brands';

describe('parseBrandOverrideRef', () => {
  it('reads a bare workspace as ambiguous — the resolver decides', () => {
    expect(parseBrandOverrideRef('cipher')).toEqual({ workspace: 'cipher', local: true });
  });

  it('reads workspace.brand', () => {
    expect(parseBrandOverrideRef('acme.cipher')).toEqual({ workspace: 'acme', brand: 'cipher' });
  });

  it('normalises `.default` to the root brand rather than an aux slug', () => {
    // A `brands/default/` folder would only be addressable as `ws.default`,
    // which already means the root — so the word never survives parsing.
    expect(parseBrandOverrideRef('acme.default')).toEqual({ workspace: 'acme' });
    expect(isAuxBrandSlug('default')).toBe(false);
  });

  it('carries a cloud id through the hash', () => {
    expect(parseBrandOverrideRef('acme.cipher#cw_01h')).toEqual({
      workspace: 'acme',
      brand: 'cipher',
      workspaceId: 'cw_01h',
    });
  });

  it('lowercases both halves', () => {
    expect(parseBrandOverrideRef('  Acme.Cipher  ')).toEqual({ workspace: 'acme', brand: 'cipher' });
  });

  it('refuses anything that is not a slug pair', () => {
    for (const bad of ['', '   ', 'a.b.c', '../etc', 'a/b', 'a\\b', '.cipher', 'acme.', 42, null, undefined]) {
      expect(parseBrandOverrideRef(bad as unknown)).toBeNull();
    }
  });
});

describe('formatBrandOverrideRef', () => {
  it('round-trips both forms', () => {
    for (const wire of ['cipher', 'acme.cipher', 'acme.cipher#cw_01h']) {
      expect(formatBrandOverrideRef(parseBrandOverrideRef(wire)!)).toBe(wire);
    }
  });

  it('writes `acme` for a ref that named the root brand explicitly', () => {
    expect(formatBrandOverrideRef(parseBrandOverrideRef('acme.default')!)).toBe('acme');
  });
});

describe('sameBrandOverrideRef', () => {
  it('ignores the id and the bare/dotted distinction', () => {
    const a = parseBrandOverrideRef('acme.cipher#cw_1')!;
    const b = parseBrandOverrideRef('acme.cipher')!;
    expect(sameBrandOverrideRef(a, b)).toBe(true);
    expect(sameBrandOverrideRef(a, parseBrandOverrideRef('acme')!)).toBe(false);
    expect(sameBrandOverrideRef(null, null)).toBe(true);
    expect(sameBrandOverrideRef(a, null)).toBe(false);
  });
});

describe('describeBrandOverrideRef', () => {
  it('labels both shapes', () => {
    expect(describeBrandOverrideRef({ workspace: 'acme' })).toBe('acme');
    expect(describeBrandOverrideRef({ workspace: 'acme', brand: 'cipher' })).toBe('acme · cipher');
  });
});

describe('.dsgn header', () => {
  const withHeader = [
    '<!--',
    '  @name: Cover',
    '  @description: A cover.',
    '-->',
    '<FormatCanvas width={1920} height={1080}>',
    '</FormatCanvas>',
    '',
  ].join('\n');

  it('reads nothing from a header that declares nothing', () => {
    expect(readDsgnBrandOverride(withHeader)).toBeNull();
    expect(readDsgnBrandOverride('')).toBeNull();
    expect(readDsgnBrandOverride(null)).toBeNull();
  });

  it('appends to an existing header, keeping its indentation and its other fields', () => {
    const next = writeDsgnBrandOverride(withHeader, { workspace: 'acme', brand: 'cipher' });
    expect(next).toContain('  @brand: acme.cipher');
    expect(next).toContain('@name: Cover');
    expect(next).toContain('@description: A cover.');
    expect(next).toContain('<FormatCanvas');
    expect(readDsgnBrandOverride(next)).toEqual({ workspace: 'acme', brand: 'cipher' });
  });

  it('replaces in place rather than adding a second line', () => {
    const once = writeDsgnBrandOverride(withHeader, { workspace: 'acme' });
    const twice = writeDsgnBrandOverride(once, { workspace: 'nike', brand: 'retro' });
    expect(twice.match(/@brand:/g)).toHaveLength(1);
    expect(readDsgnBrandOverride(twice)).toEqual({ workspace: 'nike', brand: 'retro' });
  });

  it('clears the line completely, leaving no blank gap', () => {
    const once = writeDsgnBrandOverride(withHeader, { workspace: 'acme' });
    expect(writeDsgnBrandOverride(once, null)).toBe(withHeader);
  });

  it('is a no-op when clearing a file that declares nothing', () => {
    expect(writeDsgnBrandOverride(withHeader, null)).toBe(withHeader);
  });

  it('writes a header for a file that has none', () => {
    const bare = '<FormatCanvas width={1080} height={1080}>\n</FormatCanvas>\n';
    const next = writeDsgnBrandOverride(bare, { workspace: 'acme' });
    expect(readDsgnBrandOverride(next)).toEqual({ workspace: 'acme', local: true });
    expect(next).toContain('<FormatCanvas');
  });

  it('ignores a malformed declaration instead of throwing', () => {
    expect(readDsgnBrandOverride('<!--\n  @brand: ../../etc\n-->\n')).toBeNull();
  });
});

describe('.comp field', () => {
  it('reads and writes the top-level brand', () => {
    const doc = { $schema: 'seq/v2', fps: 30 } as Record<string, unknown>;
    expect(readCompBrandOverride(doc)).toBeNull();
    const next = writeCompBrandOverride(doc, { workspace: 'acme', brand: 'cipher' });
    expect(next.brand).toBe('acme.cipher');
    expect(next.fps).toBe(30);
    expect(readCompBrandOverride(next)).toEqual({ workspace: 'acme', brand: 'cipher' });
    expect(writeCompBrandOverride(next, null).brand).toBeUndefined();
  });

  it('is null-safe on non-objects', () => {
    for (const bad of [null, undefined, 'x', 42, []]) {
      expect(readCompBrandOverride(bad)).toBeNull();
    }
  });
});

describe('aux-brand paths', () => {
  it('resolves the root brand to the workspace itself', () => {
    expect(resolveAuxBrandPath(null)).toBe('');
    expect(resolveAuxBrandPath('default')).toBe('');
    expect(joinAuxBrandRoot('D:\\ws\\acme', undefined)).toBe('D:\\ws\\acme');
  });

  it('nests an auxiliary brand under brands/, keeping the root separator', () => {
    expect(resolveAuxBrandPath('cipher')).toBe('brands/cipher');
    expect(joinAuxBrandRoot('D:\\ws\\acme', 'cipher')).toBe('D:\\ws\\acme\\brands\\cipher');
    expect(joinAuxBrandRoot('/home/ws/acme/', 'cipher')).toBe('/home/ws/acme/brands/cipher');
  });
});
