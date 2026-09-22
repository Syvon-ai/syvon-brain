/**
 * Ingest a brand crawl's ASSETS into a workspace — the real font files and the
 * real logo, not just their names.
 *
 * Written host-agnostically for the same reason `font-import.ts` next door is:
 * two surfaces need it and neither can reach the other's IO. The MCP tool
 * `import_brand_from_url` writes through a `ToolContext`; onboarding writes
 * through R2 in the Next app. Before this existed only the tool had the ingest,
 * so a brand created in onboarding NAMED its typeface and then rendered in a
 * fallback — the one failure this whole path exists to prevent.
 *
 * Everything here is best-effort by design. A font that will not decode must not
 * cost you the logo, and neither must cost you the colours that were already
 * written. What fails comes back in `notes` rather than as an exception, so the
 * caller can report a partial import honestly instead of choosing between
 * silence and failure.
 */

import { WORKSPACE_FONTS_DIR, kindFromFilename } from './dna/defaults/structure-v7';
import {
  BRAND_LOGO_MANIFEST_FILE,
  getBrandLogosFolder,
  getBrandLogoManifestPath,
  getBrandAssetFilePath,
  folderForUpload,
  BRAND_ASSET_FOLDERS,
  BRAND_BG_FOLDER,
  isKitDestination,
  BRAND_UPLOADS_FOLDER,
  type BrandAssetFolder,
  type BrandKitDestination,
} from './dna/brand-folder-paths';
import { isLogoFilename, placeholderLogoSvg, synthesizeLogoManifest } from './dna/logo-manifest';

/* ------------------------------------------------------------------ */
/*  Host IO                                                            */
/* ------------------------------------------------------------------ */

/**
 * The workspace operations this ingest needs, and nothing else.
 *
 * `writeBinary` is optional because not every host has one — a host without it
 * can still take an SVG logo (text) and simply reports that raster assets were
 * skipped, which is a better outcome than refusing the whole import.
 */
export interface WorkspaceAssetIO {
  writeText(path: string, content: string): Promise<void>;
  writeBinary?(path: string, bytes: Uint8Array): Promise<void>;
  /** File contents, or null when the file does not exist. Must not throw for absence. */
  readText(path: string): Promise<string | null>;
  /** File names (not paths) directly inside a folder. Optional; absence degrades gracefully. */
  listFiles?(folder: string): Promise<string[]>;
}

/** One row of `assets/fonts/fonts.json`. */
export interface FontManifestRow {
  family: string;
  file: string;
  weight: number;
  style: string;
}

/**
 * The asset half of a crawl result, structurally.
 *
 * Declared here rather than imported from `@syvon/agent` because that package
 * depends on this one — the dependency only runs one way.
 */
/** One crawled image, as `CrawledBrandAssets.images` carries it. */
export type CrawledImage = NonNullable<CrawledBrandAssets['images']>[number];

export interface CrawledBrandAssets {
  fonts?: Array<{
    family: string;
    weight: number;
    style: string;
    format?: string;
    fileName: string;
    /** base64, as it travels over JSON transport. */
    bytes: string;
  }>;
  images?: Array<{
    url: string;
    alt?: string | null;
    source?: string;
    fileName: string;
    contentHash?: string;
    bytes: string;
  }>;
  videos?: Array<{
    url: string;
    source?: string;
    poster?: string | null;
    fileName: string;
    contentHash?: string;
    bytes: string;
  }>;
}

export interface IngestResult {
  /** Families whose files actually landed in the workspace. */
  importedFonts: string[];
  /** Human-readable outcome: 'imported' | 'none detected' | 'failed (…)' | 'skipped (…)'. */
  logoStatus: string;
  /** Everything that went wrong without being fatal. */
  notes: string[];
  /**
   * Every non-logo image and video that landed, with the folder it landed in.
   *
   * Returned rather than merely counted because the caller's next move is to
   * run each one through vision and write its `.meta/` sidecar, and it should
   * not have to re-list the workspace to find out what just arrived.
   */
  importedMedia: ImportedMedia[];
}

/**
 * A second opinion on an image, from something that can actually SEE it.
 *
 * Injected rather than imported: this package is host-agnostic and has no
 * business knowing what a model is, the same way it takes its IO rather than
 * reaching for R2. The app supplies one backed by the vision call it is
 * already making to write the asset's description, so the judgement costs
 * nothing that was not already being spent.
 *
 * Returning `{}` (or throwing — it is caught) means UNJUDGED, and unjudged
 * must behave exactly like the old code did: file it, in the folder the tags
 * suggest. A model outage is not a reason to start discarding a brand's
 * photographs.
 */
export type ImageJudge = (image: {
  fileName: string;
  bytes: string;
  contentType: string;
}) => Promise<{ role?: string; brandMaterial?: boolean }>;

/** One filed asset: where it landed and what it is. */
export interface ImportedMedia {
  /** Workspace-relative path, e.g. `assets/imagery/og-image.jpg`. */
  path: string;
  /** `image` | `video` — the kind the brand-item row and the vision pass use. */
  kind: 'image' | 'video';
  folder: BrandKitDestination;
  /** The page URL it came from, kept for provenance in the sidecar. */
  sourceUrl: string;
  /** The crawler's `alt`, when it had one — the best free caption there is. */
  alt?: string | null;
}

const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Decode base64 without assuming Node's Buffer is the ambient global. */
function fromBase64(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/* ------------------------------------------------------------------ */
/*  fonts.json                                                         */
/* ------------------------------------------------------------------ */

/**
 * Merge rows into `assets/fonts/fonts.json`, deduped by family|weight|style
 * (last write wins).
 *
 * Shared by every route that registers a font — the Google/URL download path in
 * `import_font`, the crawl ingest here — so the manifest has one shape no matter
 * which one produced the file.
 */
export async function mergeFontManifest(
  io: WorkspaceAssetIO,
  rows: FontManifestRow[],
): Promise<FontManifestRow[]> {
  const path = `${WORKSPACE_FONTS_DIR}/fonts.json`;

  let existing: FontManifestRow[] = [];
  try {
    const raw = await io.readText(path);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) existing = parsed as FontManifestRow[];
  } catch {
    /* absent or unreadable — start fresh rather than losing the new rows */
  }

  const key = (r: FontManifestRow) => `${r.family}|${r.weight}|${r.style}`;
  const byKey = new Map(existing.map((r) => [key(r), r]));
  for (const r of rows) byKey.set(key(r), r);

  const merged = [...byKey.values()];
  await io.writeText(path, JSON.stringify(merged, null, 2));
  return merged;
}

/* ------------------------------------------------------------------ */
/*  Logo selection                                                     */
/* ------------------------------------------------------------------ */

/** Extension (lowercased, jpeg→jpg) from a crawler fileName, else null. */
export function extOfFileName(fileName: string): string | null {
  const e = fileName.split('?')[0].split('.').pop()?.toLowerCase();
  if (!e) return null;
  return e === 'jpeg' ? 'jpg' : e;
}

/**
 * Pick the best logo out of the crawler's images.
 *
 * A logo-named file first, then one whose source mentions "logo", then any SVG
 * (a vector on a brand site is nearly always the mark), else the first image.
 */
/**
 * Did this pick come from EVIDENCE, or was it the last resort?
 *
 * These are `pickLogoImage`'s first three branches — a logo-named file, a
 * logo-ish source, a vector. Its fourth is "…else the first image", which
 * carries no evidence at all and is how a hero photograph ends up in
 * `logos/`. Callers that can say "not found" use this to tell the two apart.
 */
export function isConfidentLogoPick(image: { fileName: string; source?: string }): boolean {
  return (
    isLogoFilename(image.fileName)
    || (image.source ?? '').toLowerCase().includes('logo')
    || /\.svg$/i.test(image.fileName)
  );
}

export function pickLogoImage<T extends { fileName: string; source?: string }>(
  images: T[],
): T | null {
  return (
    images.find((i) => isLogoFilename(i.fileName)) ??
    images.find((i) => (i.source ?? '').toLowerCase().includes('logo')) ??
    images.find((i) => /\.svg$/i.test(i.fileName)) ??
    images[0] ??
    null
  );
}

/* ------------------------------------------------------------------ */
/*  Filing crawled media                                               */
/* ------------------------------------------------------------------ */

/**
 * Where a crawled image belongs, by what the CRAWLER already knows about it.
 *
 * The extractor tags every image with how it found it, and those tags line up
 * with the kit almost exactly — an `og-image` is the site's chosen hero, a
 * `bg-image` is a background by definition, an `icon` is a piece of furniture.
 * That is strictly better information than the filename, which is what
 * `folderForUpload` has to work from, and it is free.
 *
 * Notably it is the only thing in the codebase that ever routes anything to
 * `bg/`: the upload path cannot, because at presign time nobody has looked at
 * the file, and a filename does not say "background".
 */
const SOURCE_FOLDER: Record<string, BrandKitDestination> = {
  'og-image': 'imagery',
  'bg-image': BRAND_BG_FOLDER,
  icon: 'graphics',
  'inline-svg': 'graphics',
  img: 'imagery',
};

/**
 * The folder for one crawled image — the crawler's own tag first, then the
 * shared filename rule the upload path uses, so a file dropped by hand and the
 * same file pulled off a site land in the same place.
 */
export function folderForCrawledImage(image: { fileName: string; source?: string }): BrandKitDestination {
  const bySource = image.source ? SOURCE_FOLDER[image.source.toLowerCase()] : undefined;
  if (bySource) return bySource;
  const byName = folderForUpload(kindFromFilename(image.fileName), image.fileName);
  // `''` is the assets ROOT (reserved for the canonical logo binaries) and
  // `uploads` is the inbox — neither is where a crawled picture belongs.
  return byName && byName !== 'uploads' ? (byName as BrandKitDestination) : 'imagery';
}

/* ------------------------------------------------------------------ */
/*  Junk                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hosts that serve a site BUILDER's shared furniture rather than the site's
 * own uploads.
 *
 * The distinction is the whole point and it is easy to get catastrophically
 * wrong. Webflow serves a customer's real uploads from
 * `cdn.prod.website-files.com/{siteId}/…` — that is where a brand's og-image
 * and hero photography live — while `d3e54v103j8qbb.cloudfront.net` is the
 * GLOBAL bucket every Webflow site on earth loads its checkbox ticks and
 * placeholder gradients from. Banning the domain family would throw away the
 * best image on the site to remove the worst one.
 *
 * So: only buckets that are shared across sites by construction.
 */
const FRAMEWORK_ASSET_HOSTS = new Set([
  'd3e54v103j8qbb.cloudfront.net', // Webflow shared static
  'static.parastorage.com', // Wix
  'static1.squarespace.com', // Squarespace shared
  'cdn.shopify.com/s/files/1/0000', // Shopify placeholder space
]);

/** Third-party marks a brand kit should never hold — they are someone else's
 *  identity, sitting in the footer of nearly every site. */
const PLATFORM_GLYPH_RE =
  /(^|[-_.])(instagram|insta|facebook|fb|twitter|x-logo|linkedin|youtube|tiktok|pinterest|whatsapp|threads|discord|github)([-_.]|$)/i;

/** Below this a raster is a spacer, a tracking pixel or a bullet. */
const MIN_RASTER_BYTES = 1024;

/** Is this string one of the kit's own folders? Guards the model's answer:
 *  a role the kit does not have would create a folder nothing ever reads. */
function isKitFolder(role: string): role is BrandKitDestination {
  return isKitDestination(role);
}

/** Content type for a crawled image, for the judge's data URI. */
function mimeForImage(fileName: string): string {
  const ext = extOfFileName(fileName);
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

/** Approximate decoded size without decoding — base64 is 4 chars per 3 bytes. */
function approxBytes(b64: string): number {
  return Math.floor((b64?.length ?? 0) * 0.75);
}

/**
 * Is this crawled image the brand's material, or the page's furniture?
 *
 * A crawl brings back everything the page loaded, and a good half of that is
 * plumbing: the site builder's checkbox tick, the favicon (which is the mark
 * again, at 16px), the Instagram glyph in the footer. Filed into the kit they
 * are worse than absent — every downstream reader selects from these folders,
 * so a deck can and will reach for a placeholder gradient as its hero.
 *
 * Deliberately NOT a vision call. The signals below are exact, free and
 * available before a byte is written, where vision is expensive, arrives after
 * the file has already landed, and cannot reliably tell a brand's minimal mark
 * from a platform's.
 *
 * Conservative by design: everything it rejects is provably furniture. An
 * image it is unsure about is kept, because a workspace with one stray picture
 * is a smaller failure than one missing the company's only photograph.
 */
export function crawledImageVerdict(
  image: { url: string; fileName: string; source?: string; bytes: string },
  opts?: { logoAlreadyFiled?: boolean },
): { keep: true } | { keep: false; reason: string } {
  let host = '';
  try {
    host = new URL(image.url).hostname.toLowerCase();
  } catch {
    /* a data: URI — inline, and therefore the site's own */
  }

  if (host && FRAMEWORK_ASSET_HOSTS.has(host)) {
    return { keep: false, reason: `${image.fileName}: site-builder furniture (${host})` };
  }

  // The favicon and the webclip ARE the mark, smaller and worse. `pickLogoImage`
  // has already run by the time this is consulted, so if one of them was the
  // best mark on the site it is already filed in `logos/`.
  if ((image.source ?? '').toLowerCase() === 'icon') {
    return { keep: false, reason: `${image.fileName}: favicon/app icon` };
  }

  if (PLATFORM_GLYPH_RE.test(image.fileName)) {
    return { keep: false, reason: `${image.fileName}: third-party platform mark` };
  }

  // The same mark arriving a second time — typically the inline SVG and the
  // `<img>` that points at the same file. Their BYTES differ (a browser
  // re-serialises inline SVG), so the content-hash pass cannot catch it; the
  // name can.
  if (opts?.logoAlreadyFiled && isLogoFilename(image.fileName)) {
    return { keep: false, reason: `${image.fileName}: the logo again` };
  }

  const ext = extOfFileName(image.fileName);
  if (ext && ext !== 'svg' && approxBytes(image.bytes) < MIN_RASTER_BYTES) {
    return { keep: false, reason: `${image.fileName}: too small to be artwork` };
  }

  return { keep: true };
}

/**
 * A filename that will not collide with one already taken.
 *
 * A crawl routinely returns several files with the same name — two `icon.png`
 * (favicon and webclip), two `logo.svg` (the inline mark and the `<img>` one).
 * Writing them in order means the last one silently wins and the workspace
 * quietly holds fewer assets than the report claims.
 */
function uniqueName(taken: Set<string>, fileName: string): string {
  if (!taken.has(fileName)) {
    taken.add(fileName);
    return fileName;
  }
  const dot = fileName.lastIndexOf('.');
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot) : '';
  for (let n = 2; n < 1000; n++) {
    const candidate = `${stem}-${n}${ext}`;
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }
  return `${stem}-${taken.size}${ext}`;
}

/* ------------------------------------------------------------------ */
/*  Ingest                                                             */
/* ------------------------------------------------------------------ */

/**
 * Write a crawl's fonts and logo into the workspace and register both.
 *
 * Fonts land in `assets/fonts/` with a merged `fonts.json`; the logo lands in
 * `assets/logos/` and the `logo/v1` manifest is rebuilt from the folder's real
 * contents rather than from what we just wrote — so a logo added by another
 * route is not silently dropped from the manifest by this one.
 */
export async function ingestCrawledAssets(
  io: WorkspaceAssetIO,
  crawl: CrawledBrandAssets,
  opts?: {
    includeFonts?: boolean;
    includeLogo?: boolean;
    includeMedia?: boolean;
    /** See {@link ImageJudge}. Absent = file by tag alone, as before. */
    judge?: ImageJudge;
    /**
     * At most this many of the site's images, after the cheap filter.
     *
     * A marketing site can carry a hundred and fifty pictures, and a brand kit
     * is not an archive of one — past a couple of dozen every extra file costs
     * a download, a judge call and a row, and buys a folder nobody can find
     * anything in. The cap counts REAL candidates (the deterministic verdict
     * has already thrown out sprites, icons and tracking pixels), and what it
     * drops is said out loud in `notes` rather than silently truncated.
     *
     * Absent = no cap, which is what every non-onboarding caller wants.
     */
    maxImages?: number;
    /**
     * Write a filled circle to `logos/logo.svg` when no real mark was found.
     *
     * Off by default: see the block that consumes this. Only a caller that
     * would rather have a visible stand-in than an empty slot should ask.
     */
    placeholderLogo?: boolean;
  },
): Promise<IngestResult> {
  const includeFonts = opts?.includeFonts !== false;
  const includeLogo = opts?.includeLogo !== false;
  /** The site's other pictures and its video. Opt-OUT, like the two above:
   *  a caller that wants a brand wants the brand's material with it. */
  const includeMedia = opts?.includeMedia !== false;
  const notes: string[] = [];

  // ── Fonts ──
  const importedFonts: string[] = [];
  const fonts = crawl.fonts ?? [];
  if (includeFonts && fonts.length > 0) {
    if (!io.writeBinary) {
      notes.push('host cannot write binary files — fonts skipped');
    } else {
      const rows: FontManifestRow[] = [];
      for (const f of fonts) {
        try {
          await io.writeBinary(`${WORKSPACE_FONTS_DIR}/${f.fileName}`, fromBase64(f.bytes));
          rows.push({ family: f.family, file: f.fileName, weight: f.weight, style: f.style });
        } catch (err) {
          notes.push(`font ${f.fileName}: ${errMsg(err)}`);
        }
      }
      if (rows.length > 0) {
        try {
          await mergeFontManifest(io, rows);
          importedFonts.push(...new Set(rows.map((r) => r.family)));
        } catch (err) {
          // The files are on disk but unregistered — say so, because a font the
          // manifest does not list will not render.
          notes.push(`fonts.json: ${errMsg(err)} (font files written but not registered)`);
        }
      }
    }
  }

  // ── Logo ──
  let logoStatus = 'none detected';
  const images = crawl.images ?? [];
  let logoPick: (typeof images)[number] | null = null;
  /** Extension of whatever landed in `logos/`, for the manifest fallback. */
  let logoExt: string | undefined;
  if (includeLogo && images.length > 0) {
    const candidate = pickLogoImage(images);
    // `pickLogoImage` ends in "…else the first image", which is a guess, not a
    // finding: on a site with no mark among its images that hands the brand a
    // random hero photograph as its logo. A caller with a placeholder to fall
    // back on would rather be told nothing was found — and one without it
    // keeps the old guess, because for `import_brand_from_url` a guessed mark
    // has always been better than an empty slot.
    const pick =
      candidate && opts?.placeholderLogo && !isConfidentLogoPick(candidate) ? null : candidate;
    if (candidate && !pick) {
      logoStatus = 'none detected (no mark among the crawled images)';
    }
    logoPick = pick;
    if (pick) {
      const ext = extOfFileName(pick.fileName) ?? 'png';
      const logoPath = `${getBrandLogosFolder()}/logo.${ext}`;
      try {
        const bytes = fromBase64(pick.bytes);
        if (ext === 'svg') {
          await io.writeText(logoPath, decodeUtf8(bytes));
        } else if (io.writeBinary) {
          await io.writeBinary(logoPath, bytes);
        } else {
          throw new Error('host cannot write binary files (a raster logo needs it)');
        }
        logoStatus = 'imported';
      } catch (err) {
        logoStatus = `failed (${errMsg(err)})`;
      }
      logoExt = ext;
    }
  }

  // ── The stand-in ──
  //
  // Opt-IN, and it has to stay that way. `import_brand_from_url` reaches this
  // same ingest and refuses a placeholder on purpose — a grey dot written into
  // `assets/logos/` is indistinguishable from a real mark to every later
  // reader, and "we did not find your logo" is the honest answer for a tool
  // whose whole job is reporting what a site actually has. Onboarding wants
  // the opposite: a new workspace with an empty logo slot looks broken in the
  // bento and in the first deck built from it.
  //
  // The file says which it is (`isPlaceholderLogoSvg`), so the honesty the
  // MCP tool is protecting is preserved rather than traded away.
  if (includeLogo && opts?.placeholderLogo && logoStatus !== 'imported') {
    const reason = logoStatus;
    try {
      await io.writeText(`${getBrandLogosFolder()}/logo.svg`, placeholderLogoSvg());
      logoExt = 'svg';
      logoStatus = 'placeholder';
      notes.push(`no logo found (${reason}) — wrote a placeholder mark`);
    } catch (err) {
      notes.push(`logo placeholder: ${errMsg(err)}`);
    }
  }

  // Rebuild the logo/v1 manifest from what is actually in the folder, so the
  // mark — real or stand-in — is resolvable by every surface that asks.
  if (logoStatus === 'imported' || logoStatus === 'placeholder') {
    try {
      let filenames: string[] = [];
      if (io.listFiles) {
        filenames = (await io.listFiles(getBrandLogosFolder()))
          .filter((name) => name !== BRAND_LOGO_MANIFEST_FILE && !name.startsWith('.'));
      }
      if (filenames.length === 0) filenames = [`logo.${logoExt ?? 'svg'}`];

      const manifest = synthesizeLogoManifest(filenames);
      if (manifest) {
        await io.writeText(getBrandLogoManifestPath(), JSON.stringify(manifest, null, 2));
      }
    } catch (err) {
      // The logo file is there and usable; only its manifest entry is not.
      notes.push(`logo manifest: ${errMsg(err)}`);
    }
  }

  // ── Everything else the crawl brought back ──
  //
  // This is the half that did not exist. The crawl fetched these, base64'd
  // them and shipped them across the wire, and the ingest wrote ONE of them —
  // the logo — and dropped the rest on the floor: the og-image, the hero
  // still, the brand film. A workspace set up from a URL had a palette, a
  // typeface and a mark, and not one picture of the company in it.
  //
  // They are filed BY KIND rather than dumped in `uploads/`, because the kit
  // folders are what every downstream reader selects on: `imagery` is what a
  // deck reaches for, `bg` is what a background slot reaches for, and a file
  // in the inbox is a file nothing has decided about yet.
  const importedMedia: ImportedMedia[] = [];
  const taken = new Set<string>();
  const seenHashes = new Set<string>();

  const fileOne = async (
    item: { fileName: string; bytes: string; url: string; contentHash?: string },
    folder: BrandKitDestination,
    kind: 'image' | 'video',
    alt?: string | null,
  ): Promise<void> => {
    // The crawler dedupes within a run, but the same asset can arrive from two
    // sources (an inline SVG and the `<img>` that also points at it).
    if (item.contentHash) {
      if (seenHashes.has(item.contentHash)) return;
      seenHashes.add(item.contentHash);
    }
    const name = uniqueName(taken, item.fileName);
    const path = getBrandAssetFilePath(folder, name);
    try {
      const bytes = fromBase64(item.bytes);
      if (extOfFileName(name) === 'svg') {
        await io.writeText(path, decodeUtf8(bytes));
      } else if (io.writeBinary) {
        await io.writeBinary(path, bytes);
      } else {
        notes.push(`${name}: host cannot write binary files`);
        return;
      }
      importedMedia.push({
        path,
        kind,
        folder,
        sourceUrl: item.url,
        ...(alt ? { alt } : {}),
      });
    } catch (err) {
      notes.push(`${name}: ${errMsg(err)}`);
    }
  };

  // The logo already has a home; filing it twice would put the mark in
  // `graphics/` as well as `logos/`.
  if (logoPick?.contentHash) seenHashes.add(logoPick.contentHash);

  if (includeMedia) {
    const skipped: string[] = [];
    const demoted: string[] = [];

    // ── Who is a candidate at all ──
    // The deterministic verdict first, because it is free and throws out the
    // bulk of a marketing site: sprites, icons, tracking pixels, the logo we
    // already filed.
    const candidates: CrawledImage[] = [];
    for (const image of images) {
      if (image === logoPick) continue;
      const verdict = crawledImageVerdict(image, { logoAlreadyFiled: logoStatus === 'imported' });
      if (!verdict.keep) {
        skipped.push(verdict.reason);
        continue;
      }
      candidates.push(image);
    }
    const cap = opts?.maxImages;
    const kept = cap !== undefined && cap >= 0 ? candidates.slice(0, cap) : candidates;
    if (kept.length < candidates.length) {
      notes.push(
        `kept the first ${kept.length} of ${candidates.length} images — the rest were left on the site`,
      );
    }

    // ── What only looking can decide ──
    //
    // Run CONCURRENTLY, then file sequentially. This loop used to `await` one
    // vision call per image inside the filing loop, which on a site with a
    // hundred pictures is a hundred round trips end to end — the single
    // largest cost in an import, and the reason the last step of onboarding
    // sat there. Filing stays sequential because it dedups against
    // `seenHashes` and names files by what is already taken; both depend on
    // order, and neither depends on the judge.
    const verdicts = new Map<CrawledImage, { role?: string; brandMaterial?: boolean }>();
    if (opts?.judge) {
      const judge = opts.judge;
      const CONCURRENCY = 6;
      for (let i = 0; i < kept.length; i += CONCURRENCY) {
        await Promise.all(
          kept.slice(i, i + CONCURRENCY).map(async (image) => {
            try {
              verdicts.set(
                image,
                await judge({
                  fileName: image.fileName,
                  bytes: image.bytes,
                  contentType: mimeForImage(image.fileName),
                }),
              );
            } catch {
              /* unjudged — falls through to the tag-derived folder */
            }
          }),
        );
      }
    }

    for (const image of kept) {
      let folder = folderForCrawledImage(image);
      const seen = verdicts.get(image);
      if (seen) {
        if (seen.role && isKitFolder(seen.role)) folder = seen.role;
        // NOT deleted. `uploads/` is the organism's own inbox for material
        // nothing has decided about — the file survives, the user can promote
        // it, and the kit that everything downstream selects from stays clean.
        if (seen.brandMaterial === false) {
          folder = BRAND_UPLOADS_FOLDER;
          demoted.push(image.fileName);
        }
      }

      await fileOne(image, folder, 'image', image.alt ?? null);
    }
    // Said out loud rather than dropped quietly. A filter nobody can see is
    // indistinguishable from a crawler that missed things.
    if (skipped.length > 0) {
      notes.push(`skipped ${skipped.length} non-brand image(s): ${skipped.join('; ')}`);
    }
    if (demoted.length > 0) {
      notes.push(`filed to uploads/ rather than the kit — not brand material: ${demoted.join(', ')}`);
    }

    for (const video of crawl.videos ?? []) {
      await fileOne(video, 'video', 'video');
    }
  }

  return { importedFonts, logoStatus, notes, importedMedia };
}
