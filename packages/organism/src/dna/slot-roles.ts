/**
 * WHAT KIND OF PICTURE A SLOT WANTS — the one classifier.
 *
 * A design declares its media slots by NAME (`{media_bg}`, `data-slot="hero"`),
 * and every surface that fills one has to answer the same question: which of
 * the brand's folders owns this? Five places answered it independently —
 * `hydrate_format`'s `slotRoleFolder`, studio's `classifySlot`, the two media
 * name-sets in `read_format` and `pattern-discovery`, and a three-key object
 * literal in `ExploreView` and the canvases. They disagreed, and nothing forced
 * them to agree: a slot named `media_1` auto-filled correctly when the agent
 * wrote the file and then drew an empty plate on /explore, because the write
 * path iterated the design's real slots and the view path knew three names.
 *
 * So the vocabulary lives here, once, beside the folder taxonomy it maps onto
 * (`BRAND_KIT_DEFAULTS`). Nothing in this module does IO or holds React — it is
 * a name, a table and a pick — so the agent tool, the studio hook and the
 * preview card can all import it.
 *
 * THE SLOT SET ITSELF STAYS DYNAMIC. This classifies a name; it never
 * enumerates the names. Slots are whatever a design declares — `@slots:`,
 * `{placeholder}` or `data-slot` — and a template is free to invent
 * `founder_portrait` tomorrow. What this fixes is that the ANSWER to "what kind
 * of picture is that" is now the same on every surface.
 */

import { isLogoSlot } from './logo-manifest';
import { LOGO_MODE_TREATMENTS, isModeableLogoSlot, logoSlotWithTreatment } from './logo-color-mode';

/**
 * The kind of media a slot expects, inferred from its declared name.
 *
 * `image` is the catch-all — a hero photograph, the default for `media_photo`,
 * `media_1`, and any name that says nothing more specific.
 */
export type MediaSlotRole = 'logo' | 'background' | 'product' | 'avatar' | 'image';

/**
 * Classify a media slot by its name.
 *
 * LOGO IS TESTED FIRST, through the shared `isLogoSlot`, because an identity
 * mark is never interchangeable with a photograph: a logo slot that falls
 * through to the picture pool puts someone's hero shot where their mark
 * belongs. The remaining tests are the union of what the previous copies
 * matched, so no surface loses a name it used to understand.
 */
export function classifyMediaSlot(name: string): MediaSlotRole {
  if (isLogoSlot(name)) return 'logo';
  if (/avatar|face|portrait|headshot|character|person|founder|team/i.test(name)) return 'avatar';
  if (/product|packshot|item|sku|device|mockup|screenshot/i.test(name)) return 'product';
  if (/bg\b|background|backdrop/i.test(name)) return 'background';
  return 'image';
}

/**
 * WHERE EACH ROLE LIVES, as folder paths relative to `assets/`.
 *
 * Paths, not names, because the kit NESTS. `folder` has always been a path in
 * this system — `brand-folder-paths` says so in as many words, and live
 * workspaces already hold `imagery/Trucks` and `knowledge/codex/ideas` — but
 * every reader treated it as one segment, so a picture one level down was
 * whatever its top folder was and nothing more.
 *
 * BOTH LAYOUTS, ALWAYS. `bg/` moved under `imagery/`; the top-level location
 * stays in the search order permanently rather than for a migration window.
 * Every workspace that has not been migrated still resolves, a workspace that
 * is half-migrated resolves, and a brand that keeps its own `bg/` at the root
 * because it always has is not wrong. There is no flag day here and there does
 * not need to be one.
 *
 * The search is PREFIX-based (see `buildSlotMediaValues`), so `imagery` reaches
 * `imagery/trucks` and `imagery/bg` without either being named here. That is
 * what makes a folder a brand invents tomorrow reachable today.
 */
export const MEDIA_SLOT_FOLDER_ORDER: Record<Exclude<MediaSlotRole, 'logo'>, readonly string[]> = {
  background: ['imagery/bg', 'bg', 'imagery'],
  product: ['products', 'imagery/products', 'imagery'],
  avatar: ['avatar', 'imagery/avatar', 'imagery'],
  image: ['imagery', 'products', 'avatar', 'bg'],
};

/**
 * Folder names that NAME a role, wherever they sit in the path.
 *
 * The bridge between a location and a meaning: `imagery/bg` is a background
 * because a segment says `bg`, not because of where it sits. This is why the
 * move needed no migration to start working, and why `imagery/product-shots`
 * is understood the moment someone creates it.
 */
const FOLDER_ROLE: Record<string, MediaSlotRole> = {
  bg: 'background',
  backgrounds: 'background',
  imagery: 'image',
  products: 'product',
  product: 'product',
  packshots: 'product',
  avatar: 'avatar',
  avatars: 'avatar',
  logos: 'logo',
};

/**
 * What a FILE is, from where it sits — the deepest segment that names a role
 * wins, so `imagery/bg/dusk.png` is a background and not a hero shot.
 *
 * `declared` is the folder's own `_folder.json` role (or the file's), and it
 * outranks the path entirely: a folder that says what it holds is the most
 * specific answer there is, and it is how a brand names a role this table has
 * never heard of.
 *
 * Null when nothing anywhere says anything — the caller decides what that
 * means, which is usually "treat it as a hero image".
 */
export function assetRoleOfPath(path: string, declared?: string | null): MediaSlotRole | null {
  if (declared) {
    const known = FOLDER_ROLE[declared.toLowerCase()];
    if (known) return known;
  }
  const segments = kitPathOfAsset(path)?.split('/') ?? [];
  for (let i = segments.length - 1; i >= 0; i--) {
    const known = FOLDER_ROLE[segments[i]!.toLowerCase()];
    if (known) return known;
  }
  return null;
}

/**
 * The kit path of an asset — everything between `assets/` and the filename.
 *
 * `brands/acme/assets/imagery/bg/dusk.png` → `imagery/bg`. Null for a file
 * sitting at the assets root, or one outside a brand altogether.
 */
export function kitPathOfAsset(path: string): string | null {
  const parts = path.split('/');
  const i = parts.lastIndexOf('assets');
  if (i < 0 || i + 2 >= parts.length) return null;
  return parts.slice(i + 1, -1).join('/') || null;
}

/**
 * The role NAME to stamp on a file being written (`FileMeta.role`), from where
 * it is being written to. Null when the location says nothing.
 */
export function kitRoleNameOfPath(path: string): string | null {
  const segments = kitPathOfAsset(path)?.split('/') ?? [];
  for (let i = segments.length - 1; i >= 0; i--) {
    if (FOLDER_ROLE[segments[i]!.toLowerCase()]) return segments[i]!.toLowerCase();
  }
  return segments[0] ?? null;
}

/**
 * Names that carry a picture rather than words.
 *
 * For the readers that have only a NAME and no declared type — the `Text:N`
 * pseudo-slot pass in `read_format`, the text-slot filter in
 * `pattern-discovery`. A slot with a declared `type` should be trusted over
 * this; it is the fallback, not the authority.
 */
const MEDIA_SLOT_EXACT = new Set([
  'image', 'images', 'background', 'bg', 'video', 'audio',
  'photo', 'picture', 'media', 'poster', 'thumbnail',
]);

export function isMediaSlotName(name: string): boolean {
  const n = name.toLowerCase();
  if (isLogoSlot(n)) return true;
  if (MEDIA_SLOT_EXACT.has(n)) return true;
  return /^media(_|\d|$)/.test(n);
}

/** Stable non-negative hash of a string — rotates slot media per card. */
export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * The brand's pictures, as a filler takes them.
 *
 * `byFolder` is the categorized kit (keys are brand-kit folder PATHS, which is
 * what both a directory scan and the brand-assets listing already produce);
 * `all` is the flat fallback for a caller that has a list and no taxonomy —
 * /explore holds a catalog brand's ten assets and no folders at all.
 */
export interface SlotMediaPool {
  byFolder?: Record<string, string[]>;
  all: string[];
  /** The brand's primary mark, for logo slots. */
  logo?: string | null;
  /**
   * Resolve a LOGO slot to its specific variant (symbol / wordmark / lockup).
   * Optional because it needs the logo manifest, which is IO this module does
   * not do — a caller that has loaded one passes it; one that has not gets
   * `logo` for every logo slot, which is the previous behaviour.
   */
  resolveLogo?: (slotName: string) => string | null;
}

/**
 * Fill the media slots a design ACTUALLY DECLARES, each from the folder that
 * owns its role.
 *
 * `seed` rotates the picks so adjacent cards in a grid show different pictures
 * and a re-render shows the same one — pass something stable and per-card, like
 * the file's path. A cursor (rather than a per-name hash) walks the pool, so
 * sibling slots inside ONE design never draw the same picture twice while the
 * pool still has more to give.
 *
 * Returns null when nothing could be filled, so the renderer draws its labeled
 * empty box rather than being handed a map of blanks.
 */
export function buildSlotMediaValues(
  slotNames: readonly string[],
  pool: SlotMediaPool,
  seed: string | number = 0,
): Record<string, string> | null {
  if (slotNames.length === 0) return null;
  const values: Record<string, string> = {};
  let cursor = typeof seed === 'number' ? Math.abs(seed) : hashString(seed);

  /*
   * PREFIX, not exact key.
   *
   * `byFolder` is keyed by kit PATH (`imagery`, `imagery/bg`, `imagery/trucks`),
   * so asking for `imagery` must reach everything beneath it. An exact lookup
   * made every subfolder invisible — the brand that files its pictures in
   * `imagery/trucks` had a hero slot that could not see a single one of them,
   * which is the same bug as the fixed three-name map one level down.
   *
   * A deeper key is more specific than a shallower one, so `imagery/bg` is
   * offered before the rest of `imagery` when a background is what was asked
   * for — the order of `folders` decides that, and this only has to respect it.
   */
  const pickFrom = (folders: readonly string[]): string | null => {
    for (const folder of folders) {
      const bucket: string[] = [];
      for (const [key, files] of Object.entries(pool.byFolder ?? {})) {
        if (key === folder || key.startsWith(`${folder}/`)) bucket.push(...files);
      }
      if (bucket.length > 0) return bucket[cursor++ % bucket.length]!;
    }
    if (pool.all.length > 0) return pool.all[cursor++ % pool.all.length]!;
    return null;
  };

  for (const name of slotNames) {
    const role = classifyMediaSlot(name);
    if (role === 'logo') {
      // A logo slot is never filled from the picture pool — see
      // `classifyMediaSlot`. No mark means no value, and the empty box stands.
      const logo = pool.resolveLogo?.(name) ?? pool.logo ?? null;
      if (logo) values[name] = logo;
      // The treatment companions a colour mode swaps in (`logo-color-mode.ts`)
      // — only when the brand has a distinct file for them, so a brand with one
      // logo carries no extra keys.
      if (logo && pool.resolveLogo && isModeableLogoSlot(name)) {
        for (const t of LOGO_MODE_TREATMENTS) {
          const key = logoSlotWithTreatment(name, t);
          if (key in values) continue;
          const variant = pool.resolveLogo(key);
          if (variant && variant !== logo) values[key] = variant;
        }
      }
      continue;
    }
    const picked = pickFrom(MEDIA_SLOT_FOLDER_ORDER[role]);
    if (picked) values[name] = picked;
  }

  return Object.keys(values).length > 0 ? values : null;
}

/**
 * THE FOCAL COMPANION KEY — `media_bg@focus` carries the crop anchor for
 * whatever fills `media_bg`.
 *
 * A picture chosen by the system rather than by a person is a picture nobody
 * has framed, and `fit="cover"` discards the overflow from the CENTRE: the
 * auto-filled portrait loses its head. The anchor is already known —
 * `describe_image` writes `focalPoint` / `focalZone` into the file's `.meta`
 * sidecar — it simply had no way to travel with the pick. It travels as a
 * companion param: `@` cannot occur in a slot name (`[a-zA-Z_][a-zA-Z0-9_]*`),
 * so the key can never collide with one, and a reader that does not know about
 * it passes it through untouched.
 *
 * `FormatRenderer` applies it as the `<Asset focus>` (CSS object-position) of
 * whichever node the slot filled, and only when that node does not author a
 * `focus` of its own — a design that has framed its own crop keeps it.
 */
export const SLOT_FOCUS_SUFFIX = '@focus';

export function slotFocusKey(slotName: string): string {
  return `${slotName}${SLOT_FOCUS_SUFFIX}`;
}

/**
 * THE FIT COMPANION KEY — `media_bg@fit` carries the cover/contain verdict for
 * whatever fills `media_bg`, measured from the file that actually landed.
 *
 * `fit` is a consequence of the IMAGE (`shared/asset-fit.ts`: four corner
 * reads, no model), not a choice a template can make — but a template serves
 * many pictures and cannot know which one it will meet. `fit="auto"` is the
 * template saying so, and this companion is the answer arriving at fill time:
 * `hydrate_format` measures the pick and writes `cover`/`contain` beside it,
 * the same wire `@focus` already rides.
 *
 * Precedence mirrors the focal companion with one difference: virtually every
 * template AUTHORS a fit, so `@fit` applies only where that authorship is
 * `auto` (or absent) — an authored `cover`/`contain`/`fill`/`none` wins. An
 * `auto` nothing answers still renders as cover, never as the CSS `fill` the
 * value would degrade to.
 */
export const SLOT_FIT_SUFFIX = '@fit';

export function slotFitKey(slotName: string): string {
  return `${slotName}${SLOT_FIT_SUFFIX}`;
}

function clampPct(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;
}

/**
 * A `.meta` focal record as an `object-position` string, or null when the file
 * says nothing.
 *
 * A POINT is used as given. A ZONE — the band that must survive the crop — is
 * approximated by its middle, because the exact anchor needs the source and
 * frame aspects and this runs before either is known. Middle-of-zone keeps a
 * head in frame, which is the failure this exists to prevent; a renderer that
 * later wants the exact arithmetic has the zone itself in the sidecar.
 */
export function focalToObjectPosition(
  meta: {
    focalPoint?: { x: number; y: number };
    focalZone?: { top: number; bottom: number };
  } | null | undefined,
): string | null {
  if (!meta) return null;
  const pt = meta.focalPoint;
  if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.y)) {
    return `${clampPct(pt.x)}% ${clampPct(pt.y)}%`;
  }
  const zone = meta.focalZone;
  if (zone && Number.isFinite(zone.top) && Number.isFinite(zone.bottom)) {
    return `50% ${clampPct((zone.top + zone.bottom) / 2)}%`;
  }
  return null;
}
