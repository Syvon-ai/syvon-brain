/**
 * Path resolvers for the v11 Brand layout — **the brand IS the workspace root**.
 *
 * v8.6 nested everything under `brands/{slug}/`. v11 removed that level: a
 * workspace has one brand, so the slug was a fork in the path that never
 * branched. See `getBrandFolder` below for the evidence and for why every
 * builder still ACCEPTS a slug and ignores it.
 *
 * **Slug vs id** — every Brand has both a Prisma cuid (`id`) and a
 * human-readable immutable `slug`. Filesystem + R2 keys ALWAYS use the
 * slug (human-readable, stable across DB renames). DB FKs + pointers
 * (`Project.brandId`, `Workspace.defaultBrandId`) ALWAYS use the id.
 * These helpers are pure path math and take slug. Callers holding a full
 * `BrandRef { id, slug }` (from `@syvon/organism`) should pass `.slug`.
 *
 * Workspace layout per `.schema/organism-map.md` + spec
 * `docs/superpowers/specs/2026-06-15-brand-backend-reconstruction-design.md`:
 *
 *   config/                 ← machine values (R2 documents, no DB row)
 *   ├─ brand.json           ← Brand DNA (voice / visual / identity / …)
 *   ├─ design-tokens.json   ← colors + typography
 *   ├─ text-styles.json     ← typographic scale
 *   ├─ figma-tokens.json    ← Figma integration cache
 *   ├─ animation.json       ← motion curves
 *   └─ graph.json           ← workflow graph
 *   wrapper/                ← brand-site surface (rendered by the external wrapper app)
 *   ├─ site.json            ← site/v1: sitemap, nav, sections
 *   └─ pages/               ← per-page authored content (MDX; optional)
 *   meta/                   ← prose brain (R2 documents, human-authored)
 *   ├─ voice.md  strategy.md  target-profile.md  product.md
 *   └─ patterns.md  reels-strategy.md  status.md  learnings.md
 *   assets/                 ← fonts AND the kit (R2 file + BrandItem row each)
 *   ├─ fonts/               ← workspace typefaces (was already at the root)
 *   ├─ uploads/             ← runtime user-upload inbox (not a kit primitive)
 *   ├─ logos/ avatar/ imagery/ bg/ graphics/      ← 15 authored primitives
 *   ├─ video/ audio/ music/ knowledge/ skills/ products/ work/
 *   ├─ drafts/ notes/
 *   ├─ world/               ← world.json + world.md + the context library
 *   └─ {folder}/.meta/      ← _folder.json (folder-meta/v1) + {file}.json
 *
 * Documents (`config/*.json`, `meta/*.md`) are pathed singletons with NO DB
 * row; kit items under `assets/{folder}/` each carry a `BrandItem` row whose
 * `folder` equals the path segment (path-is-truth invariant). The first 12
 * primitives + their `_folder.json` seed values mirror
 * `ChannelContent/_templateMaster/`; `drafts` and `notes` are authored in
 * `BRAND_KIT_DEFAULTS` directly (see below).
 *
 * Lowercase to match `@syvon/catalog/r2-paths`.
 *
 * **There is no active-vs-default fallback any more.** v8.6 seeded every brand
 * self-sufficient and had readers try the active brand's file, then the
 * workspace default's (`Workspace.defaultBrandId`). With one folder both
 * resolve to the same path, so `resolveBrandFileCandidates` returns a
 * single-element list and a miss is a real miss — the renderer uses its
 * built-ins. There is still no workspace-wide `.Syvon/animation.json`;
 * animation lives in `config/` like every other DNA file.
 */

/**
 * Initial slug used when the first brand in a workspace is created
 * from-scratch. The slug is immutable once written (brand.name can
 * change; slug cannot), but there is nothing load-bearing about the
 * literal string `'default'` — `Workspace.defaultBrandId` is the real
 * pointer. Kept as a named constant so migration + seed code agree.
 */
export const DEFAULT_BRAND_SLUG = 'default';

// The one place the root folder names come from. Imported rather than spelled,
// so `assets/` cannot drift between the registry and the builders.
import { WS_ASSETS } from '../workspace-config';

/**
 * Canonical file names inside a `brands/{slug}/config/` folder.
 *
 * Keep this COMPLETE. A config file that is missing here has no builder, so the
 * caller spells the path itself — which is how 151 files came to hold their own
 * copy of the layout while this module claimed to be its single source. If you
 * add a config file, add it here in the same commit.
 */
export const BRAND_FOLDER_FILES = {
  brand: 'brand.json',
  designTokens: 'design-tokens.json',
  textStyles: 'text-styles.json',
  figmaTokens: 'figma-tokens.json',
  animation: 'animation.json',
  graph: 'graph.json',
  /** Shop/commerce DNA — the collection behind a brand's shop. */
  commerce: 'commerce.json',
  /** Which `assets/skills/*.md` apply to which route / flow (`skills/v1`). */
  skills: 'skills.json',
  /** Article/visual registry the wrapper resolves `Visual` ids against. */
  visuals: 'visuals.json',
  /**
   * The workspace's PREFERRED generation settings (`generation/v1`) — the house
   * style every generation starts from, below the project's and the session's.
   *
   * A workspace-level file rather than a Brand field because it is about how
   * this workspace MAKES things (narrate, subtitle, music, cut rhythm), not
   * about what the brand looks or sounds like — the narration VOICE identity
   * stays brand-owned in `brand.json`. Size is deliberately not expressible
   * here; see `parsePreferredSettings`.
   */
  generation: 'generation.json',
} as const;

export type BrandFolderFileKey = keyof typeof BRAND_FOLDER_FILES;

/** Root folder holding all config/DNA JSON. */
export const BRAND_CONFIG_DIR = 'config';

/**
 * ── v11: the brand folder IS the workspace root ────────────────────────────
 *
 * `brands/{slug}/` is gone. `config/`, `meta/`, `wrapper/` and `assets/` sit at
 * the workspace root, and the brand's media merges into the same `assets/` that
 * until now held only fonts.
 *
 * Checked against live data before the move rather than assumed: 0 of 18
 * workspaces served more than one site, and every workspace carrying a second
 * `Brand` row held scaffold residue — no site.json, no project, no item. The
 * slug in the path was a level of nesting that never once branched, and it was
 * not free: 125 call sites each had to know the layout, which is how the
 * "single source of truth" this module claims became fiction.
 *
 * **The `slug` parameter is accepted and ignored.** Removing it would mean
 * editing 125 call sites in the same commit that moves the data, and a compile
 * error at every one is a worse failure mode than a dead argument. It is
 * optional, so new callers omit it; passing one is harmless and means nothing.
 * Drop the arguments opportunistically, never in a flag-day sweep.
 */
export function getBrandFolder(_slug?: string): string {
  return '';
}

/** The config folder (`config/`). */
export function getBrandConfigFolder(_slug?: string): string {
  return BRAND_CONFIG_DIR;
}

/**
 * Path to a config file (`config/{file}`).
 *
 * Overloaded so the existing `getBrandFilePath(slug, 'brand')` and the honest
 * v11 `getBrandFilePath('brand')` both resolve — see the note above on why the
 * old form stays callable.
 */
export function getBrandFilePath(key: BrandFolderFileKey): string;
export function getBrandFilePath(slug: string | null | undefined, key: BrandFolderFileKey): string;
export function getBrandFilePath(a: string | null | undefined, b?: BrandFolderFileKey): string {
  const key = (b ?? a) as BrandFolderFileKey;
  return `${BRAND_CONFIG_DIR}/${BRAND_FOLDER_FILES[key]}`;
}

/**
 * Escape hatch for a config file with no key of its own.
 *
 * Deliberately provided: without one, a caller whose file is not in
 * `BRAND_FOLDER_FILES` spells `config/x.json` by hand and the layout leaks out
 * of this module again. Prefer adding a key; use this when the filename is
 * genuinely dynamic. Overloaded like `getBrandFilePath`.
 */
export function getBrandConfigPath(filename: string): string;
export function getBrandConfigPath(slug: string | null | undefined, filename: string): string;
export function getBrandConfigPath(a: string | null | undefined, b?: string): string {
  return `${BRAND_CONFIG_DIR}/${b ?? a}`;
}

/**
 * The assets folder (`assets/`).
 *
 * This is the merge the flatten performs: the root `assets/` that held only
 * `fonts/` now also holds the kit. One folder, so a font and a product shot are
 * addressed the same way.
 */
export function getBrandAssetsFolder(_slug?: string): string {
  return WS_ASSETS;
}

/** Path to a specific binary asset file (logo, wordmark, etc.). */
export function getBrandAssetPath(filename: string): string;
export function getBrandAssetPath(slug: string | null | undefined, filename: string): string;
export function getBrandAssetPath(a: string | null | undefined, b?: string): string {
  return `${WS_ASSETS}/${b ?? a}`;
}

// ── wrapper/ — brand-site surface (R2 documents, no DB row) ────────────────

/**
 * Root folder holding everything the external site
 * wrapper renders: `site.json` (site/v1 — sitemap, nav, sections) plus
 * optional per-page authored content under `pages/`. Kept OUT of `config/`
 * (which is DNA the render pipeline reads) — the wrapper surface is a
 * consumer-facing artifact with its own lifecycle: authored here, synced
 * with `ws push`, frozen into the release manifest (`manifest.site`) on
 * publish, and served by brain's `GET /v1/agent/:id/site`.
 */
export const BRAND_WRAPPER_DIR = 'wrapper';

/** Canonical file names inside `wrapper/`. Keep COMPLETE — see
 *  the note on `BRAND_FOLDER_FILES`. */
export const BRAND_WRAPPER_FILES = {
  site: 'site.json',
  /** Site-skill prose injected into the wrapper chat agent's system prompt. */
  skill: 'skill.md',
  /**
   * Contact details the site links to but does not PRINT — today a WhatsApp
   * number. Separate from `site.json` because site.json is the public sitemap:
   * it is frozen into the release manifest and served verbatim by brain's
   * `GET /v1/agent/:id/site`, so anything in it is readable by anyone. This
   * file is only ever read server-side (`wrapper/` is not in the `/api/asset`
   * allowlist), which is what lets a phone number ride the workspace.
   */
  contact: 'contact.json',
  /**
   * booking/v1 — working hours, meeting length, buffers and the copy the
   * booking section renders (`@syvon/booking`). Server-read only, like
   * `contact.json` beside it, but for a different reason: nothing in it is
   * secret, yet a public listing of when the owner is free is a fact about
   * their week that belongs to them. The Google refresh token that makes the
   * calendar readable is NOT here — it is deployment env (BOOKING_ACCOUNTS),
   * because this file ships to R2 and to every checkout.
   */
  booking: 'booking.json',
  /** Per-slot default media the comp routes fall back to. */
  slotDefaults: 'slot-defaults.json',
  /**
   * scroll/v1 — the chat-only surface (`apps/scroll`): which agent and
   * workflow answer there, the prompt starters, the idle channel.
   *
   * Deliberately NOT a section of `site.json`. That file describes the
   * BROCHURE, and the two answers diverge — blackcodex serves no chat on its
   * website and still narrates on its scroll. Folding this in would make
   * `chat.surface: "none"`, a fact about the website, silently switch off a
   * different app. Public, like site.json: it names a published agent id,
   * which is public-by-id on the brain, and never a key.
   */
  scroll: 'scroll.json',
} as const;

export type BrandWrapperFileKey = keyof typeof BRAND_WRAPPER_FILES;

/** Subfolder under `wrapper/` holding per-page authored content (MDX). */
export const BRAND_WRAPPER_PAGES_DIR = 'pages';

/** The wrapper folder (`wrapper/`). */
export function getBrandWrapperFolder(_slug?: string): string {
  return BRAND_WRAPPER_DIR;
}

/** Path to a specific file inside the wrapper folder. */
export function getBrandWrapperFilePath(key: BrandWrapperFileKey): string;
export function getBrandWrapperFilePath(slug: string | null | undefined, key: BrandWrapperFileKey): string;
export function getBrandWrapperFilePath(a: string | null | undefined, b?: BrandWrapperFileKey): string {
  const key = (b ?? a) as BrandWrapperFileKey;
  return `${BRAND_WRAPPER_DIR}/${BRAND_WRAPPER_FILES[key]}`;
}

/** Escape hatch for a wrapper file with no key — see `getBrandConfigPath`. */
export function getBrandWrapperPath(filename: string): string;
export function getBrandWrapperPath(slug: string | null | undefined, filename: string): string;
export function getBrandWrapperPath(a: string | null | undefined, b?: string): string {
  return `${BRAND_WRAPPER_DIR}/${b ?? a}`;
}

/** The wrapper pages folder (`wrapper/pages/`). */
export function getBrandWrapperPagesFolder(_slug?: string): string {
  return `${BRAND_WRAPPER_DIR}/${BRAND_WRAPPER_PAGES_DIR}`;
}

/** Path to a page-content file (`wrapper/pages/{filename}`). */
export function getBrandWrapperPagePath(filename: string): string;
export function getBrandWrapperPagePath(slug: string | null | undefined, filename: string): string;
export function getBrandWrapperPagePath(a: string | null | undefined, b?: string): string {
  return `${BRAND_WRAPPER_DIR}/${BRAND_WRAPPER_PAGES_DIR}/${b ?? a}`;
}

/** Subfolder under `wrapper/` holding authored site sections (`.react`). */
export const BRAND_WRAPPER_SECTIONS_DIR = 'sections';

/** The wrapper sections folder (`wrapper/sections/`). */
export function getBrandWrapperSectionsFolder(_slug?: string): string {
  return `${BRAND_WRAPPER_DIR}/${BRAND_WRAPPER_SECTIONS_DIR}`;
}

/** Path to an authored section file (`wrapper/sections/{filename}`). */
export function getBrandWrapperSectionPath(filename: string): string;
export function getBrandWrapperSectionPath(slug: string | null | undefined, filename: string): string;
export function getBrandWrapperSectionPath(a: string | null | undefined, b?: string): string {
  return `${BRAND_WRAPPER_DIR}/${BRAND_WRAPPER_SECTIONS_DIR}/${b ?? a}`;
}

// ── meta/ — prose brain (R2 documents, no DB row) ─────────────────────────

/** Root folder holding the human-authored prose brain. */
export const BRAND_META_DIR = 'meta';

/**
 * Canonical file names inside `brands/{slug}/meta/`, mirroring the reference
 * instantiation `ChannelContent/_templateMaster/meta/` (verified 2026-06-15).
 * The folder is OPEN — extra `.md` files are allowed and ignored by typed
 * accessors; these are the names the compile + agents read by key. Prose is
 * human-authored, never generated (the moat) — which is why `world.md` is no
 * longer one of them. It was reserved here as a split file (human frontmatter,
 * body compiled by the world-context skill) before that skill existed; now that
 * it does, the bible is agent-authored end to end and lives beside the machine
 * contract and the reference images it describes, in `assets/world/`. See
 * `getWorldBiblePath`. A brand that still carries a hand-written `meta/world.md`
 * keeps it — the folder is open — it simply has no typed accessor.
 */
export const BRAND_META_FILES = {
  voice: 'voice.md',
  strategy: 'strategy.md',
  targetProfile: 'target-profile.md',
  patterns: 'patterns.md',
  reelsStrategy: 'reels-strategy.md',
  status: 'status.md',
  learnings: 'learnings.md',
  // The brand's visual language as a semiotic system — what each sign means,
  // how they combine, and the inventory they are built from. A grounding doc
  // like voice/strategy: read by readBrandMeta into chat + generation so a
  // composition decision is led by the same brief that leads every line of
  // copy. See meta/design.md in any built-out brand for the four-section shape.
  design: 'design.md',
  // WHAT THE BRAND SELLS, in prose. The facts already exist as data —
  // `config/commerce.json` wires the shop, `assets/catalogs/<c>/index.json`
  // holds extracted names, sizes and prices, `assets/products/` holds the
  // packshots — and none of it says what a product IS, who buys it, what may
  // be claimed about it or what must never be. Without this an agent writing
  // an ad reads the voice and the design language and then invents the
  // product. Human-authored like voice/strategy; a draft from the commerce
  // data is a proposal, not the doc.
  product: 'product.md',
  // The brand's sonic identity — recognition spine, variation engine, world
  // states. Agent-authored end to end by the `syvon-sonic-world` skill (like
  // the world bible, and unlike the human-authored prose above — the "never
  // generated" rule predates the agent-authored bibles). Read as ambient
  // context so music/SFX/voice generations obey the same laws everywhere.
  sonicWorld: 'sonic-world.md',
} as const;

export type BrandMetaFileKey = keyof typeof BRAND_META_FILES;

/** The meta folder (`meta/`). */
export function getBrandMetaFolder(_slug?: string): string {
  return BRAND_META_DIR;
}

/** Path to a specific prose file inside the meta folder. */
export function getBrandMetaFilePath(key: BrandMetaFileKey): string;
export function getBrandMetaFilePath(slug: string | null | undefined, key: BrandMetaFileKey): string;
export function getBrandMetaFilePath(a: string | null | undefined, b?: BrandMetaFileKey): string {
  const key = (b ?? a) as BrandMetaFileKey;
  return `${BRAND_META_DIR}/${BRAND_META_FILES[key]}`;
}

// ── assets/ — the kit (R2 file + BrandItem row each) ──────────────────────

/**
 * The 14 authored TOP-LEVEL kit primitives, ordered per `brand-system.md`. Most
 * are the folders in `ChannelContent/_templateMaster/assets/`; `drafts`,
 * `notes` and `world` were added after that template master and have no
 * `_templateMaster` seed of their own — their `BRAND_KIT_DEFAULTS` entry is
 * authored here instead of copied. A file in one of these is a curated,
 * human-chosen reference (never generated).
 *
 * `bg` USED TO BE HERE and now lives at `imagery/bg` — see
 * `BRAND_KIT_SUBFOLDERS`. A background is a picture, and a top level a person
 * has to learn before filing anything should be as short as it can be. The old
 * flat location still resolves everywhere, permanently.
 *
 * `world` is the deliberate exception, and it is one of KIND rather than of
 * discipline. The other primitives hold material a person chose; `world/` holds
 * the world itself — `world.json` (the `world-context/v1` contract), `world.md`
 * (its human bible) and the context-library images the bible's `refs[]` name,
 * which are generated once and then reused as the reference for every later
 * shot. They are a curated set by the time anything reads them; what makes them
 * belong together is that they are ONE artifact split across files, and the
 * schema resolves `refs[].asset` as a bare filename against the folder its
 * `world.json` sits in. Splitting the contract into `config/` and the pictures
 * into `imagery/` would break that resolution and hide the relationship.
 */
export const BRAND_KIT_PRIMITIVES = [
  'logos',
  'avatar',
  'imagery',
  'graphics',
  'video',
  'audio',
  'music',
  'knowledge',
  'skills',
  'products',
  'work',
  'drafts',
  'notes',
  'world',
] as const;

export type BrandKitPrimitive = (typeof BRAND_KIT_PRIMITIVES)[number];

/**
 * KIT FOLDERS THAT LIVE INSIDE A PRIMITIVE.
 *
 * `bg/` used to sit at the top level beside `imagery/`, and the two were
 * siblings describing the same substance at different jobs — a background IS a
 * picture. Fifteen top-level folders is also a taxonomy a person has to learn
 * before they can file anything, and the one thing every brand wants to add
 * more of is pictures. So backgrounds nest, and the top level stays short
 * enough to be exhaustive.
 *
 * This is a canonical PLACE, not a closed set. A brand may put anything under
 * `imagery/` — `imagery/trucks`, `imagery/textures`, `imagery/2026-campaign` —
 * and the resolver reads it (`assetRoleOfPath`, `MEDIA_SLOT_FOLDER_ORDER` by
 * prefix). What is canonical about this one is only that the seeder creates it
 * and `BRAND_KIT_SUBFOLDER_DEFAULTS` gives it a `_folder.json`.
 *
 * THE OLD LOCATION IS NOT AN ERROR. `assets/bg/` is still read, permanently —
 * see `MEDIA_SLOT_FOLDER_ORDER`. Workspaces that never migrate keep working.
 */
export const BRAND_KIT_SUBFOLDERS = {
  bg: 'imagery/bg',
} as const;

export type BrandKitSubfolder = keyof typeof BRAND_KIT_SUBFOLDERS;

/** Where backgrounds live now, and where they used to. Both resolve. */
export const BRAND_BG_FOLDER = BRAND_KIT_SUBFOLDERS.bg;
export const BRAND_BG_FOLDER_LEGACY = 'bg';

/**
 * The runtime upload inbox — where user drops (go paperclip / studio upload)
 * land before promotion into a kit primitive. NOT a kit primitive: it is not
 * in the authored template and carries no seed sidecar.
 */
export const BRAND_UPLOADS_FOLDER = 'uploads';

/**
 * The shared component library — `assets/react/`, shown as **Components**.
 *
 * NOT a kit primitive either: a `.react` is authored code, not a curated
 * reference file, so it has no template seed and no `BRAND_KIT_DEFAULTS` role.
 * It belongs in this list all the same, because everything DERIVED from the
 * folder name is what it was missing: the Assets grid had no card for it, so a
 * component written to the canonical path was invisible in the app that told
 * the agent to put it there. Resolving is not the same as being findable.
 */
export const BRAND_COMPONENTS_FOLDER = 'react';

/**
 * The ComfyUI workflow library — `assets/comfy/`, holding API-format exports
 * (`Workflow → Export (API)`) the `comfy_run` tool submits to a local ComfyUI.
 *
 * Here for the same reason `react/` is, and it is the same mistake waiting to
 * be made: a workflow is a GENERATOR, not a deliverable — a portrait pipeline
 * gets run again next month, the way a component gets embedded again. One
 * buried in `projects/{slug}/` still runs, which is exactly why it goes wrong
 * quietly: nothing errors, the render is fine, and the pipeline is invisible to
 * every other project until someone rebuilds it. Resolving is not the same as
 * being findable.
 *
 * The RENDERS go the other way — `projects/{slug}/output/`, with every other
 * render, because those are the deliverable.
 *
 * Not a kit primitive: an API-format graph is authored machinery, not a curated
 * reference file, so it has no template seed and no `BRAND_KIT_DEFAULTS` role.
 */
export const BRAND_COMFY_FOLDER = 'comfy';

/**
 * The inbox plus the 14 primitives — the folders a brand kit is SUPPOSED to
 * have. Path-is-truth still holds: a `BrandItem`'s `assets/`-relative segment
 * equals its `folder`.
 *
 * ── This is an INTENT, not a guarantee. Do not narrow a type on it. ─────────
 *
 * The comment here used to say `folder` ∈ this set. Nothing enforces that at
 * write time, and live data disagrees on both axes:
 *
 *   NESTING       `folder` is a PATH, not a single segment. Real values run
 *                 several levels deep (`imagery/Trucks`,
 *                 `knowledge/codex/ideas`). Selection is prefix matching
 *                 (`folderUnderAny`), which is what makes nesting work at all.
 *   MEMBERSHIP    Folders outside this set carry real content today — saturn
 *                 `brand/` (13), syvon `agents/ context/ logo/ signal/
 *                 visuals/`, renaudfutterer `codex/ ideas/ pages/`. They load;
 *                 what they lose is everything DERIVED from the folder name
 *                 (`BRAND_KIT_DEFAULTS` role and defaultUse, the brand-kit UI,
 *                 the context-map classifier).
 *
 * So: read the FIRST SEGMENT against this set, treat a miss as off-taxonomy to
 * report rather than a case that cannot happen, and never assume the whole
 * `folder` is one of these strings. `ws heal-context` reports the drift as
 * `ctx.off-taxonomy-folder`.
 */
export const BRAND_ASSET_FOLDERS = [
  BRAND_UPLOADS_FOLDER,
  BRAND_COMPONENTS_FOLDER,
  BRAND_COMFY_FOLDER,
  ...BRAND_KIT_PRIMITIVES,
] as const;

export type BrandAssetFolder = (typeof BRAND_ASSET_FOLDERS)[number];

/**
 * ANYWHERE IN THE KIT A FILE MAY BE FILED — a top-level folder or a canonical
 * nested one (`imagery/bg`).
 *
 * The type the *writers* want. `BrandAssetFolder` stays the top-level taxonomy,
 * because that is what the explorer's exhaustive `Record` is keyed by and what
 * makes forgetting a folder a compile error; a router choosing where a
 * background goes needs the wider answer.
 */
export type BrandKitDestination = BrandAssetFolder | (typeof BRAND_KIT_SUBFOLDERS)[BrandKitSubfolder];

/** True when a string names somewhere in the kit — top level or nested. */
export function isKitDestination(value: string): value is BrandKitDestination {
  return (BRAND_ASSET_FOLDERS as readonly string[]).includes(value)
    || (Object.values(BRAND_KIT_SUBFOLDERS) as readonly string[]).includes(value);
}

/**
 * A kit/inbox folder (`assets/{folder}/`).
 *
 * Takes a `BrandKitDestination` rather than a `BrandAssetFolder` — a nested
 * canonical folder (`imagery/bg`) is somewhere a file legitimately goes, and
 * the join is the same either way.
 */
export function getBrandAssetFolder(folder: BrandKitDestination): string;
export function getBrandAssetFolder(slug: string | null | undefined, folder: BrandKitDestination): string;
export function getBrandAssetFolder(a: string | null | undefined, b?: BrandKitDestination): string {
  return `${WS_ASSETS}/${(b ?? a) as BrandKitDestination}`;
}

/** Path to a file inside a kit/inbox folder. */
export function getBrandAssetFilePath(folder: BrandKitDestination, filename: string): string;
export function getBrandAssetFilePath(
  slug: string | null | undefined,
  folder: BrandKitDestination,
  filename: string,
): string;
export function getBrandAssetFilePath(a: string | null | undefined, b?: string, c?: string): string {
  const [folder, filename] = c === undefined ? [a as BrandKitDestination, b!] : [b as BrandKitDestination, c];
  return `${WS_ASSETS}/${folder}/${filename}`;
}

// ── logos/ — identity marks + logo/v1 variant manifest ────────────────────

/** Manifest filename inside `assets/logos/` (`logo/v1`). Mirrors fonts. */
export const BRAND_LOGO_MANIFEST_FILE = 'manifest.json';

/**
 * Canonical single-file identity binaries historically kept at the assets
 * ROOT (read directly by name — e.g. brain `readLogoSvg`). Used as the
 * synthesis fallback when no `logos/manifest.json` is authored: `logo.svg`
 * seeds the primary/lockup, `mark.svg`→symbol, `wordmark.svg`→wordmark.
 */
export const BRAND_ROOT_LOGO_BINARIES = ['logo.svg', 'mark.svg', 'wordmark.svg'] as const;

/**
 * A bare filename STEM that names an identity mark.
 *
 * Anchored deliberately: the stem must START with a logo token and then hit a
 * separator or end. A loose `/logo|mark|wordmark/` sweeps up `market-stall.jpg`
 * ("mark") and `iconic.jpg` ("icon") and files a photograph as the brand logo.
 * `isLogoFilename` (logo-manifest.ts) and `folderForUpload` below share this so
 * "is this a mark?" has ONE answer.
 */
export const LOGO_FILENAME_STEM_RE =
  /^(?:brand[-_]?)?(?:logo(?:type)?|wordmark|lockup|combined|combo|brandmark|monogram|emblem|symbol|glyph|mark|icon|badge)(?:[-_. ].*)?$/;

/**
 * The `BrandItem.kind` an uploaded image should carry when it is an identity
 * mark — `'logo'` / `'wordmark'` / `'mark'` — or `null` when it is ordinary
 * media and the caller should keep its own kind.
 *
 * ONE classifier, because there were two and they disagreed: the MCP path and
 * the agent app's upload route each recognised marks by `.svg` basename only,
 * so a PNG logo was stored as a generic image while every reader queries
 * `kind: 'logo'`. The brand then had no logo and nothing failed to say so.
 * Format is not what makes a file a mark.
 *
 * Deliberately conservative OUTSIDE `assets/logos/`: only the exact basenames
 * count there. Inside it every file IS a mark, so the variant is read from the
 * stem the way `synthesizeLogoManifest` reads it. A loose match would file
 * `market-stall.jpg` as the brand's mark.
 */
export function brandIdentityKind(pathOrName: string): 'logo' | 'wordmark' | 'mark' | null {
  const base = pathOrName.toLowerCase();
  if (!/\.(svg|png|webp|jpe?g|avif|gif)$/.test(base)) return null;
  const stem = (base.split('/').pop() ?? base).replace(/\.[^.]+$/, '');

  if (stem === 'wordmark') return 'wordmark';
  if (stem === 'mark') return 'mark';
  if (stem === 'logo') return 'logo';

  if (/(^|\/)logos\//.test(base) && LOGO_FILENAME_STEM_RE.test(stem)) {
    if (/wordmark|logotype/.test(stem)) return 'wordmark';
    if (/symbol|glyph|icon|badge|mark/.test(stem)) return 'mark';
    return 'logo';
  }
  return null;
}

/** The logos kit folder (`assets/logos/`). */
export function getBrandLogosFolder(_slug?: string): string {
  return `${WS_ASSETS}/logos`;
}

/** The logo manifest path (`assets/logos/manifest.json`). */
export function getBrandLogoManifestPath(_slug?: string): string {
  return `${WS_ASSETS}/logos/${BRAND_LOGO_MANIFEST_FILE}`;
}

// ── assets/world/ — the world (contract + bible + context library) ─────────

/**
 * Canonical file names inside `assets/world/`.
 *
 * Both halves of one artifact, which is why they sit in the same folder rather
 * than in `config/` and `meta/` as earlier drafts of this module reserved them:
 * `world.json` is the machine contract every downstream reads, `world.md` is
 * the same world in prose plus the concept-development reasoning a person
 * reviews and steers. Everything else in the folder is a reference image the
 * contract's `refs[].asset` names by bare filename.
 */
export const BRAND_WORLD_FILES = {
  /** `world-context/v1` — the machine contract. */
  context: 'world.json',
  /** The human bible: the world in prose + the concept development. */
  bible: 'world.md',
} as const;

export type BrandWorldFileKey = keyof typeof BRAND_WORLD_FILES;

/** The world folder (`assets/world/`). */
export function getWorldFolder(_slug?: string): string {
  return `${WS_ASSETS}/world`;
}

/** The `world-context/v1` contract (`assets/world/world.json`). */
export function getWorldContextPath(_slug?: string): string {
  return `${getWorldFolder()}/${BRAND_WORLD_FILES.context}`;
}

/** The human bible (`assets/world/world.md`). */
export function getWorldBiblePath(_slug?: string): string {
  return `${getWorldFolder()}/${BRAND_WORLD_FILES.bible}`;
}

/**
 * A context-library reference image (`assets/world/{filename}`).
 *
 * Takes a BARE FILENAME on purpose — that is precisely what a `refs[].asset`
 * holds, and the schema resolves it against the folder its `world.json` sits
 * in. Passing a path here would produce something the contract cannot name.
 */
export function getWorldRefPath(filename: string): string {
  return `${getWorldFolder()}/${filename.split('/').pop() ?? filename}`;
}

/**
 * Canonical `.meta/_folder.json` seed values per kit primitive, taken verbatim
 * from `_templateMaster/assets/<primitive>/.meta/_folder.json` (verified
 * 2026-06-15). The brand-folder seed writes these so a seeded brand == a copied
 * template. `uploads` has no seed sidecar (raw inbox).
 *
 * NOTE: these `defaultUse` strings (scene-primary, scene-character, composited,
 * scene, video, work) are richer than the legacy `FolderMeta.defaultUse` union
 * in `@syvon/agent` — widening/mapping that consumer is a Phase-2 task.
 */
export const BRAND_KIT_DEFAULTS: Record<
  BrandKitPrimitive,
  { role: string; defaultUse: string }
> = {
  logos: { role: 'Identity marks', defaultUse: 'logo' },
  avatar: { role: 'The brand face', defaultUse: 'scene-character' },
  imagery: { role: 'Hero images — style + subjects', defaultUse: 'scene-primary' },
  graphics: { role: 'Icons, charts, frames, stickers', defaultUse: 'composited' },
  video: {
    role: 'B-roll, demo captures, brand films, motion reference',
    defaultUse: 'video',
  },
  audio: { role: 'SFX, drones, sonic-logo sting', defaultUse: 'audio' },
  music: { role: 'Music beds', defaultUse: 'music' },
  knowledge: { role: 'The codex — ideas, POV docs', defaultUse: 'knowledge' },
  /**
   * METHOD, not material. `knowledge/` is what the brand KNOWS; `skills/` is
   * how it WRITES — an ad-copy anatomy, a hook formula, a tone guide for chat.
   *
   * The distinction is a delivery one, not a filing preference. Knowledge is
   * selected by RELEVANCE to the question (`rankDocs`), because a question about
   * mushin should pull the mushin doc. A skill must not work that way: "how to
   * write a hook" has to be in the prompt for every ad whether or not the brief
   * mentions hooks, so skills are selected by ROUTE and by FLOW
   * (`config/skills.json`), never by prompt similarity.
   *
   * They ride the existing `soulFiles` channel into the director prompt — the
   * same lane `workflows/{slug}/*.md` already uses. The only thing this
   * primitive adds is a BRAND-level home, so one guide serves every flow
   * instead of being copied into each folder and drifting.
   */
  skills: { role: 'How this brand writes — method docs', defaultUse: 'method' },
  products: { role: 'Packshots / interface — exact-look refs', defaultUse: 'scene' },
  work: { role: 'Case studies, proof', defaultUse: 'work' },
  drafts: { role: 'Work in progress — unfinished cuts, WIP boards', defaultUse: 'draft' },
  /**
   * The world — `world.json` + `world.md` + the context library they describe.
   * `defaultUse: 'reference'` because that is what these images ARE downstream:
   * a character or location plate handed to `generate_image` as a
   * `referenceImagePaths` anchor, not a scene element composited into a frame.
   */
  world: { role: 'The world — bible, context library', defaultUse: 'reference' },
  notes: { role: 'Quick scraps — unstructured, unlike the curated knowledge codex', defaultUse: 'note' },
};

/**
 * Seeds for the nested kit folders (`BRAND_KIT_SUBFOLDERS`) — same shape as
 * `BRAND_KIT_DEFAULTS`, keyed by the subfolder rather than by a primitive, so
 * `imagery/bg` gets the `_folder.json` that tells every later reader what it
 * holds.
 */
export const BRAND_KIT_SUBFOLDER_DEFAULTS: Record<
  BrandKitSubfolder,
  { role: string; defaultUse: string }
> = {
  bg: { role: 'Backgrounds — mood, texture, motion', defaultUse: 'background' },
};

// ── .meta/ — folder + file sidecars (folder-meta/v1, file-meta/v1) ────────

/** Sidecar subfolder inside each `assets/{folder}/`. */
export const BRAND_ASSET_SIDECAR_DIR = '.meta';

/** Folder-level sidecar filename (`folder-meta/v1`). */
export const BRAND_FOLDER_SIDECAR_FILE = '_folder.json';

/** A folder's sidecar dir (`assets/{folder}/.meta/`). */
export function getBrandAssetSidecarFolder(folder: BrandKitDestination): string;
export function getBrandAssetSidecarFolder(slug: string | null | undefined, folder: BrandKitDestination): string;
export function getBrandAssetSidecarFolder(a: string | null | undefined, b?: BrandKitDestination): string {
  return `${WS_ASSETS}/${(b ?? a) as BrandKitDestination}/${BRAND_ASSET_SIDECAR_DIR}`;
}

/** A folder's `_folder.json` sidecar path (`folder-meta/v1`). */
export function getBrandFolderSidecarPath(folder: BrandKitDestination): string;
export function getBrandFolderSidecarPath(slug: string | null | undefined, folder: BrandKitDestination): string;
export function getBrandFolderSidecarPath(a: string | null | undefined, b?: BrandKitDestination): string {
  const folder = (b ?? a) as BrandKitDestination;
  return `${WS_ASSETS}/${folder}/${BRAND_ASSET_SIDECAR_DIR}/${BRAND_FOLDER_SIDECAR_FILE}`;
}

/**
 * Get a single asset's sidecar path (`file-meta/v1`). Convention is
 * `.meta/<filename>.json` with the FULL filename incl. extension, matching
 * `@syvon/agent`'s `metaSidecarPath` + `@syvon/workspace-sync`'s runner.
 */
export function getBrandFileSidecarPath(folder: BrandAssetFolder, filename: string): string;
export function getBrandFileSidecarPath(
  slug: string | null | undefined,
  folder: BrandAssetFolder,
  filename: string,
): string;
export function getBrandFileSidecarPath(a: string | null | undefined, b?: string, c?: string): string {
  const [folder, filename] = c === undefined ? [a as BrandAssetFolder, b!] : [b as BrandAssetFolder, c];
  return `${WS_ASSETS}/${folder}/${BRAND_ASSET_SIDECAR_DIR}/${filename}.json`;
}

/**
 * Decide the brand assets/ subfolder a freshly-uploaded file should land in,
 * from its kind + filename. Returns '' to KEEP a primary identity binary at the
 * assets root (logo.svg / mark.svg / wordmark.svg — readLogoSvg reads them there).
 * Returns 'uploads' as the safe fallback (the runtime inbox) for anything we
 * can't confidently place (fonts, unknown types). Folder decisions here are
 * filename/kind based — NO model call — so the upload path stays fast.
 */
export function folderForUpload(
  kind: import('./defaults/structure-v7').ProjectItemKind,
  filename: string,
): BrandAssetFolder | 'uploads' | '' {
  const lower = filename.toLowerCase();
  const base = lower.replace(/\.[^.]+$/, '');

  // Primary identity binaries stay at assets root — but ONLY as SVG. The root
  // is read by name through BRAND_ROOT_LOGO_BINARIES / readLogoSvg, both
  // svg-only, so a `logo.png` parked there is invisible to every reader. Raster
  // marks fall through to logos/, where the manifest classifies them.
  if (lower.endsWith('.svg') && (base === 'logo' || base === 'mark' || base === 'wordmark')) return '';

  switch (kind) {
    case 'image': {
      if (lower.endsWith('.svg')) {
        return /logo|mark|wordmark/.test(base) ? 'logos' : 'graphics';
      }
      // A raster identity mark is still an identity mark. This used to fall
      // straight through to 'imagery', where no logo reader looks — so an
      // uploaded PNG logo was stored and then invisible. Anchored stem match
      // (not the loose SVG test above) so `market-stall.jpg` stays imagery.
      return LOGO_FILENAME_STEM_RE.test(base) ? 'logos' : 'imagery';
    }
    case 'video': return 'video';
    case 'font': return 'uploads';
    case 'other': {
      // Handle audio, docs, and truly unknown files based on extension
      if (/\.(mp3|wav|aac|ogg|flac|m4a|wma)$/i.test(lower)) {
        return 'audio';
      }
      if (/\.(pdf|md|txt|doc|docx|xls|xlsx|ppt|pptx)$/i.test(lower)) {
        return 'knowledge';
      }
      return 'uploads';
    }
    case 'dsgn':
    case 'comp':
    case 'react':
    default:
      return 'uploads';
  }
}

/**
 * Ordered list of `brands/{slug}/config/{file}` paths a reader should try for a
 * given DNA file, in priority order:
 *
 *   1. Active brand's own file (`brands/{activeSlug}/config/{file}`)
 *   2. Workspace default brand's file (`brands/{defaultSlug}/config/{file}`)
 *
 * When `activeSlug === defaultSlug`, returns a single-path list (no
 * duplicate read). When `defaultSlug` is null/undefined (workspace has
 * no brands yet — `Workspace.defaultBrandId IS NULL`), returns only the
 * active slug's path (or an empty list when `activeSlug` is also
 * missing; caller uses built-ins).
 *
 * Every brand is seeded self-sufficient, so in steady state the first
 * read hits. The fallback exists for partial-write / migration /
 * post-reassignment states.
 */
export function resolveBrandFileCandidates(
  _activeSlug: string | null | undefined,
  _defaultSlug: string | null | undefined,
  key: BrandFolderFileKey,
): string[] {
  // v11: active and default brand address the SAME file, so the ordered list
  // collapses to one path. Kept as a list (and with its arguments) because ~20
  // callers loop over it; returning a single-element array keeps every one of
  // them correct with no edit, and a caller that finds nothing at `config/`
  // has genuinely found nothing rather than needing a second try.
  return [getBrandFilePath(key)];
}

/** All paths for one Brand folder — convenient for ensure / seed / migrate. */
export interface BrandFolderPaths {
  root: string;
  config: string;
  brand: string;
  designTokens: string;
  textStyles: string;
  figmaTokens: string;
  animation: string;
  graph: string;
  world: string;
  wrapper: string;
  site: string;
  meta: string;
  assets: string;
}

export function getBrandFolderPaths(_slug?: string): BrandFolderPaths {
  return {
    root: getBrandFolder(),
    config: getBrandConfigFolder(),
    brand: getBrandFilePath('brand'),
    designTokens: getBrandFilePath('designTokens'),
    textStyles: getBrandFilePath('textStyles'),
    figmaTokens: getBrandFilePath('figmaTokens'),
    animation: getBrandFilePath('animation'),
    graph: getBrandFilePath('graph'),
    world: getWorldContextPath(),
    wrapper: getBrandWrapperFolder(),
    site: getBrandWrapperFilePath('site'),
    meta: getBrandMetaFolder(),
    assets: getBrandAssetsFolder(),
  };
}
