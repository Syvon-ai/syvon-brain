/**
 * logo/v1 — brand logo *variant* manifest + the slot-resolution rule.
 *
 * A brand has more than one logo. Industry-standard anatomy:
 *   - `symbol`   the graphic mark alone (aka mark / icon / glyph)
 *   - `wordmark` the name set in type (aka logotype)
 *   - `lockup`   symbol + wordmark together (aka combined / combination mark),
 *                with an optional `stacked` (vertical) orientation
 * Each variant has up to three colour treatments:
 *   - `color`  full colour (the default)
 *   - `light`  reversed / white — for dark surfaces
 *   - `dark`   mono black — for light surfaces
 *
 * The manifest lives at `brands/{slug}/assets/logos/manifest.json` (self-
 * describing folder, mirroring the workspace fonts manifest). All file paths
 * inside it are RELATIVE to that `logos/` folder.
 *
 * Slots carry intent by NAME: `{brand_logo}` → the manifest's `primary`
 * variant; `{brand_symbol}` / `{brand_mark}` → symbol; `{brand_wordmark}` →
 * wordmark; `{brand_lockup}` → lockup. A treatment/orientation qualifier may
 * be appended (`brand_symbol_light`, `brand_lockup_stacked`). The resolver
 * degrades gracefully: requested treatment → color; requested variant →
 * primary → symbol → lockup → wordmark; requested orientation → default.
 *
 * This module is PURE (no IO). Consumers (studio preview hook,
 * `hydrate_format`, brain `readLogoSvg`) read the manifest / list the folder
 * and call these functions so one rule governs every render path.
 */

import {
  getBrandLogosFolder,
  getBrandAssetsFolder,
  BRAND_ROOT_LOGO_BINARIES,
  BRAND_LOGO_MANIFEST_FILE,
  LOGO_FILENAME_STEM_RE,
} from './brand-folder-paths';

export const LOGO_VARIANTS = ['symbol', 'wordmark', 'lockup'] as const;
export type LogoVariant = (typeof LOGO_VARIANTS)[number];

export const LOGO_TREATMENTS = ['color', 'light', 'dark'] as const;
export type LogoTreatment = (typeof LOGO_TREATMENTS)[number];

/** Orientation is only meaningful for `lockup`. */
export type LogoOrientation = 'horizontal' | 'stacked';

/**
 * File map for one variant. Keys are `{treatment}` and, for lockup, the
 * `stacked-*` orientation forms. Every value is a filename RELATIVE to the
 * `logos/` folder. All keys optional — the resolver falls back within them.
 */
export interface LogoVariantFiles {
  color?: string;
  light?: string;
  dark?: string;
  /** Stacked (vertical) orientation — lockup only. */
  stacked?: string;
  'stacked-light'?: string;
  'stacked-dark'?: string;
}

export interface LogoManifest {
  $schema: 'logo/v1';
  /** Variant a bare `{brand_logo}` resolves to. */
  primary: LogoVariant;
  variants: Partial<Record<LogoVariant, LogoVariantFiles>>;
}

/** A parsed slot request. `variant: 'primary'` means "the brand's default". */
export interface LogoIntent {
  variant: LogoVariant | 'primary';
  treatment: LogoTreatment;
  orientation: LogoOrientation;
}

const SCHEMA = 'logo/v1' as const;

/**
 * True when `name` is any brand-logo slot (broad — the finer split is in
 * classifyLogoSlot).
 *
 * THE TOKEN MUST END WHERE THE NAME LETS IT. Without the trailing boundary this
 * matched any name whose token merely STARTED with a logo word: `media_marketing`
 * matched `mark`, classified as an identity slot, and was then deliberately left
 * empty by every filler — a slot that silently never fills, for a reason no
 * error mentions. `isLogoFilename` has had this boundary since it was written;
 * this is the same rule on the slot side. A trailing `s` is allowed (`logos`),
 * as is a separator or a digit (`logo_2`, `brand_logo-dark`).
 */
export function isLogoSlot(name: string): boolean {
  return /(?:^|_)(?:brand_)?(?:logotype|logo|wordmark|brandmark|mark|symbol|lockup|combined|combo|icon|badge|glyph)s?(?:[_\-0-9]|$)/i.test(
    name,
  );
}

/* ------------------------------------------------------------------ */
/*  The stand-in mark                                                   */
/* ------------------------------------------------------------------ */

/** The placeholder's grey. Neutral on purpose — see `placeholderLogoSvg`. */
export const PLACEHOLDER_LOGO_FILL = '#888888';

/**
 * Marks the file as a stand-in rather than the brand's mark.
 *
 * The reason this attribute exists is the whole risk of having a placeholder
 * at all: once a circle is sitting in `assets/logos/logo.svg`, every later
 * reader — the bento, a deck's logo slot, the next import deciding whether a
 * brand "already has" a mark — sees a logo and stops asking. This makes the
 * difference recoverable in the file itself, so "we could not find your logo"
 * survives as a fact instead of being overwritten by a grey dot.
 */
const PLACEHOLDER_ATTR = 'data-syvon-placeholder';

/**
 * A filled circle, for when no logo could be found.
 *
 * Deliberately NOT in the brand's colours. The placeholder's job is to fill a
 * hole in a layout without ever being mistaken for a design decision — a mark
 * in the brand's primary reads as intentional, which is precisely the
 * confusion the attribute above exists to prevent. Grey reads as absent.
 */
export function placeholderLogoSvg(fill: string = PLACEHOLDER_LOGO_FILL): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" ${PLACEHOLDER_ATTR}="true"><circle cx="50" cy="50" r="45" fill="${fill}"/></svg>`;
}

/** True when this SVG is the stand-in above rather than a real mark. */
export function isPlaceholderLogoSvg(svg: string): boolean {
  return new RegExp(`${PLACEHOLDER_ATTR}\\s*=\\s*["']true["']`).test(svg);
}

/**
 * True when a bare asset FILENAME is a logo/identity binary — the file-level
 * analogue of `isLogoSlot`. Used to keep root-level logos (`logo.svg`,
 * `logo_symbol.svg`, `logo_wordmark.svg`, `mark.svg`, …) out of the general
 * media pool, so a `media_bg`/photo slot never resolves to the brand mark.
 * This is the pattern the exact-list `BRAND_ROOT_LOGO_BINARIES` couldn't
 * cover — a brand with `logo_symbol.svg`/`logo_wordmark.svg` variants at its
 * assets root leaked them into backgrounds. The stem must START with a logo
 * token and be followed by a separator or end, so a real photo like
 * `market-stall.jpg` ("market") or `iconic.jpg` ("icon") is NOT swept up.
 * Only image files qualify.
 */
export function isLogoFilename(filename: string): boolean {
  const base = (filename.split(/[\\/]/).pop() ?? filename).toLowerCase();
  if (!/\.(svg|png|webp|jpe?g|avif|gif)$/.test(base)) return false;
  return LOGO_FILENAME_STEM_RE.test(base.replace(/\.[^.]+$/, ''));
}

/**
 * Parse a slot name into a logo intent, or `null` when it is not a logo slot.
 * Variant, treatment, and orientation are each read independently from the
 * name so `brand_lockup_stacked_light` resolves fully.
 */
export function classifyLogoSlot(name: string): LogoIntent | null {
  if (!isLogoSlot(name)) return null;
  const n = name.toLowerCase();

  let variant: LogoIntent['variant'];
  // Order matters: wordmark + lockup are tested first, so a bare `mark` in the
  // symbol clause can't steal `wordmark`/`brandmark`. `mark` is matched loosely
  // because `\bmark\b` fails on `brand_mark` (underscore is a word char).
  if (/wordmark|logotype/.test(n)) variant = 'wordmark';
  else if (/lockup|combined|combo/.test(n)) variant = 'lockup';
  else if (/symbol|icon|glyph|badge|mark/.test(n)) variant = 'symbol';
  else variant = 'primary'; // brand_logo / logo / brand

  let treatment: LogoTreatment = 'color';
  if (/light|white|reverse|revers|invert|knockout|negative|\bneg\b/.test(n)) treatment = 'light';
  else if (/\bdark\b|black|mono/.test(n)) treatment = 'dark';

  const orientation: LogoOrientation = /stack|vertical|\bvert\b/.test(n) ? 'stacked' : 'horizontal';

  return { variant, treatment, orientation };
}

/** Variant fallback order for a requested variant (deduped, existing-first is applied by caller). */
function variantChain(requested: LogoVariant, primary: LogoVariant): LogoVariant[] {
  const chain = [requested, primary, 'lockup', 'symbol', 'wordmark'] as LogoVariant[];
  return [...new Set(chain)];
}

/** Treatment fallback order — requested first, then color, then the rest. */
function treatmentChain(requested: LogoTreatment): LogoTreatment[] {
  return [...new Set([requested, 'color', 'light', 'dark'] as LogoTreatment[])];
}

/**
 * Resolve a slot intent to a filename RELATIVE to the `logos/` folder, or
 * `null` when the manifest has nothing usable. Applies variant → treatment →
 * orientation fallbacks so a slot always renders SOMETHING on-brand when any
 * logo exists.
 */
export function resolveLogoFile(manifest: LogoManifest, intent: LogoIntent): string | null {
  const start: LogoVariant = intent.variant === 'primary' ? manifest.primary : intent.variant;

  for (const variant of variantChain(start, manifest.primary)) {
    const files = manifest.variants[variant];
    if (!files) continue;

    // Orientation-qualified keys first (lockup stacked), then plain.
    const treatments = treatmentChain(intent.treatment);
    if (intent.orientation === 'stacked') {
      for (const t of treatments) {
        const key = (t === 'color' ? 'stacked' : `stacked-${t}`) as keyof LogoVariantFiles;
        if (files[key]) return files[key]!;
      }
    }
    for (const t of treatments) {
      if (files[t]) return files[t];
    }
    // Last resort within a variant: any defined file.
    const any = Object.values(files).find(Boolean);
    if (any) return any;
  }
  return null;
}

/** Collapse `a/b/../c` → `a/c` so `logos/../logo.svg` becomes a clean key. */
function normalizePath(p: string): string {
  const out: string[] = [];
  for (const seg of p.split('/')) {
    if (seg === '..' && out.length && out[out.length - 1] !== '..') out.pop();
    else if (seg !== '.' && seg !== '') out.push(seg);
  }
  return out.join('/');
}

/**
 * Resolve an intent to a WORKSPACE-relative path (prefixing + normalising
 * against the logos folder). Manifest values may reference root binaries as
 * `../logo.svg`; the result is collapsed to `brands/{slug}/assets/logo.svg`.
 */
export function resolveLogoPath(
  manifest: LogoManifest,
  intent: LogoIntent,
  logosFolder: string,
): string | null {
  const file = resolveLogoFile(manifest, intent);
  return file ? normalizePath(`${logosFolder.replace(/\/$/, '')}/${file}`) : null;
}

// ── Synthesis — build a manifest from bare filenames (no manifest.json) ────

interface Classified {
  variant: LogoVariant;
  treatment: LogoTreatment;
  orientation: LogoOrientation;
}

/** Classify a bare filename by its stem (mirrors classifyLogoSlot's keywords). */
function classifyFilename(filename: string): Classified {
  const stem = filename.toLowerCase().replace(/\.[^.]+$/, '');

  let variant: LogoVariant;
  if (/wordmark|logotype/.test(stem)) variant = 'wordmark';
  else if (/lockup|combined|combo/.test(stem)) variant = 'lockup';
  else if (/symbol|icon|glyph|mark/.test(stem)) variant = 'symbol';
  // Bare `logo` is conventionally the do-it-all combined mark.
  else variant = 'lockup';

  let treatment: LogoTreatment = 'color';
  if (/light|white|reverse|revers|invert|knockout|negative|\bneg\b/.test(stem)) treatment = 'light';
  else if (/\bdark\b|black|mono/.test(stem)) treatment = 'dark';

  const orientation: LogoOrientation = /stack|vertical|\bvert\b/.test(stem) ? 'stacked' : 'horizontal';
  return { variant, treatment, orientation };
}

/** Storage key inside LogoVariantFiles for a treatment+orientation. */
function fileKey(c: Classified): keyof LogoVariantFiles {
  if (c.orientation === 'stacked') {
    return (c.treatment === 'color' ? 'stacked' : `stacked-${c.treatment}`) as keyof LogoVariantFiles;
  }
  return c.treatment;
}

/**
 * Build a `logo/v1` manifest from a flat list of logo filenames (e.g. the
 * contents of `logos/` plus any root `logo.svg`/`mark.svg`/`wordmark.svg`
 * mapped in). Filenames are RELATIVE to the logos folder — pass root binaries
 * with a `../` prefix if you want them addressable there, or normalise first.
 * Returns `null` when the list has no usable file. Deterministic; SVG wins
 * over raster for the same slot (crisper + tintable).
 */
export function synthesizeLogoManifest(filenames: string[]): LogoManifest | null {
  const usable = filenames.filter((f) => /\.(svg|png|webp|jpe?g|avif)$/i.test(f));
  if (usable.length === 0) return null;

  const variants: Partial<Record<LogoVariant, LogoVariantFiles>> = {};
  const isSvg = (f: string) => /\.svg$/i.test(f);

  for (const f of usable) {
    const c = classifyFilename(f);
    const files = (variants[c.variant] ??= {});
    const key = fileKey(c);
    const existing = files[key];
    // First writer wins, but an SVG always upgrades a raster placeholder.
    if (!existing || (!isSvg(existing) && isSvg(f))) files[key] = f;
  }

  // Primary: richest available — lockup, else symbol, else wordmark.
  const primary: LogoVariant = variants.lockup
    ? 'lockup'
    : variants.symbol
      ? 'symbol'
      : 'wordmark';
  if (!variants[primary]) return null; // no variant materialised

  return { $schema: SCHEMA, primary, variants };
}

/** Narrow an unknown value to a valid `logo/v1` manifest, else `null`. */
export function parseLogoManifest(raw: unknown): LogoManifest | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  if (m.$schema !== SCHEMA) return null;
  const primary = m.primary;
  if (typeof primary !== 'string' || !LOGO_VARIANTS.includes(primary as LogoVariant)) return null;
  if (!m.variants || typeof m.variants !== 'object') return null;
  return m as unknown as LogoManifest;
}

// ── Effective-manifest loader (dependency-injected IO) ─────────────────────

export interface LogoManifestIO {
  /** Read a workspace-relative text file; reject/throw when absent. */
  readFile(path: string): Promise<string>;
  /** List filenames (not paths) in a workspace-relative dir; [] when absent. */
  listDir(path: string): Promise<string[]>;
}

export interface EffectiveLogoManifest {
  manifest: LogoManifest;
  /** Workspace-relative logos folder these files resolve against. */
  logosFolder: string;
  /** 'authored' when a valid manifest.json was read; 'synthesized' otherwise. */
  source: 'authored' | 'synthesized';
}

/**
 * The single entry point every render path uses. Loads the authored
 * `logos/manifest.json` when present + valid; otherwise synthesizes one from
 * the `logos/` folder listing plus any root `logo.svg`/`mark.svg`/
 * `wordmark.svg` (referenced as `../name` so they normalise back to the assets
 * root). Returns `null` only when the brand has NO logo file anywhere.
 */
export async function loadLogoManifest(
  slug: string,
  io: LogoManifestIO,
): Promise<EffectiveLogoManifest | null> {
  const logosFolder = getBrandLogosFolder(slug);

  // 1. Authored manifest wins.
  try {
    const raw = await io.readFile(`${logosFolder}/${BRAND_LOGO_MANIFEST_FILE}`);
    const parsed = parseLogoManifest(JSON.parse(raw));
    if (parsed) return { manifest: parsed, logosFolder, source: 'authored' };
  } catch {
    /* no manifest — synthesize below */
  }

  // 2. Synthesize from folder contents + root binaries.
  const filenames: string[] = [];
  try {
    for (const name of await io.listDir(logosFolder)) {
      if (name !== BRAND_LOGO_MANIFEST_FILE && !name.startsWith('.')) filenames.push(name);
    }
  } catch {
    /* no logos/ folder */
  }

  const assetsRoot = getBrandAssetsFolder(slug);
  for (const bin of BRAND_ROOT_LOGO_BINARIES) {
    try {
      await io.readFile(`${assetsRoot}/${bin}`);
      filenames.push(`../${bin}`); // normalises back to assets root on resolve
    } catch {
      /* not present */
    }
  }

  const synthesized = synthesizeLogoManifest(filenames);
  return synthesized ? { manifest: synthesized, logosFolder, source: 'synthesized' } : null;
}
