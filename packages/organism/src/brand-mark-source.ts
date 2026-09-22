/**
 * FINDING a workspace's mark — one copy, for every app that draws one.
 *
 * The agent's workspace switcher, the portal's hub cards and Dispatch's roster
 * all answer the same question: which file in this brand is its symbol? Two of
 * them had already written that answer out longhand, in the same order, with
 * the same three-name candidate list — and the third drew letters because
 * nobody wanted to write it a third time.
 *
 * The split here is deliberate. This module FINDS the mark and returns its raw
 * source; it does not build a `BrandLogo`, because that shaping (aspect ratio,
 * mask vs draw) belongs to `@syvon/ui/brand-logo` and importing UI into the
 * organism would drag a React package into the packaged MCP bundle. Callers do
 * one line:
 *
 *     const src = await resolveBrandMarkSource(root, slug, io);
 *     const logo = src.rasterUri ? rasterToBrandLogo(src.rasterUri) : svgToBrandLogo(src.svg);
 *
 * Reading is injected for the same reason: every app has its own R2 client, and
 * this file must not care which.
 *
 * Note what it does NOT read. An app can find a logo for the active brand by
 * taking the first `BrandItem` row with `kind: 'logo'` — but that table indexes
 * whatever was uploaded, in no particular order, so a workspace can hold a
 * perfectly good mark and still come back empty. Reading the files the brand
 * actually ships is what makes every surface agree on what a workspace looks
 * like.
 */

import { loadLogoManifest, resolveLogoPath, type LogoIntent } from './dna/logo-manifest';
import { getBrandFilePath } from './dna/brand-folder-paths';

/**
 * Flat symbol assets at the brand's assets root, in preference order.
 *
 * SVG first — it masks to `currentColor` and stays crisp — but a raster mark is
 * a legitimate brand asset, and skipping rasters entirely is what once made a
 * workspace with a PNG logo show a grey initial and look broken.
 */
export const BRAND_LOGO_CANDIDATES = [
  'logo_symbol.svg',
  'Logo_Symbol.svg',
  'logo.svg',
  'logo_symbol.png',
  'logo.png',
  'logo.webp',
] as const;

/** A row, a ball, a card: all want the compact SYMBOL, not a wide wordmark.
 *  The manifest's variant chain falls back to the lockup when a brand ships
 *  no symbol. */
export const SYMBOL_LOGO_INTENT: LogoIntent = {
  variant: 'symbol',
  treatment: 'color',
  orientation: 'horizontal',
};

const RASTER_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif']);

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
};

function extOf(filename: string): string {
  return filename.toLowerCase().split('.').pop() ?? '';
}

export function isRasterMarkFile(filename: string): boolean {
  return RASTER_EXT.has(extOf(filename));
}

export function mimeOfMarkFile(filename: string): string {
  return MIME_BY_EXT[extOf(filename)] ?? 'application/octet-stream';
}

/** The app's R2 (or filesystem) reader. Keys are bucket-absolute. */
export interface BrandMarkIO {
  /** UTF-8, or null on a miss. Must NOT throw for a missing object. */
  readString: (key: string) => Promise<string | null>;
  /** A `data:` URI for a binary object, or null on a miss. */
  readDataUri: (key: string, mime: string) => Promise<string | null>;
  /** File names directly under a prefix. Empty on a miss. */
  listNames: (prefix: string) => Promise<string[]>;
}

export interface BrandMarkSource {
  /** Raw SVG text, when the mark is a vector. */
  svg: string | null;
  /** A `data:` URI, when the mark is a raster. */
  rasterUri: string | null;
  /** `color.primary` from the compiled design tokens. */
  color: string | null;
}

const EMPTY: BrandMarkSource = { svg: null, rasterUri: null, color: null };

/**
 * @param root  the workspace's bucket-absolute root, e.g. `workspaces/{id}`.
 *              The brand IS the workspace root — `config/` and `assets/` sit
 *              directly under it since R2 went flat.
 * @param slug  the brand slug, for the logo manifest's variant chain.
 */
export async function resolveBrandMarkSource(
  root: string,
  slug: string | null,
  io: BrandMarkIO,
): Promise<BrandMarkSource> {
  if (!slug) return EMPTY;
  const [mark, color] = await Promise.all([findMark(root, slug, io), readColor(root, io)]);
  return { svg: mark?.svg ?? null, rasterUri: mark?.rasterUri ?? null, color };
}

type Mark = { svg: string | null; rasterUri: string | null };

async function readMarkAt(key: string, io: BrandMarkIO): Promise<Mark | null> {
  if (isRasterMarkFile(key)) {
    const uri = await io.readDataUri(key, mimeOfMarkFile(key));
    return uri ? { svg: null, rasterUri: uri } : null;
  }
  const svg = await io.readString(key);
  return svg ? { svg, rasterUri: null } : null;
}

async function findMark(root: string, slug: string, io: BrandMarkIO): Promise<Mark | null> {
  // 1. A flat symbol asset, if the brand ships one. Probed CONCURRENTLY and
  //    then picked in preference order — the list is several names for the same
  //    file, so walking it serially spends a round trip per name to learn what
  //    one round trip answers. Preference is the array order, not who replies
  //    first.
  const probes = await Promise.all(
    BRAND_LOGO_CANDIDATES.map((name) => readMarkAt(`${root}/assets/${name}`, io).catch(() => null)),
  );
  for (const mark of probes) {
    if (mark) return mark;
  }

  // 2. Otherwise resolve through the brand's logo/v1 manifest — a mark authored
  //    under `logos/` rather than as a flat file. `loadLogoManifest` signals
  //    "no manifest" by THROWING from readFile, so the miss has to be re-thrown
  //    rather than returned as null.
  try {
    const eff = await loadLogoManifest(slug, {
      readFile: async (key: string) => {
        const text = await io.readString(`${root}/${key}`);
        if (text == null) throw new Error('miss');
        return text;
      },
      listDir: async (key: string) => {
        try {
          return await io.listNames(`${root}/${key}`);
        } catch {
          return [];
        }
      },
    });
    if (!eff) return null;
    const key = resolveLogoPath(eff.manifest, SYMBOL_LOGO_INTENT, eff.logosFolder);
    if (!key) return null;
    // The manifest resolves whatever the brand ships, PNG included — reading a
    // raster file as a string is what silently produced "no mark" before.
    return readMarkAt(`${root}/${key}`, io);
  } catch {
    return null;
  }
}

/** `color.primary` from the compiled design tokens — what a markless node's
 *  chip is tinted with, and what tints the ball's ink. */
async function readColor(root: string, io: BrandMarkIO): Promise<string | null> {
  const raw = await io.readString(`${root}/${getBrandFilePath('designTokens')}`).catch(() => null);
  if (!raw) return null;
  try {
    const dt = JSON.parse(raw) as { variables?: Record<string, { value?: string }> };
    const value = dt.variables?.['color.primary']?.value;
    return typeof value === 'string' && value.trim() ? value : null;
  } catch {
    return null;
  }
}
