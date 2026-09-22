/**
 * Font fetch + validate primitives — the small, dependency-free core that lets
 * an agent DOWNLOAD a real typeface (a Google family or a direct file URL) and
 * register it in a workspace.
 *
 * A deliberately self-contained copy of the primitives in the heavy crawler at
 * `packages/brand-extractor/src/download/download-fonts.ts` (the sibling): that
 * package is a full site crawler and is NOT a dependency of `@syvon/agent`, so
 * the two `import_font` / `import_brand_from_url` tools would have no way to
 * reach it. These are pure `fetch` + magic-byte checks — no crawler, no browser
 * — so they live here in `@syvon/organism`, which every tool already imports.
 */

const FORMAT_EXTENSION: Record<string, string> = {
  woff2: 'woff2', woff: 'woff', ttf: 'ttf', otf: 'otf', truetype: 'ttf', opentype: 'otf',
};

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** True when the buffer starts with valid font magic bytes (not an HTML error page). */
export function isValidFontBuffer(buf: Uint8Array): boolean {
  if (buf.length < 4) return false;
  // wOF2 (woff2)
  if (buf[0] === 0x77 && buf[1] === 0x4f && buf[2] === 0x46 && buf[3] === 0x32) return true;
  // wOFF (woff)
  if (buf[0] === 0x77 && buf[1] === 0x4f && buf[2] === 0x46 && buf[3] === 0x46) return true;
  // TrueType (00 01 00 00)
  if (buf[0] === 0x00 && buf[1] === 0x01 && buf[2] === 0x00 && buf[3] === 0x00) return true;
  // OpenType (OTTO)
  if (buf[0] === 0x4f && buf[1] === 0x54 && buf[2] === 0x54 && buf[3] === 0x4f) return true;
  // TrueType collection (ttcf)
  if (buf[0] === 0x74 && buf[1] === 0x74 && buf[2] === 0x63 && buf[3] === 0x66) return true;
  // "true" (Apple TrueType)
  if (buf[0] === 0x74 && buf[1] === 0x72 && buf[2] === 0x75 && buf[3] === 0x65) return true;
  return false;
}

/** Canonical extension from the buffer's magic bytes, or null when unrecognised. */
export function fontExtFromBuffer(buf: Uint8Array): 'woff2' | 'woff' | 'ttf' | 'otf' | null {
  if (buf.length < 4) return null;
  if (buf[0] === 0x77 && buf[1] === 0x4f && buf[2] === 0x46 && buf[3] === 0x32) return 'woff2';
  if (buf[0] === 0x77 && buf[1] === 0x4f && buf[2] === 0x46 && buf[3] === 0x46) return 'woff';
  if (buf[0] === 0x4f && buf[1] === 0x54 && buf[2] === 0x54 && buf[3] === 0x4f) return 'otf';
  // 00 01 00 00, ttcf and "true" are all TrueType-flavoured.
  if (buf[0] === 0x00 && buf[1] === 0x01 && buf[2] === 0x00 && buf[3] === 0x00) return 'ttf';
  if (buf[0] === 0x74 && buf[1] === 0x74 && buf[2] === 0x63 && buf[3] === 0x66) return 'ttf';
  if (buf[0] === 0x74 && buf[1] === 0x72 && buf[2] === 0x75 && buf[3] === 0x65) return 'ttf';
  return null;
}

/** Filesystem-safe stem for a family name (`"PT Serif"` → `"PT-Serif"`). */
export function sanitizeFontStem(family: string): string {
  return family.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '');
}

/** `{family}-{weight}-{style}.{ext}` — the fonts.json/render filename convention. */
export function buildFontFileName(family: string, weight: number, style: string, ext: string): string {
  const stem = sanitizeFontStem(family);
  const cleanExt = FORMAT_EXTENSION[ext] ?? ext.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return `${stem}-${weight}-${style}.${cleanExt}`;
}

/**
 * Build a Google Fonts css2 URL for a family. With only normal styles it uses
 * the `wght@400;700` axis form; when italics are asked for it switches to the
 * `ital,wght@0,400;1,400` matrix Google requires (every weight paired to both
 * `ital` values). Weights are sorted + de-duped so the URL is stable.
 */
export function googleFontsCss2Url(
  family: string,
  weights: number[],
  styles: ('normal' | 'italic')[],
): string {
  const fam = family.trim().replace(/\s+/g, '+');
  const w = [...new Set(weights.length ? weights : [400])].sort((a, b) => a - b);
  const wantItalic = styles.includes('italic');
  const wantNormal = styles.includes('normal') || !wantItalic;

  let axis: string;
  if (wantItalic) {
    const pairs: string[] = [];
    for (const weight of w) {
      if (wantNormal) pairs.push(`0,${weight}`);
      pairs.push(`1,${weight}`);
    }
    axis = `ital,wght@${pairs.join(';')}`;
  } else {
    axis = `wght@${w.join(';')}`;
  }
  return `https://fonts.googleapis.com/css2?family=${fam}:${axis}&display=swap`;
}

export interface DiscoveredFontFace {
  family: string;
  weight: number;
  style: string;
  url: string;
  format: string;
}

/**
 * Pull `@font-face` faces out of a stylesheet — family, weight, style and the
 * first `url()`. Mirrors the sibling crawler's `resolveGoogleFontsCss` parse.
 */
export function parseFontFacesFromCss(css: string): DiscoveredFontFace[] {
  const results: DiscoveredFontFace[] = [];
  const faceRe = /@font-face\s*\{([^}]+)\}/gi;
  let match: RegExpExecArray | null;
  while ((match = faceRe.exec(css)) !== null) {
    const block = match[1];
    const familyMatch = /font-family:\s*['"]?([^'";}\n]+)/i.exec(block);
    const weightMatch = /font-weight:\s*(\d+)/i.exec(block);
    const styleMatch = /font-style:\s*(normal|italic)/i.exec(block);
    const urlMatch = /url\(([^)]+)\)/i.exec(block);
    if (familyMatch && urlMatch) {
      results.push({
        family: familyMatch[1].trim(),
        weight: weightMatch ? parseInt(weightMatch[1], 10) : 400,
        style: styleMatch?.[1] ?? 'normal',
        url: urlMatch[1].replace(/['"]/g, '').trim(),
        format: 'woff2',
      });
    }
  }
  return results;
}

/**
 * Resolve a Google family to its downloadable `@font-face` faces. The desktop
 * Chrome UA matters: Google serves woff2 to it and clunkier formats to unknown
 * agents. Returns [] on any failure — the caller decides how to report it.
 */
export async function fetchGoogleFontFaces(
  family: string,
  weights: number[],
  styles: ('normal' | 'italic')[],
  timeoutMs = 15000,
): Promise<DiscoveredFontFace[]> {
  try {
    const resp = await fetch(googleFontsCss2Url(family, weights, styles), {
      headers: { 'User-Agent': BROWSER_UA },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resp.ok) return [];
    const css = await resp.text();
    // Google returns the requested family; stamp it so a face's family is the
    // one we asked for even if the CSS quotes it differently.
    return parseFontFacesFromCss(css).map((f) => ({ ...f, family }));
  } catch {
    return [];
  }
}

/**
 * Download one font file. Rejects HTML/text error pages by content-type AND by
 * magic bytes, so a 200 that is really a "not found" page never lands as a
 * corrupt `.woff2`. Returns null (never throws) on any failure.
 */
export async function downloadFontBinary(
  url: string,
  timeoutMs = 15000,
): Promise<{ buffer: Uint8Array; ext: string } | null> {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': BROWSER_UA },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resp.ok) return null;
    const ct = resp.headers.get('content-type') ?? '';
    if (ct.includes('text/html') || ct.includes('text/plain')) return null;
    const buffer = new Uint8Array(await resp.arrayBuffer());
    if (!isValidFontBuffer(buffer)) return null;
    const urlExt = url.split('?')[0].split('.').pop()?.toLowerCase();
    const ext = fontExtFromBuffer(buffer) ?? (urlExt && FORMAT_EXTENSION[urlExt] ? FORMAT_EXTENSION[urlExt] : 'woff2');
    return { buffer, ext };
  } catch {
    return null;
  }
}
