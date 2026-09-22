/**
 * brand-declaration-check/v1 — does the brand a file DECLARES actually exist?
 *
 * `brand-override.ts` reads a declaration and the renderers resolve it, and
 * every reader there is built to DEGRADE: a ref that does not parse, or names a
 * sub-brand with no tokens, quietly paints the file in the host brand. That is
 * the right call at render time and the wrong one at authoring time — a deck
 * built "for the client" ships in the agency's colours and nothing ever said so.
 * This is the authoring-time answer: pure, over injected I/O, so the agent's
 * `validate` and `write_file` (and anything else) reach the same verdict.
 *
 * ── What is decidable from inside ONE workspace ───────────────────────────
 *
 *   unparseable ref                         error
 *   bare `default`, `<this-ws>.default`     valid (the root brand)
 *   bare `slug`, `brands/slug/` has tokens  valid
 *   bare `slug` naming this workspace       valid (the root brand)
 *   bare `slug`, neither of the above       ERROR — see below
 *   `<this-ws>.brand`, tokens present       valid
 *   `<this-ws>.brand`, tokens missing       error
 *   `other.brand` / `other.default`         warning — cannot see `other` from here
 *
 * THE BARE-SLUG CHOICE. A bare `slug` may also mean "the workspace named slug's
 * root brand", and a tool context holds one workspace — there is no directory of
 * workspaces to ask (no such API exists, and inventing one here would be a
 * guess). So a bare name that is neither a local sub-brand nor this workspace is
 * reported as an ERROR, not waved through as "maybe foreign": the bare form's
 * whole resolution rule is "nearest wins", and nothing near answers. The fix is
 * cheap and permanent — the message says to write `slug.default`, which is the
 * unambiguous spelling of the cross-workspace reading and downgrades to the
 * foreign-workspace WARNING. A validator that passed every typo'd sub-brand on
 * the theory that it might be someone else's workspace would never fail anything.
 *
 * THIS WORKSPACE'S NAME is passed in (`workspaceSlugs`) because the tool context
 * does not carry it reliably. When it is unknown, a dotted ref is still honoured
 * when the sub-brand exists locally — the same leniency
 * `resolveLocalBrandOverride` applies, for the same reason.
 *
 * ── Embeds ────────────────────────────────────────────────────────────────
 *
 * A page inside a deck honours its OWN `@brand`, so a bad declaration three
 * embeds down is as wrong as one at the top. `.dsgn` `<Asset src>` and `.comp`
 * item sources are followed (visited set + depth cap); a missing embed is not
 * this check's business — `review_composition` reports those.
 */

import { AUX_BRANDS_DIR, ROOT_BRAND_NAME, getAuxBrandConfigFolder, isAuxBrandSlug } from './aux-brands';
import { formatBrandOverrideRef, parseBrandOverrideRef, readFileBrandDeclaration } from './brand-override';
import { normalizeDotSegments, resolveSeqAssetPath } from '../paths';

export type BrandDeclarationSeverity = 'error' | 'warning';

export type BrandDeclarationIssueCode =
  /** The file declares a brand, and the declaration is not a ref. */
  | 'brand_ref_unparseable'
  /** The ref names a brand of THIS workspace that has no tokens. */
  | 'brand_not_found'
  /** The ref names another workspace, which this context cannot see. */
  | 'brand_unverifiable';

export interface BrandDeclarationIssue {
  severity: BrandDeclarationSeverity;
  code: BrandDeclarationIssueCode;
  /** The file carrying the declaration (the last entry of `chain`). */
  file: string;
  /** Root file first, down to `file`. Length 1 for the file itself. */
  chain: string[];
  /** The declaration as written. */
  ref: string;
  /** What is wrong, without the chain. */
  reason: string;
  /** `a.comp → b.dsgn: reason` — ready to show. */
  message: string;
}

/** Workspace access, injected so this module stays free of fs and R2. */
export interface BrandDeclarationIO {
  /** File text, or null (or a throw) when it is not there. */
  readFile(path: string): Promise<string | null> | string | null;
  /** Existence probe. Defaults to "readFile returned something". */
  exists?(path: string): Promise<boolean> | boolean;
  /** Names of the SUBFOLDERS of a workspace-relative folder. Optional — without
   *  it a not-found message cannot list the sub-brands that do exist. */
  listDirs?(path: string): Promise<readonly string[]> | readonly string[];
}

export interface BrandDeclarationCheckOptions {
  /** Every name THIS workspace goes by. Empty/absent = unknown. */
  workspaceSlugs?: readonly (string | null | undefined)[];
  /** Follow embeds (`.dsgn` assets, `.comp` items). Default true. */
  embeds?: boolean;
  /** Embed levels to follow below the root. Default 8. */
  maxDepth?: number;
}

const DEFAULT_MAX_DEPTH = 8;
const EMBED_EXT_RE = /\.(dsgn|design|react|component|comp|seq)$/i;
const EXPECTED = 'expected `slug`, `workspace.brand` or `workspace.default`';

/** `brands/{slug}/config/design-tokens.json` — what makes a sub-brand wearable. */
export function auxBrandTokensPath(slug: string): string {
  return `${getAuxBrandConfigFolder(slug)}/design-tokens.json`;
}

/** Shared state for one check run — the available-slug listing is read once. */
interface Run {
  io: BrandDeclarationIO;
  own: Set<string>;
  available?: Promise<string[] | null>;
}

async function safeRead(io: BrandDeclarationIO, path: string): Promise<string | null> {
  try {
    const text = await io.readFile(path);
    return typeof text === 'string' ? text : null;
  } catch {
    return null;
  }
}

async function exists(io: BrandDeclarationIO, path: string): Promise<boolean> {
  try {
    if (io.exists) return Boolean(await io.exists(path));
  } catch {
    return false;
  }
  return (await safeRead(io, path)) !== null;
}

/** Sub-brands that are actually wearable. Null when the folder cannot be listed. */
function availableSlugs(run: Run): Promise<string[] | null> {
  if (!run.available) {
    run.available = (async () => {
      if (!run.io.listDirs) return null;
      let names: readonly string[];
      try {
        names = await run.io.listDirs(AUX_BRANDS_DIR);
      } catch {
        return null;
      }
      const out: string[] = [];
      for (const name of [...names].sort()) {
        if (name === name.toLowerCase() && isAuxBrandSlug(name) && (await exists(run.io, auxBrandTokensPath(name)))) {
          out.push(name);
        }
      }
      return out;
    })();
  }
  return run.available;
}

async function availableNote(run: Run): Promise<string> {
  const slugs = await availableSlugs(run);
  if (slugs === null) return '';
  return slugs.length
    ? ` Available sub-brands: ${slugs.join(', ')}.`
    : ` This workspace has no sub-brands under ${AUX_BRANDS_DIR}/.`;
}

/**
 * The verdict on ONE declaration value. Null when it is fine.
 */
async function judgeRef(
  raw: unknown,
  run: Run,
): Promise<{ severity: BrandDeclarationSeverity; code: BrandDeclarationIssueCode; reason: string } | null> {
  const shown = typeof raw === 'string' ? raw.trim() : JSON.stringify(raw);
  const ref = parseBrandOverrideRef(raw);
  if (!ref) {
    return {
      severity: 'error',
      code: 'brand_ref_unparseable',
      reason:
        typeof raw === 'string'
          ? `brand ref "${shown}" does not parse; ${EXPECTED}`
          : `brand ref ${shown} does not parse — it must be a string; ${EXPECTED}`,
    };
  }

  const isOwn = run.own.has(ref.workspace);

  if (ref.local) {
    // Bare `default` is the root brand, by definition.
    if (ref.workspace === ROOT_BRAND_NAME) return null;
    // Nearest wins: this workspace's `brands/{slug}/` first…
    if (isAuxBrandSlug(ref.workspace) && (await exists(run.io, auxBrandTokensPath(ref.workspace)))) return null;
    // …then this workspace's own name.
    if (isOwn) return null;
    /*
     * NOT KNOWING IS NOT THE SAME AS KNOWING IT IS WRONG.
     *
     * `own` is empty when the caller could not determine what this workspace is
     * called — which is the ordinary case on a hosted runtime with no
     * `.Syvon/workspace.json`, not a sign that the ref is bad. Erroring here
     * turned "I cannot check this" into "this is wrong, nothing was written",
     * and blocked writes that named the workspace's own brand correctly.
     *
     * The dotted branch below has always taken this view (`unknownHere`); this
     * is the same judgement applied to the bare spelling, which is the one a
     * model actually reaches for.
     */
    if (run.own.size === 0) return null;
    return {
      severity: 'error',
      code: 'brand_not_found',
      reason:
        `brand ref "${shown}" not found — there is no ${auxBrandTokensPath(ref.workspace)} in this workspace.` +
        (await availableNote(run)) +
        ` If you meant the root brand of a workspace named "${ref.workspace}", write "${ref.workspace}.${ROOT_BRAND_NAME}".`,
    };
  }

  const unknownHere = run.own.size === 0;

  if (!ref.brand) {
    // `ws.default`
    if (isOwn) return null;
    return {
      severity: 'warning',
      code: 'brand_unverifiable',
      reason: `cannot verify brand in workspace \`${ref.workspace}\` from here ("${formatBrandOverrideRef(ref)}") — check that workspace exists; a render that cannot reach it falls back to this workspace's brand`,
    };
  }

  // `ws.brand`
  if (isOwn || unknownHere) {
    if (await exists(run.io, auxBrandTokensPath(ref.brand))) return null;
    if (isOwn) {
      return {
        severity: 'error',
        code: 'brand_not_found',
        reason:
          `brand ref "${shown}" not found — ${auxBrandTokensPath(ref.brand)} does not exist in this workspace (\`${ref.workspace}\`).` +
          (await availableNote(run)),
      };
    }
  }
  return {
    severity: 'warning',
    code: 'brand_unverifiable',
    reason: `cannot verify brand in workspace \`${ref.workspace}\` from here ("${formatBrandOverrideRef(ref)}") — check that \`${ref.brand}\` exists there; a render that cannot reach it falls back to this workspace's brand`,
  };
}

/* ── Embeds ──────────────────────────────────────────────────────────────── */

const ASSET_TAG_RE = /<Asset\b[^>]*>/g;
const SRC_ATTR_RE = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*["']([^"']*)["']\s*\})/;

function isEmbedRef(ref: string): boolean {
  if (!ref || !EMBED_EXT_RE.test(ref)) return false;
  if (ref.startsWith('@design-library/')) return false;
  if (/^(https?:|data:|blob:)/i.test(ref)) return false;
  if (ref.includes('{')) return false;
  return true;
}

function dirOf(path: string): string {
  const norm = path.replace(/\\/g, '/');
  const i = norm.lastIndexOf('/');
  return i === -1 ? '' : norm.slice(0, i);
}

/** A `.dsgn` `<Asset src>`, resolved the way `review_composition` does: `./`,
 *  `../` and bare names against the page's folder, anything else as written. */
function resolveDsgnEmbed(parent: string, src: string): string {
  const s = src.replace(/\\/g, '/');
  const dir = dirOf(parent);
  if (s.startsWith('./') || s.startsWith('../') || !s.includes('/')) {
    return normalizeDotSegments(dir ? `${dir}/${s}` : s);
  }
  return s;
}

/**
 * Workspace-relative paths of the design/component/comp files a file embeds,
 * in document order, de-duplicated. Library refs, URLs and `{param}` slots are
 * skipped — they carry no brand of their own.
 */
export function collectBrandEmbedPaths(path: string, content: string | null | undefined): string[] {
  if (!content) return [];
  const ext = path.split('.').pop()?.toLowerCase();
  const out: string[] = [];
  const push = (p: string) => {
    if (!out.includes(p)) out.push(p);
  };

  if (ext === 'dsgn' || ext === 'design') {
    for (const tag of content.match(ASSET_TAG_RE) ?? []) {
      const m = tag.match(SRC_ATTR_RE);
      const ref = (m?.[1] ?? m?.[2] ?? m?.[3] ?? '').trim();
      if (isEmbedRef(ref)) push(resolveDsgnEmbed(path, ref));
    }
    return out;
  }

  if (ext === 'comp' || ext === 'seq') {
    let doc: unknown;
    try {
      doc = JSON.parse(content);
    } catch {
      return [];
    }
    const compDir = dirOf(path);
    const take = (val: unknown) => {
      if (typeof val !== 'string') return;
      const ref = val.trim();
      if (isEmbedRef(ref)) push(resolveSeqAssetPath(compDir, ref));
    };
    const tracks = (doc as { tracks?: unknown })?.tracks;
    if (Array.isArray(tracks)) {
      for (const track of tracks) {
        const items = (track as { items?: unknown } | null)?.items;
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          const it = (item ?? {}) as Record<string, unknown>;
          take(it.source);
          take((it.inlineShot as Record<string, unknown> | undefined)?.templatePath);
          take((it.resolved as Record<string, unknown> | undefined)?.templatePath);
        }
      }
    }
    const items = (doc as { items?: unknown })?.items;
    if (Array.isArray(items)) {
      for (const item of items) take((item as Record<string, unknown> | null)?.source);
    }
  }
  return out;
}

/* ── Entry point ─────────────────────────────────────────────────────────── */

/**
 * Check the brand a file declares — and, unless `embeds: false`, the brands
 * declared by every design/component/comp it embeds, recursively.
 *
 * Never throws. An unreadable embed is skipped; a cycle is walked once.
 */
export async function checkBrandDeclarations(
  path: string,
  content: string | null | undefined,
  io: BrandDeclarationIO,
  options: BrandDeclarationCheckOptions = {},
): Promise<BrandDeclarationIssue[]> {
  const run: Run = {
    io,
    own: new Set(
      (options.workspaceSlugs ?? [])
        .filter((s): s is string => typeof s === 'string' && s.trim() !== '')
        .map((s) => s.trim().toLowerCase()),
    ),
  };
  const followEmbeds = options.embeds !== false;
  const maxDepth = Math.max(0, options.maxDepth ?? DEFAULT_MAX_DEPTH);
  const issues: BrandDeclarationIssue[] = [];
  const visited = new Set<string>();

  const visit = async (file: string, text: string | null | undefined, chain: string[]): Promise<void> => {
    const key = file.replace(/\\/g, '/').toLowerCase();
    if (visited.has(key)) return;
    visited.add(key);

    const decl = readFileBrandDeclaration(file, text);
    if (decl) {
      try {
        const verdict = await judgeRef(decl.raw, run);
        if (verdict) {
          issues.push({
            ...verdict,
            file,
            chain,
            ref: typeof decl.raw === 'string' ? decl.raw.trim() : JSON.stringify(decl.raw),
            message: `${chain.join(' → ')}: ${verdict.reason}`,
          });
        }
      } catch {
        /* a probe that blew up is not a verdict on the file */
      }
    }

    if (!followEmbeds || chain.length - 1 >= maxDepth) return;
    for (const child of collectBrandEmbedPaths(file, text)) {
      if (visited.has(child.toLowerCase())) continue;
      const childText = await safeRead(io, child);
      if (childText === null) continue; // missing embeds are review_composition's to report
      await visit(child, childText, [...chain, child]);
    }
  };

  await visit(path.replace(/\\/g, '/'), content, [path.replace(/\\/g, '/')]);
  return issues;
}
