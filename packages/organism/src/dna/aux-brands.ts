/**
 * aux-brands/v1 — the workspace's DEFAULT brand is the root; `brands/` holds
 * the auxiliary ones.
 *
 * ── This is not the v8.6 `brands/{slug}/` that v11 removed ────────────────
 *
 * v8.6 nested THE workspace's one brand under `brands/{slug}/`, so the slug was
 * a fork in the path that never branched — that is what v11 collapsed into the
 * root (`brand-folder-paths.ts` documents it, and every builder there still
 * accepts a slug and ignores it). Nothing here reopens that: `config/` remains
 * the workspace's own brand, and `getBrandFilePath` still answers `config/…`
 * for it.
 *
 * What this adds is the case that folder was never covering. A catalog-style
 * workspace holds SEVERAL brands, and a workspace doing client work holds one
 * per client. Those are not "the workspace's brand"; they are brands the
 * workspace keeps around to dress work in. They live in `brands/{slug}/`, each
 * a self-sufficient folder satisfying exactly the contract a theme root does —
 * `config/design-tokens.json` and friends, `assets/` beside them — so every
 * reader that can serve a workspace root can serve one with no new code.
 *
 * The catalog workspace already had this folder and Studio's theme override
 * already read it (`ThemeOverrideDropdown` lists `brands/*` as "own brands").
 * This module is that shape written down once, so the rest of the system stops
 * hard-coding the string `'brands'` and starts agreeing on what a nested brand
 * is called.
 *
 * ── Addressing: `workspace.brand` ─────────────────────────────────────────
 *
 *   `catalog`          → the catalog workspace's own (root) brand
 *   `catalog.default`  → the same thing, said explicitly
 *   `catalog.cipher`   → `brands/cipher/` inside the catalog workspace
 *   `cipher`           → this workspace's `brands/cipher/`, else the `cipher`
 *                        workspace's root brand (see `resolveAuxBrandPath`
 *                        callers — nearest wins)
 *
 * `default` is reserved for "the root brand" and is why it is not a legal
 * auxiliary slug: a `brands/default/` folder would be addressable only as
 * `ws.default`, which already means something else.
 */

import { WS_BRANDS, WS_WRAPPER } from '../workspace-config';
import { BRAND_CONFIG_DIR, DEFAULT_BRAND_SLUG } from './brand-folder-paths';

/** The folder holding auxiliary brands, relative to a workspace root. */
export const AUX_BRANDS_DIR = WS_BRANDS;

/**
 * The brand name that means "the workspace's own, at the root".
 *
 * Reserved: `brands/default/` is not addressable, because `ws.default` already
 * resolves to the root brand. `isAuxBrandSlug` rejects it for that reason.
 */
export const ROOT_BRAND_NAME = 'default';

/** Folder names an auxiliary brand may take — the same charset as a workspace. */
const AUX_SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/** True when `slug` is a usable auxiliary brand folder name. */
export function isAuxBrandSlug(slug: string | null | undefined): boolean {
  if (!slug) return false;
  const s = slug.trim().toLowerCase();
  return s !== ROOT_BRAND_NAME && AUX_SLUG_RE.test(s);
}

/** `brands/` — workspace-relative. */
export function getAuxBrandsFolder(): string {
  return AUX_BRANDS_DIR;
}

/** `brands/{slug}` — workspace-relative. */
export function getAuxBrandFolder(slug: string): string {
  return `${AUX_BRANDS_DIR}/${slug}`;
}

/** `brands/{slug}/config` — workspace-relative. */
export function getAuxBrandConfigFolder(slug: string): string {
  return `${getAuxBrandFolder(slug)}/${BRAND_CONFIG_DIR}`;
}

/**
 * The workspace-relative folder a brand's DNA is served from.
 *
 * `null` / `'default'` → `''` (the workspace root itself, where `config/` is);
 * anything else → `brands/{slug}`. The empty string is deliberate: callers
 * join it onto an absolute root, and joining `''` is the no-op that keeps the
 * root brand and an auxiliary one on ONE code path.
 */
export function resolveAuxBrandPath(brand: string | null | undefined): string {
  if (!brand) return '';
  const s = brand.trim().toLowerCase();
  if (!s || s === ROOT_BRAND_NAME) return '';
  return getAuxBrandFolder(s);
}

/**
 * Join a brand's relative folder onto an absolute workspace root, preserving
 * the root's own separator (Windows checkouts are `\`, R2 keys are `/`).
 * Returns the root unchanged for the default brand.
 */
export function joinAuxBrandRoot(workspaceRoot: string, brand: string | null | undefined): string {
  const rel = resolveAuxBrandPath(brand);
  if (!rel) return workspaceRoot;
  const sep = workspaceRoot.includes('\\') ? '\\' : '/';
  return workspaceRoot.replace(/[\\/]+$/, '') + sep + rel.split('/').join(sep);
}

/* ── An auxiliary brand, or residue from an unfinished flatten? ──────────── */

/**
 * The verdict for one `brands/{slug}/` folder.
 *
 *   aux         a theme root a `@brand` declaration can wear
 *   incomplete  well-named, but no `config/design-tokens.json` — nothing to wear yet
 *   residue     the v8.6 layout left behind; `ws flatten`'s to empty, health's to flag
 *
 * `slug` is `''` for files loose directly under `brands/`.
 */
export type BrandsFolderVerdict =
  | { slug: string; kind: 'aux' }
  | { slug: string; kind: 'incomplete'; reason: string }
  | { slug: string; kind: 'residue'; reason: string };

export interface BrandsFolderFacts {
  /** Workspace-relative keys (`config/…`, `brands/x/…`) — no `workspaces/{id}/` prefix. */
  keys: readonly string[];
  /**
   * Every name the workspace's OWN brand goes by: Brand row slugs, the workspace
   * slug, `.Syvon/workspace.json` `defaultBrandSlug` / `activeBrandSlug`. A
   * `brands/` folder carrying one of them is that brand left behind, not a
   * second brand.
   */
  ownSlugs?: readonly (string | null | undefined)[];
}

/**
 * Tell each `brands/{slug}/` folder apart: auxiliary brand or v8.6 residue.
 *
 * The two shapes are byte-for-byte alike (`brands/{slug}/config/…`), so the
 * folder alone cannot decide — the workspace around it does. Residue when ANY of:
 *   1. the root has no `config/design-tokens.json` (never flattened — whatever
 *      sits under `brands/` is still THE brand);
 *   2. the slug is not a usable aux name (`default`, uppercase, bad characters);
 *   3. the slug is one of the workspace's own names (`ownSlugs`);
 *   4. files sit loose in the brand folder, or it carries a `wrapper/` site —
 *      pre-v11 shapes an auxiliary theme root never has.
 * Otherwise `aux` with tokens, `incomplete` without.
 *
 * Pure over a key list so R2 health, the checkout lane and `ws flatten` all
 * reach the same answer.
 */
export function classifyBrandsFolders(facts: BrandsFolderFacts): BrandsFolderVerdict[] {
  const prefix = `${AUX_BRANDS_DIR}/`;
  const tokens = `${BRAND_CONFIG_DIR}/design-tokens.json`;
  const rootFlattened = facts.keys.includes(tokens);
  const own = new Set(
    [DEFAULT_BRAND_SLUG, ...(facts.ownSlugs ?? [])]
      .filter((s): s is string => typeof s === 'string' && s.trim() !== '')
      .map((s) => s.trim().toLowerCase()),
  );

  const bySlug = new Map<string, string[]>();
  let loose = 0;
  for (const key of facts.keys) {
    if (!key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    const slash = rest.indexOf('/');
    if (slash === -1) {
      if (rest) loose++;
      continue;
    }
    const slug = rest.slice(0, slash);
    const inside = bySlug.get(slug) ?? [];
    inside.push(rest.slice(slash + 1));
    bySlug.set(slug, inside);
  }

  const out: BrandsFolderVerdict[] = [];
  if (loose) {
    out.push({ slug: '', kind: 'residue', reason: `${loose} file(s) loose directly under ${prefix} — a brand is a folder` });
  }
  for (const slug of [...bySlug.keys()].sort()) {
    const inside = bySlug.get(slug)!;
    const residue = (reason: string): BrandsFolderVerdict => ({ slug, kind: 'residue', reason });
    if (!rootFlattened) {
      out.push(residue(`the workspace root has no ${tokens}, so ${prefix}${slug}/ is still the workspace's own (pre-v11) brand`));
    } else if (slug !== slug.toLowerCase() || !isAuxBrandSlug(slug)) {
      out.push(residue(`"${slug}" is not an addressable auxiliary brand name (lowercase letters, digits, hyphens; not "${ROOT_BRAND_NAME}")`));
    } else if (own.has(slug)) {
      out.push(residue(`"${slug}" is this workspace's own brand — its DNA belongs at the root`));
    } else if (inside.some(isLooseDnaFile)) {
      const file = inside.find(isLooseDnaFile);
      out.push(residue(`${prefix}${slug}/${file} sits loose in the brand folder — the pre-v11 layout; an auxiliary brand keeps files under config/, meta/ or assets/`));
    } else if (inside.some((p) => p.startsWith(`${WS_WRAPPER}/`))) {
      out.push(residue(`${prefix}${slug}/${WS_WRAPPER}/ is a site — a pre-v11 brand; an auxiliary brand is a theme root only`));
    } else if (inside.includes(tokens)) {
      out.push({ slug, kind: 'aux' });
    } else {
      out.push({ slug, kind: 'incomplete', reason: `no ${prefix}${slug}/${tokens} — a file declaring this brand has nothing to wear` });
    }
  }
  return out;
}

/**
 * A file sitting directly in `brands/{slug}/` that marks the pre-v11 layout.
 * Dotfiles (`.keep`, `.DS_Store`) are scaffold and OS noise, not DNA — counting
 * them would turn a complete auxiliary brand into residue that `ws flatten`
 * then tries to merge into the root.
 */
function isLooseDnaFile(pathInBrand: string): boolean {
  return pathInBrand !== '' && !pathInBrand.includes('/') && !pathInBrand.startsWith('.');
}

/** The auxiliary brands a workspace holds — `aux` verdicts only, sorted. */
export function listAuxBrandSlugs(facts: BrandsFolderFacts): string[] {
  return classifyBrandsFolders(facts)
    .filter((v) => v.kind === 'aux')
    .map((v) => v.slug);
}
