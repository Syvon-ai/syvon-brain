import { describe, it, expect } from 'vitest';
import {
  isLogoSlot,
  isLogoFilename,
  classifyLogoSlot,
  resolveLogoFile,
  resolveLogoPath,
  synthesizeLogoManifest,
  parseLogoManifest,
  loadLogoManifest,
  type LogoManifest,
  type LogoManifestIO,
} from '../dna/logo-manifest';
import { getBrandLogosFolder } from '../dna/brand-folder-paths';

const FULL: LogoManifest = {
  $schema: 'logo/v1',
  primary: 'lockup',
  variants: {
    symbol: { color: 'symbol.svg', light: 'symbol-white.svg', dark: 'symbol-black.svg' },
    wordmark: { color: 'wordmark.svg', light: 'wordmark-white.svg' },
    lockup: { color: 'lockup.svg', light: 'lockup-white.svg', stacked: 'lockup-stacked.svg' },
  },
};

describe('isLogoSlot', () => {
  it('matches every logo-family slot name', () => {
    for (const n of ['brand_logo', 'brand_symbol', 'brand_mark', 'brand_wordmark', 'brand_lockup', 'logo', 'icon']) {
      expect(isLogoSlot(n)).toBe(true);
    }
  });
  it('rejects non-logo media slots', () => {
    for (const n of ['media_bg', 'media_product', 'avatar', 'headline', 'media_1']) {
      expect(isLogoSlot(n)).toBe(false);
    }
  });
  it('needs the token to END, not merely to start', () => {
    // Each of these begins with a logo token and is not a logo slot. Matched,
    // they classify as identity and every filler then leaves them empty.
    for (const n of ['media_marketing', 'market_photo', 'iconic_shot', 'symbolism', 'combination_plate']) {
      expect(isLogoSlot(n)).toBe(false);
    }
  });
  it('still matches the real variants around a boundary', () => {
    for (const n of ['logos', 'logo_2', 'brand_logo-dark', 'logo_symbol', 'brand_lockup']) {
      expect(isLogoSlot(n)).toBe(true);
    }
  });
});

describe('isLogoFilename', () => {
  it('matches root logo binaries — including the `logo_*` variants the exact list missed', () => {
    for (const f of [
      'logo.svg', 'logo_symbol.svg', 'logo_wordmark.svg', 'mark.svg', 'wordmark.svg',
      'symbol.png', 'lockup.svg', 'brandmark.svg', 'logo-dark.svg', 'logo_light.webp',
    ]) {
      expect(isLogoFilename(f)).toBe(true);
    }
  });
  it('does NOT sweep up real photos whose name merely starts with a logo token', () => {
    for (const f of ['market-stall.jpg', 'iconic-view.png', 'markus-portrait.jpg', 'badger.jpg', 'symbology-notes.png']) {
      expect(isLogoFilename(f)).toBe(false);
    }
  });
  it('ignores non-image files', () => {
    expect(isLogoFilename('logo.json')).toBe(false);
    expect(isLogoFilename('manifest.json')).toBe(false);
  });
  it('strips any leading path before matching the basename', () => {
    expect(isLogoFilename('brands/blackcodex/assets/logo_symbol.svg')).toBe(true);
    expect(isLogoFilename('brands/blackcodex/assets/imagery/sunset.jpg')).toBe(false);
  });
});

describe('classifyLogoSlot', () => {
  it('brand_logo → primary / color / horizontal', () => {
    expect(classifyLogoSlot('brand_logo')).toEqual({ variant: 'primary', treatment: 'color', orientation: 'horizontal' });
  });
  it('brand_symbol and brand_mark → symbol', () => {
    expect(classifyLogoSlot('brand_symbol')?.variant).toBe('symbol');
    expect(classifyLogoSlot('brand_mark')?.variant).toBe('symbol');
  });
  it('brand_wordmark → wordmark', () => {
    expect(classifyLogoSlot('brand_wordmark')?.variant).toBe('wordmark');
  });
  it('parses variant + treatment + orientation together', () => {
    expect(classifyLogoSlot('brand_lockup_stacked_light')).toEqual({
      variant: 'lockup',
      treatment: 'light',
      orientation: 'stacked',
    });
  });
  it('white/reverse imply the light treatment', () => {
    expect(classifyLogoSlot('brand_symbol_white')?.treatment).toBe('light');
    expect(classifyLogoSlot('brand_logo_reversed')?.treatment).toBe('light');
  });
  it('returns null for non-logo slots', () => {
    expect(classifyLogoSlot('media_bg')).toBeNull();
  });
});

describe('resolveLogoFile', () => {
  it('resolves the exact variant + treatment', () => {
    expect(resolveLogoFile(FULL, { variant: 'symbol', treatment: 'light', orientation: 'horizontal' })).toBe('symbol-white.svg');
  });
  it('primary resolves to the manifest primary variant', () => {
    expect(resolveLogoFile(FULL, { variant: 'primary', treatment: 'color', orientation: 'horizontal' })).toBe('lockup.svg');
  });
  it('falls back treatment → color when requested treatment is absent', () => {
    expect(resolveLogoFile(FULL, { variant: 'wordmark', treatment: 'dark', orientation: 'horizontal' })).toBe('wordmark.svg');
  });
  it('uses the stacked orientation when asked, else the horizontal form', () => {
    expect(resolveLogoFile(FULL, { variant: 'lockup', treatment: 'color', orientation: 'stacked' })).toBe('lockup-stacked.svg');
    // stacked-dark not defined → keeps the stacked orientation (layout wins
    // over treatment) with the color form rather than dropping to horizontal.
    expect(resolveLogoFile(FULL, { variant: 'lockup', treatment: 'dark', orientation: 'stacked' })).toBe('lockup-stacked.svg');
  });
  it('falls back variant → primary when the requested variant is missing', () => {
    const noSymbol: LogoManifest = { $schema: 'logo/v1', primary: 'wordmark', variants: { wordmark: { color: 'w.svg' } } };
    expect(resolveLogoFile(noSymbol, { variant: 'symbol', treatment: 'color', orientation: 'horizontal' })).toBe('w.svg');
  });
});

describe('resolveLogoPath', () => {
  it('joins + normalises against the logos folder', () => {
    const folder = getBrandLogosFolder('acme'); // assets/logos
    expect(resolveLogoPath(FULL, { variant: 'symbol', treatment: 'color', orientation: 'horizontal' }, folder)).toBe(
      'assets/logos/symbol.svg',
    );
  });
  it('collapses ../ so root binaries normalise to the assets root', () => {
    const m: LogoManifest = { $schema: 'logo/v1', primary: 'lockup', variants: { lockup: { color: '../logo.svg' } } };
    expect(resolveLogoPath(m, { variant: 'primary', treatment: 'color', orientation: 'horizontal' }, getBrandLogosFolder('acme'))).toBe(
      'assets/logo.svg',
    );
  });
});

describe('synthesizeLogoManifest', () => {
  it('classifies filenames into variants + treatments', () => {
    const m = synthesizeLogoManifest(['symbol.svg', 'symbol-white.svg', 'wordmark.svg', 'lockup.svg', 'lockup-stacked.svg'])!;
    expect(m.variants.symbol).toEqual({ color: 'symbol.svg', light: 'symbol-white.svg' });
    expect(m.variants.wordmark).toEqual({ color: 'wordmark.svg' });
    expect(m.variants.lockup).toEqual({ color: 'lockup.svg', stacked: 'lockup-stacked.svg' });
    expect(m.primary).toBe('lockup'); // richest present
  });
  it('bare logo.svg is treated as the primary lockup', () => {
    const m = synthesizeLogoManifest(['../logo.svg'])!;
    expect(m.primary).toBe('lockup');
    expect(resolveLogoFile(m, { variant: 'primary', treatment: 'color', orientation: 'horizontal' })).toBe('../logo.svg');
  });
  it('prefers SVG over raster for the same slot', () => {
    const m = synthesizeLogoManifest(['symbol.png', 'symbol.svg'])!;
    expect(m.variants.symbol?.color).toBe('symbol.svg');
  });
  it('picks symbol as primary when no lockup exists', () => {
    expect(synthesizeLogoManifest(['symbol.svg'])!.primary).toBe('symbol');
    expect(synthesizeLogoManifest(['wordmark.svg'])!.primary).toBe('wordmark');
  });
  it('returns null when nothing usable', () => {
    expect(synthesizeLogoManifest([])).toBeNull();
    expect(synthesizeLogoManifest(['readme.txt', 'notes.md'])).toBeNull();
  });
});

describe('parseLogoManifest', () => {
  it('accepts a valid logo/v1 object', () => {
    expect(parseLogoManifest(FULL)).toBe(FULL);
  });
  it('rejects wrong schema / shape', () => {
    expect(parseLogoManifest(null)).toBeNull();
    expect(parseLogoManifest({ $schema: 'logo/v2', primary: 'symbol', variants: {} })).toBeNull();
    expect(parseLogoManifest({ $schema: 'logo/v1', primary: 'nope', variants: {} })).toBeNull();
    expect(parseLogoManifest({ $schema: 'logo/v1', primary: 'symbol' })).toBeNull();
  });
});

describe('loadLogoManifest', () => {
  function io(files: Record<string, string>): LogoManifestIO {
    return {
      readFile: async (p) => {
        if (p in files) return files[p];
        throw new Error(`missing ${p}`);
      },
      listDir: async (dir) => {
        const root = dir.replace(/\/$/, '') + '/';
        const names = new Set<string>();
        for (const k of Object.keys(files)) {
          if (k.startsWith(root)) {
            const rest = k.slice(root.length);
            if (!rest.includes('/')) names.add(rest);
          }
        }
        return [...names];
      },
    };
  }

  it('prefers an authored manifest.json', async () => {
    const eff = await loadLogoManifest('acme', io({
      'assets/logos/manifest.json': JSON.stringify(FULL),
    }));
    expect(eff?.source).toBe('authored');
    expect(eff?.manifest.primary).toBe('lockup');
  });

  it('synthesizes from the logos/ folder when no manifest', async () => {
    const eff = await loadLogoManifest('acme', io({
      'assets/logos/symbol.svg': '<svg/>',
      'assets/logos/wordmark.svg': '<svg/>',
    }));
    expect(eff?.source).toBe('synthesized');
    expect(eff?.manifest.variants.symbol?.color).toBe('symbol.svg');
    expect(eff?.manifest.variants.wordmark?.color).toBe('wordmark.svg');
  });

  it('synthesizes from root binaries when logos/ is empty', async () => {
    const eff = await loadLogoManifest('acme', io({
      'assets/logo.svg': '<svg/>',
      'assets/wordmark.svg': '<svg/>',
    }));
    expect(eff?.source).toBe('synthesized');
    const primary = resolveLogoPath(
      eff!.manifest,
      { variant: 'primary', treatment: 'color', orientation: 'horizontal' },
      eff!.logosFolder,
    );
    expect(primary).toBe('assets/logo.svg');
  });

  it('returns null when the brand has no logo anywhere', async () => {
    expect(await loadLogoManifest('acme', io({}))).toBeNull();
  });
});
