import { describe, it, expect } from 'vitest';
import {
  ingestCrawledAssets, mergeFontManifest, pickLogoImage, extOfFileName,
  crawledImageVerdict,
  type WorkspaceAssetIO, type CrawledBrandAssets,
} from './crawl-ingest';
import { isPlaceholderLogoSvg } from './dna/logo-manifest';

const b64 = (s: string) => Buffer.from(s).toString('base64');
const WOFF2 = b64('\x77\x4f\x46\x32padding');

function fakeIO(over: Partial<WorkspaceAssetIO> = {}) {
  const text: Record<string, string> = {};
  const binary: Record<string, Uint8Array> = {};
  const io: WorkspaceAssetIO = {
    async writeText(p, c) { text[p] = c; },
    async writeBinary(p, b) { binary[p] = b; },
    async readText(p) { return text[p] ?? null; },
    async listFiles() { return Object.keys(binary).concat(Object.keys(text)).map((p) => p.split('/').pop()!); },
    ...over,
  };
  return { io, text, binary };
}

function crawl(over: Partial<CrawledBrandAssets> = {}): CrawledBrandAssets {
  return {
    fonts: [
      { family: 'Inter', weight: 400, style: 'normal', format: 'woff2', fileName: 'Inter-400-normal.woff2', bytes: WOFF2 },
      { family: 'Inter', weight: 700, style: 'normal', format: 'woff2', fileName: 'Inter-700-normal.woff2', bytes: WOFF2 },
    ],
    images: [
      { url: 'https://acme.com/hero.png', source: 'img', fileName: 'hero.png', bytes: b64('png') },
      { url: 'https://acme.com/logo.svg', source: 'inline-svg', fileName: 'logo.svg', bytes: b64('<svg xmlns="http://www.w3.org/2000/svg"/>') },
    ],
    ...over,
  };
}

describe('ingestCrawledAssets', () => {
  it('writes the real font files and registers every one in fonts.json', async () => {
    const { io, text, binary } = fakeIO();

    const result = await ingestCrawledAssets(io, crawl());

    expect(Object.keys(binary)).toContain('assets/fonts/Inter-400-normal.woff2');
    expect(Object.keys(binary)).toContain('assets/fonts/Inter-700-normal.woff2');
    expect(JSON.parse(text['assets/fonts/fonts.json'])).toEqual([
      { family: 'Inter', file: 'Inter-400-normal.woff2', weight: 400, style: 'normal' },
      { family: 'Inter', file: 'Inter-700-normal.woff2', weight: 700, style: 'normal' },
    ]);
    // The family is reported once, not once per weight.
    expect(result.importedFonts).toEqual(['Inter']);
  });

  it('picks the logo over the hero image and writes an SVG as text', async () => {
    const { io, text } = fakeIO();

    const result = await ingestCrawledAssets(io, crawl());

    expect(result.logoStatus).toBe('imported');
    expect(text['assets/logos/logo.svg']).toContain('<svg');
    expect(text['assets/logos/manifest.json']).toContain('logo/v1');
  });

  it('merges into an existing fonts.json rather than replacing it', async () => {
    const { io, text } = fakeIO();
    text['assets/fonts/fonts.json'] = JSON.stringify([
      { family: 'Georgia', file: 'Georgia-400-normal.woff2', weight: 400, style: 'normal' },
    ]);

    await ingestCrawledAssets(io, crawl());

    const rows = JSON.parse(text['assets/fonts/fonts.json']);
    expect(rows).toHaveLength(3);
    expect(rows.map((r: { family: string }) => r.family)).toContain('Georgia');
  });

  it('a font that will not write does not cost you the logo', async () => {
    const { io, text } = fakeIO({
      async writeBinary(p) {
        if (p.includes('fonts')) throw new Error('disk full');
      },
    });

    const result = await ingestCrawledAssets(io, crawl());

    expect(result.importedFonts).toEqual([]);
    expect(result.notes.join(' ')).toContain('disk full');
    // The logo is SVG, written as text — it must still be there.
    expect(result.logoStatus).toBe('imported');
    expect(text['assets/logos/logo.svg']).toContain('<svg');
  });

  it('reports rather than throws when the host cannot write binaries', async () => {
    const { io, text } = fakeIO({ writeBinary: undefined });

    const result = await ingestCrawledAssets(io, crawl());

    expect(result.importedFonts).toEqual([]);
    expect(result.notes.join(' ')).toContain('binary');
    // An SVG logo needs no binary write, so it still lands.
    expect(text['assets/logos/logo.svg']).toContain('<svg');
  });

  it('rebuilds the logo manifest from the folder, not just from what it wrote', async () => {
    const seen: string[] = [];
    const { io, text } = fakeIO({
      async listFiles() {
        seen.push('called');
        // A wordmark put there by another route must survive this ingest.
        return ['logo.svg', 'logo-wordmark.svg', 'manifest.json', '.keep'];
      },
    });

    await ingestCrawledAssets(io, crawl());

    expect(seen).toHaveLength(1);
    const manifest = JSON.parse(text['assets/logos/manifest.json']);
    expect(JSON.stringify(manifest)).toContain('logo-wordmark.svg');
  });

  it('honours includeFonts / includeLogo / includeMedia', async () => {
    const { io, text, binary } = fakeIO();

    const result = await ingestCrawledAssets(io, crawl(), {
      includeFonts: false,
      includeLogo: false,
      includeMedia: false,
    });

    expect(Object.keys(binary)).toHaveLength(0);
    expect(text['assets/logos/logo.svg']).toBeUndefined();
    expect(result).toEqual({
      importedFonts: [], logoStatus: 'none detected', notes: [], importedMedia: [],
    });
  });

  it('files the site’s OTHER pictures instead of dropping them', async () => {
    // The whole of this block is the gap. The crawl fetched these, base64’d
    // them and shipped them over the wire; the ingest wrote the logo and threw
    // the rest away, so a workspace set up from a URL held a palette, a
    // typeface and a mark — and not one picture of the company.
    const { io, binary, text } = fakeIO();

    const result = await ingestCrawledAssets(
      io,
      crawl({
        images: [
          { url: 'https://x.com/logo.svg', source: 'inline-svg', fileName: 'logo.svg', bytes: b64('<svg/>') },
          { url: 'https://x.com/og.jpg', source: 'og-image', fileName: 'og-image.jpg', bytes: b64('o'.repeat(30_000)), alt: 'Our team' },
          { url: 'https://x.com/hero.jpg', source: 'bg-image', fileName: 'hero.jpg', bytes: b64('h'.repeat(20_000)) },
          { url: 'https://x.com/texture.svg', source: 'img', fileName: 'texture.svg', bytes: b64('<svg/>') },
        ],
      }),
    );

    // The crawler's own tag decides the folder — it knows what it found.
    expect(binary['assets/imagery/og-image.jpg']).toBeDefined();
    expect(binary['assets/imagery/bg/hero.jpg']).toBeDefined();
    // SVG travels as text, not bytes.
    expect(text['assets/imagery/texture.svg']).toBe('<svg/>');
    // ...and the mark still goes where a mark goes, exactly once.
    expect(text['assets/logos/logo.svg']).toBe('<svg/>');

    expect(result.importedMedia).toEqual([
      { path: 'assets/imagery/og-image.jpg', kind: 'image', folder: 'imagery', sourceUrl: 'https://x.com/og.jpg', alt: 'Our team' },
      { path: 'assets/imagery/bg/hero.jpg', kind: 'image', folder: 'imagery/bg', sourceUrl: 'https://x.com/hero.jpg' },
      { path: 'assets/imagery/texture.svg', kind: 'image', folder: 'imagery', sourceUrl: 'https://x.com/texture.svg' },
    ]);
  });

  it('files video, which never even crossed the wire before', async () => {
    const { io, binary } = fakeIO();
    const out = await ingestCrawledAssets(io, crawl({
      images: [],
      videos: [{ url: 'https://x.com/reel.mp4', source: 'video', fileName: 'reel.mp4', bytes: b64('mp4') }],
    }));

    expect(binary['assets/video/reel.mp4']).toBeDefined();
    expect(out.importedMedia).toEqual([
      { path: 'assets/video/reel.mp4', kind: 'video', folder: 'video', sourceUrl: 'https://x.com/reel.mp4' },
    ]);
  });

  it('never lets two same-named files overwrite each other', async () => {
    // A real crawl returns two `icon.png` (favicon + webclip) and two
    // `logo.svg`. Written in order, the last one silently wins and the
    // workspace holds fewer assets than the report claims.
    const { io, binary } = fakeIO();

    const out = await ingestCrawledAssets(io, crawl({
      images: [
        { url: 'https://x.com/a.png', source: 'img', fileName: 'shot.png', bytes: b64('a'.repeat(20_000)) },
        { url: 'https://x.com/b.png', source: 'img', fileName: 'shot.png', bytes: b64('b'.repeat(20_000)) },
      ],
    }));

    // One of them is taken as the logo (no logo-named file present), so one
    // icon remains — the point is that nothing was silently overwritten.
    const paths = out.importedMedia.map((m) => m.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of paths) expect(binary[p]).toBeDefined();
  });

  it('dedupes by content hash so one asset is not filed twice', async () => {
    // The same picture arrives as an inline SVG and as the `<img>` pointing at
    // it — the crawler reports both, and both carry the same hash.
    const { io } = fakeIO();

    const out = await ingestCrawledAssets(io, crawl({
      images: [
        { url: 'https://x.com/logo.svg', source: 'inline-svg', fileName: 'logo.svg', bytes: b64('<svg/>'), contentHash: 'h1' },
        { url: 'https://x.com/hero.jpg', source: 'og-image', fileName: 'hero.jpg', bytes: b64('h'.repeat(20_000)), contentHash: 'h2' },
        { url: 'https://x.com/hero-copy.jpg', source: 'img', fileName: 'hero-copy.jpg', bytes: b64('h'.repeat(20_000)), contentHash: 'h2' },
      ],
    }));

    expect(out.importedMedia.map((m) => m.path)).toEqual(['assets/imagery/hero.jpg']);
  });

  it('says "none detected" rather than inventing a logo when there are no images', async () => {
    const { io } = fakeIO();
    const result = await ingestCrawledAssets(io, crawl({ images: [] }));
    expect(result.logoStatus).toBe('none detected');
  });
});

describe('crawledImageVerdict — what is furniture and what is the brand', () => {
  // The fixture is a REAL crawl of infty.global. Nine images came back; two of
  // them are the company, and the rest is the page's plumbing.
  const big = b64('x'.repeat(30_000));
  const img = (over: Partial<{ url: string; fileName: string; source: string; bytes: string }> = {}) => ({
    url: 'https://infty.global/i.jpg', fileName: 'i.jpg', source: 'img', bytes: big, ...over,
  });

  it('keeps the two that are actually the company', () => {
    expect(crawledImageVerdict(img({
      url: 'https://cdn.prod.website-files.com/657c4d0633707d1b68c4916a/680f865e.jpg',
      fileName: 'og-image.jpg', source: 'og-image',
    })).keep).toBe(true);
    expect(crawledImageVerdict(img({
      fileName: 'home-reel-placeholder.jpg', source: 'bg-image',
    })).keep).toBe(true);
  });

  it('rejects the site BUILDER’s shared furniture', () => {
    const v = crawledImageVerdict(img({
      url: 'https://d3e54v103j8qbb.cloudfront.net/img/background-image.svg',
      fileName: 'background-image.svg', source: 'bg-image',
    }));
    expect(v.keep).toBe(false);
  });

  it('does NOT confuse the builder’s shared bucket with the customer’s own', () => {
    // This is the trap. Webflow serves a customer's real uploads from
    // `cdn.prod.website-files.com/{siteId}/…` and its global furniture from a
    // cloudfront bucket. Banning the domain family would have thrown away the
    // best image on the site in order to remove the worst.
    expect(crawledImageVerdict(img({
      url: 'https://cdn.prod.website-files.com/657c4d06/hero.jpg', fileName: 'hero.jpg',
    })).keep).toBe(true);
  });

  it('rejects favicons and app icons — the mark again, smaller', () => {
    expect(crawledImageVerdict(img({ fileName: 'icon.png', source: 'icon' })).keep).toBe(false);
    // Even the 3KB webclip, which is large enough to pass a size test.
    expect(crawledImageVerdict(img({ fileName: 'webclip.png', source: 'icon', bytes: b64('x'.repeat(3000)) })).keep).toBe(false);
  });

  it('rejects other companies’ marks', () => {
    expect(crawledImageVerdict(img({ fileName: 'social-insta.svg' })).keep).toBe(false);
    expect(crawledImageVerdict(img({ fileName: 'linkedin.svg' })).keep).toBe(false);
    // ...without rejecting a word that merely contains one.
    expect(crawledImageVerdict(img({ fileName: 'xylophone.jpg' })).keep).toBe(true);
    expect(crawledImageVerdict(img({ fileName: 'prefabrication.jpg' })).keep).toBe(true);
  });

  it('rejects the logo arriving a second time, which bytes cannot catch', () => {
    // The inline SVG and the `<img>` pointing at the same file: a browser
    // re-serialises the inline one, so the two differ byte-for-byte and the
    // content-hash pass sees two distinct assets.
    const again = img({ fileName: 'logo.svg', bytes: b64('<svg/>') });
    expect(crawledImageVerdict(again, { logoAlreadyFiled: true }).keep).toBe(false);
    // With no logo filed it is the best mark available — keep it.
    expect(crawledImageVerdict(again, { logoAlreadyFiled: false }).keep).toBe(true);
  });

  it('rejects rasters too small to be artwork, but never SVG on size', () => {
    expect(crawledImageVerdict(img({ fileName: 'spacer.png', bytes: b64('xx') })).keep).toBe(false);
    // A clean vector mark is legitimately tiny.
    expect(crawledImageVerdict(img({ fileName: 'mark-alt.svg', bytes: b64('<svg/>') })).keep).toBe(true);
  });

  it('says WHY, so a filter nobody can see is not mistaken for a bad crawl', () => {
    const v = crawledImageVerdict(img({ fileName: 'icon.png', source: 'icon' }));
    expect(v.keep).toBe(false);
    if (!v.keep) expect(v.reason).toContain('icon.png');
  });
});

describe('ingestCrawledAssets — junk never reaches the kit', () => {
  it('files the company and skips the plumbing, and reports what it skipped', async () => {
    const { io, binary, text } = fakeIO();

    const result = await ingestCrawledAssets(io, crawl({
      images: [
        { url: 'https://infty.global/XLogo.svg', source: 'inline-svg', fileName: 'logo.svg', bytes: b64('<svg/>') },
        { url: 'https://cdn.prod.website-files.com/657c/og.jpg', source: 'og-image', fileName: 'og-image.jpg', bytes: b64('x'.repeat(30000)) },
        { url: 'https://infty.global/favicon.png', source: 'icon', fileName: 'icon.png', bytes: b64('x'.repeat(2000)) },
        { url: 'https://infty.global/Social-Insta.svg', source: 'img', fileName: 'social-insta.svg', bytes: b64('<svg/>') },
        { url: 'https://d3e54v103j8qbb.cloudfront.net/img/background-image.svg', source: 'bg-image', fileName: 'background-image.svg', bytes: b64('x'.repeat(11000)) },
      ],
    }));

    expect(result.importedMedia.map((m) => m.path)).toEqual(['assets/imagery/og-image.jpg']);
    expect(text['assets/logos/logo.svg']).toBe('<svg/>');
    expect(binary['assets/imagery/bg/background-image.svg']).toBeUndefined();
    expect(binary['assets/graphics/icon.png']).toBeUndefined();
    // Out loud, not silently.
    expect(result.notes.join(' ')).toContain('skipped 3 non-brand image(s)');
  });
});

describe('mergeFontManifest', () => {
  it('dedupes by family|weight|style, last write wins', async () => {
    const { io, text } = fakeIO();
    await mergeFontManifest(io, [{ family: 'Inter', file: 'old.woff2', weight: 400, style: 'normal' }]);
    await mergeFontManifest(io, [{ family: 'Inter', file: 'new.woff2', weight: 400, style: 'normal' }]);

    const rows = JSON.parse(text['assets/fonts/fonts.json']);
    expect(rows).toEqual([{ family: 'Inter', file: 'new.woff2', weight: 400, style: 'normal' }]);
  });

  it('starts fresh when the existing manifest is unreadable, instead of losing the new rows', async () => {
    const { io, text } = fakeIO();
    text['assets/fonts/fonts.json'] = 'not json {';

    await mergeFontManifest(io, [{ family: 'Inter', file: 'a.woff2', weight: 400, style: 'normal' }]);

    expect(JSON.parse(text['assets/fonts/fonts.json'])).toHaveLength(1);
  });
});

describe('pickLogoImage', () => {
  it('prefers a logo-named file, then a logo source, then any SVG', () => {
    expect(pickLogoImage([
      { fileName: 'hero.png', source: 'img' },
      { fileName: 'logo.svg', source: 'img' },
    ])?.fileName).toBe('logo.svg');

    expect(pickLogoImage([
      { fileName: 'a.png', source: 'img' },
      { fileName: 'b.png', source: 'header-logo' },
    ])?.fileName).toBe('b.png');

    expect(pickLogoImage([
      { fileName: 'a.png', source: 'img' },
      { fileName: 'mark.svg', source: 'img' },
    ])?.fileName).toBe('mark.svg');

    expect(pickLogoImage([])).toBeNull();
  });
});

describe('extOfFileName', () => {
  it('normalises jpeg to jpg and ignores query strings', () => {
    expect(extOfFileName('logo.JPEG')).toBe('jpg');
    expect(extOfFileName('logo.svg?v=2')).toBe('svg');
    expect(extOfFileName('logo')).toBe('logo');
  });
});

/**
 * The stand-in mark, for a crawl that came back without one.
 *
 * Opt-in on purpose. `import_brand_from_url` reaches this same ingest and
 * wants the opposite answer — a grey dot in `assets/logos/` is
 * indistinguishable from a real mark to every later reader, and reporting what
 * a site actually has is that tool's whole job. Onboarding would rather fill
 * the slot than ship a workspace that looks broken.
 */
describe('ingestCrawledAssets — the placeholder mark', () => {
  const noLogo = () => crawl({
    images: [{ url: 'https://acme.com/hero.png', source: 'bg-image', fileName: 'hero.png', bytes: b64('x'.repeat(4000)) }],
  });

  it('writes nothing extra by default, even when no logo was found', async () => {
    const { io, text } = fakeIO();

    const result = await ingestCrawledAssets(io, noLogo(), { includeLogo: true });

    expect(result.logoStatus).not.toBe('placeholder');
    expect(text['assets/logos/logo.svg']).toBeUndefined();
  });

  it('writes a filled circle when the caller asks for one', async () => {
    const { io, text } = fakeIO();

    const result = await ingestCrawledAssets(io, noLogo(), { placeholderLogo: true });

    expect(result.logoStatus).toBe('placeholder');
    expect(text['assets/logos/logo.svg']).toContain('<circle');
    expect(isPlaceholderLogoSvg(text['assets/logos/logo.svg'])).toBe(true);
    // Said out loud, with the reason it stood in for.
    expect(result.notes.some((n) => n.includes('placeholder'))).toBe(true);
  });

  it('registers the placeholder in the logo manifest, so surfaces resolve it', async () => {
    const { io, text } = fakeIO();

    await ingestCrawledAssets(io, noLogo(), { placeholderLogo: true });

    expect(text['assets/logos/manifest.json']).toBeDefined();
  });

  it('never stands in for a logo that WAS found', async () => {
    const { io, text } = fakeIO();

    const result = await ingestCrawledAssets(io, crawl(), { placeholderLogo: true });

    expect(result.logoStatus).toBe('imported');
    expect(isPlaceholderLogoSvg(text['assets/logos/logo.svg'])).toBe(false);
  });
});
