/**
 * brand-override/v1 — the brand a SINGLE FILE wears, declared in the file.
 *
 * A workspace has one brand at its root (v11 — the brand IS the workspace) plus
 * any number of auxiliary brands under `brands/` (`aux-brands.ts`). Studio can
 * already dress the whole workspace in one of them for the session
 * (`.Syvon/workspace.json` → `themeOverride`, resolved by
 * `electron/theme-override.ts` and `features/theme-override/`). That override
 * is a MODE: workspace-wide, not saved with the work, and gone the moment you
 * point it somewhere else.
 *
 * This is the other half. A `.dsgn`, `.comp` or `.react` can NAME the brand it
 * belongs to, and that declaration travels with the file — so a deck built for
 * a client renders in the client's colours no matter what the status bar says,
 * and one workspace can hold work for several brands with no mode to remember.
 *
 * ── The ref is `workspace.brand`, never a path ────────────────────────────
 *
 * An absolute path is the obvious thing to store and the wrong one: it is
 * correct on exactly one machine, and this repo is checked out on two (the
 * theme-override cache dir exists for the same reason). A ref names things by
 * slug and is resolved at read time — so a file referencing a workspace this
 * machine does not have falls back to the host brand with a warning, rather
 * than pointing at a folder that is not there.
 *
 *   `catalog`          the catalog workspace's own (root) brand
 *   `catalog.default`  the same, said explicitly
 *   `catalog.cipher`   `brands/cipher/` inside the catalog workspace
 *   `cipher`           this workspace's `brands/cipher/`, else the `cipher`
 *                      workspace's root brand — nearest wins, and it is the
 *                      resolver that decides, not the parser
 *
 * A bare name is deliberately ambiguous at the parse layer: `{ workspace:
 * 'cipher' }` with no `brand`, and `local` true to tell the resolver it may
 * also try the current workspace's `brands/cipher/` first. Writing it out
 * dotted (`acme.cipher`) removes the ambiguity for good.
 *
 * `workspaceId` rides along when known (the cloud workspace id) so a machine
 * without the checkout can fetch the DNA the way the status-bar picker does.
 * It is a hint; the slugs are the identity.
 *
 * Wire form is ONE STRING in all three formats, because all three have a
 * different place to put it and only a string fits every one of them:
 *
 *   .dsgn   `@brand: acme.cipher` in the HTML comment header
 *   .react  `"brand": "acme.cipher"` in the `/* @syvon {…} *\/` header
 *   .comp   `"brand": "acme.cipher"` at the top level of the JSON
 *
 * With an id: `acme.cipher#cw_01h…`. Neither `#` nor a second `.` appears in a
 * slug, so the grammar stays unambiguous.
 */

import { ROOT_BRAND_NAME, isAuxBrandSlug, resolveAuxBrandPath } from './aux-brands';

/** The brand a file declares. */
export interface BrandOverrideRef {
  /** Workspace slug owning the brand. */
  workspace: string;
  /**
   * Auxiliary brand under that workspace's `brands/`. Undefined means the
   * workspace's own root brand — `.default` parses to undefined, not to the
   * literal string, so there is one representation of "the root brand".
   */
  brand?: string;
  /**
   * The ref was written bare (`cipher`, not `acme.cipher`), so `workspace` may
   * actually name an auxiliary brand of the CURRENT workspace. Resolvers try
   * that first; a dotted ref never sets this.
   */
  local?: boolean;
  /** Cloud workspace id, when the declaration was made from a known one. */
  workspaceId?: string;
}

/** Workspace slugs are folder names — the charset the directory produces. */
const WS_SLUG_RE = /^[a-z0-9][a-z0-9._-]*$/i;

/**
 * Parse the wire form. Returns null for anything unusable — absent, blank, a
 * path separator, more than one dot. Never throws: a malformed declaration
 * must degrade to "no override", not break the file.
 */
export function parseBrandOverrideRef(raw: unknown): BrandOverrideRef | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || /[/\\]/.test(trimmed)) return null;

  const hash = trimmed.indexOf('#');
  const head = (hash === -1 ? trimmed : trimmed.slice(0, hash)).trim();
  const workspaceId = hash === -1 ? '' : trimmed.slice(hash + 1).trim();
  if (!head) return null;

  const parts = head.split('.');
  if (parts.length > 2) return null;

  const workspace = parts[0].trim().toLowerCase();
  if (!workspace || !WS_SLUG_RE.test(workspace)) return null;

  if (parts.length === 1) {
    return {
      workspace,
      local: true,
      ...(workspaceId ? { workspaceId } : {}),
    };
  }

  const brand = parts[1].trim().toLowerCase();
  if (!brand) return null;
  // `.default` IS the root brand — normalise it away so `brand` is either an
  // auxiliary slug or absent, and no caller has to special-case the word.
  if (brand === ROOT_BRAND_NAME) {
    return { workspace, ...(workspaceId ? { workspaceId } : {}) };
  }
  if (!isAuxBrandSlug(brand)) return null;
  return { workspace, brand, ...(workspaceId ? { workspaceId } : {}) };
}

/**
 * Serialize to the wire form.
 *
 * A ref carrying an auxiliary brand always writes dotted. A ref that named the
 * root brand writes bare — EXCEPT when it was parsed bare (`local`), where the
 * bare form is what the author wrote and round-tripping it is the point.
 */
export function formatBrandOverrideRef(ref: BrandOverrideRef): string {
  const head = ref.brand ? `${ref.workspace}.${ref.brand}` : ref.workspace;
  return ref.workspaceId ? `${head}#${ref.workspaceId}` : head;
}

/** Human-facing label — `acme · cipher`, or just the workspace. */
export function describeBrandOverrideRef(ref: BrandOverrideRef): string {
  return ref.brand ? `${ref.workspace} · ${ref.brand}` : ref.workspace;
}

/** True when both refs name the same brand. Null-safe on both sides. */
export function sameBrandOverrideRef(
  a: BrandOverrideRef | null | undefined,
  b: BrandOverrideRef | null | undefined,
): boolean {
  if (!a || !b) return !a && !b;
  return a.workspace === b.workspace && (a.brand ?? '') === (b.brand ?? '');
}

/* ── .dsgn — the HTML comment header ─────────────────────────────────────── */

const DSGN_BRAND_RE = /^([ \t]*)@brand:[ \t]*([^\n\r]*)$/m;

/** Read `@brand` from a `.dsgn` header. Null when undeclared or malformed. */
export function readDsgnBrandOverride(content: string | null | undefined): BrandOverrideRef | null {
  if (!content) return null;
  const m = content.match(DSGN_BRAND_RE);
  return m ? parseBrandOverrideRef(m[2]) : null;
}

/**
 * Write (or clear, with `null`) `@brand` in a `.dsgn` header.
 *
 * Three cases, in order: the line already exists (replace in place, keeping its
 * indentation); a header exists but has no `@brand` (append as the header's
 * last line, so it never lands between a wrapped `@description` and its
 * continuation); no header at all (write one). Returns the content unchanged
 * when clearing a file that declares nothing.
 */
export function writeDsgnBrandOverride(content: string, ref: BrandOverrideRef | null): string {
  const existing = content.match(DSGN_BRAND_RE);
  if (existing) {
    if (!ref) {
      // Drop the whole line, including its newline, so no blank gap is left.
      return content.replace(new RegExp(`${DSGN_BRAND_RE.source}\\r?\\n?`, 'm'), '');
    }
    return content.replace(DSGN_BRAND_RE, `${existing[1]}@brand: ${formatBrandOverrideRef(ref)}`);
  }
  if (!ref) return content;

  const line = formatBrandOverrideRef(ref);
  const header = content.match(/<!--([\s\S]*?)-->/);
  if (header) {
    // Match the indentation the header's other directives already use.
    const indent = header[1].match(/^[ \t]*(?=@)/m)?.[0] ?? '  ';
    const body = header[1].replace(/\s*$/, '');
    return content.replace(header[0], `<!--${body}\n${indent}@brand: ${line}\n-->`);
  }
  return `<!--\n  @brand: ${line}\n-->\n${content}`;
}

/* ── .comp — top-level JSON field ────────────────────────────────────────── */

/** Read `brand` from a parsed `.comp` document. */
export function readCompBrandOverride(doc: unknown): BrandOverrideRef | null {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null;
  return parseBrandOverrideRef((doc as Record<string, unknown>).brand);
}

/**
 * Set (or clear, with `null`) `brand` on a parsed `.comp` document, returning a
 * new object. Key order is preserved for everything else so a save is a
 * one-line diff.
 */
export function writeCompBrandOverride(
  doc: Record<string, unknown>,
  ref: BrandOverrideRef | null,
): Record<string, unknown> {
  const next = { ...doc };
  if (ref) next.brand = formatBrandOverrideRef(ref);
  else delete next.brand;
  return next;
}

/* ── .react — `"brand"` in the `/* @syvon {…} *\/` header ────────────────── */

/** Same header `@syvon/design-engine`'s react-meta parses; repeated here because
 *  organism sits below design-engine and cannot import it. */
const REACT_HEADER_RE = /\/\*\s*@syvon\s+([\s\S]*?)\s*\*\//;

/** Read `brand` from a `.react` source's header. Null when absent or malformed. */
export function readReactBrandOverride(source: string | null | undefined): BrandOverrideRef | null {
  if (!source) return null;
  const m = source.match(REACT_HEADER_RE);
  if (!m) return null;
  try {
    const header = JSON.parse(m[1]) as unknown;
    if (!header || typeof header !== 'object' || Array.isArray(header)) return null;
    return parseBrandOverrideRef((header as Record<string, unknown>).brand);
  } catch {
    return null;
  }
}

/**
 * Write (or clear, with `null`) `brand` in a `.react` source's `@syvon` header.
 *
 * The header's other fields keep their order; a new `brand` goes last. A file
 * with no header gets one on line 1, where the contract puts it. A header that
 * is not valid JSON is left alone — rewriting it would destroy whatever the
 * author meant — so the source comes back unchanged and the caller can tell.
 */
export function writeReactBrandOverride(source: string, ref: BrandOverrideRef | null): string {
  const m = source.match(REACT_HEADER_RE);
  if (!m) {
    if (!ref) return source;
    return `/* @syvon ${JSON.stringify({ brand: formatBrandOverrideRef(ref) })} */\n${source}`;
  }
  let header: Record<string, unknown>;
  try {
    const parsed = JSON.parse(m[1]) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return source;
    header = parsed as Record<string, unknown>;
  } catch {
    return source;
  }
  if (!ref && !('brand' in header)) return source;
  const next = { ...header };
  if (ref) next.brand = formatBrandOverrideRef(ref);
  else delete next.brand;
  return source.replace(m[0], `/* @syvon ${JSON.stringify(next)} */`);
}

/**
 * Write (or clear) the brand declaration of any FormatKit file, choosing the
 * writer by extension — the counterpart of `readFileBrandOverride`.
 *
 * `.comp` content is re-serialized with two-space indentation, which is how
 * every comp writer in the repo saves. An unparseable `.comp` and an unknown
 * extension come back unchanged.
 */
export function writeFileBrandOverride(path: string, content: string, ref: BrandOverrideRef | null): string {
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext === 'dsgn') return writeDsgnBrandOverride(content, ref);
  if (ext === 'react' || ext === 'component') return writeReactBrandOverride(content, ref);
  if (ext === 'comp' || ext === 'seq') {
    try {
      const doc = JSON.parse(content) as unknown;
      if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return content;
      if (!ref && !('brand' in (doc as Record<string, unknown>))) return content;
      return JSON.stringify(writeCompBrandOverride(doc as Record<string, unknown>, ref), null, 2);
    } catch {
      return content;
    }
  }
  return content;
}

/**
 * Read the brand any file declares, choosing the reader by extension.
 *
 * The one entry point for code that holds a path and its text but not a parsed
 * document — a render bundler, an upload walker. Unknown extensions and
 * unparseable `.comp` JSON declare nothing.
 */
export function readFileBrandOverride(path: string, content: string | null | undefined): BrandOverrideRef | null {
  if (!content) return null;
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext === 'dsgn') return readDsgnBrandOverride(content);
  if (ext === 'react' || ext === 'component') return readReactBrandOverride(content);
  if (ext === 'comp' || ext === 'seq') {
    try {
      return readCompBrandOverride(JSON.parse(content));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * The declaration AS WRITTEN, before parsing — `{ raw }` when the file declares
 * a brand at all, null when it says nothing.
 *
 * The readers above return null for "undeclared" and "malformed" alike, which
 * is right for a renderer (both degrade to the host brand) and wrong for a
 * validator: a typo'd `@brand: acme/cipher` is a file that ASKED for a brand and
 * will silently not get it. This is the one place that tells the two apart.
 *
 * `raw` is whatever sits in the slot — a string, or for JSON formats possibly a
 * number/object an author put there by mistake. A `.react` whose header JSON
 * does not parse, or a `.comp` that is not JSON, declares nothing HERE: those
 * are malformed files, and other guards own that verdict.
 */
export function readFileBrandDeclaration(
  path: string,
  content: string | null | undefined,
): { raw: unknown } | null {
  if (!content) return null;
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext === 'dsgn' || ext === 'design') {
    const m = content.match(DSGN_BRAND_RE);
    return m ? { raw: m[2] } : null;
  }
  const fromObject = (doc: unknown): { raw: unknown } | null => {
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null;
    const rec = doc as Record<string, unknown>;
    return Object.prototype.hasOwnProperty.call(rec, 'brand') && rec.brand !== undefined && rec.brand !== null
      ? { raw: rec.brand }
      : null;
  };
  if (ext === 'react' || ext === 'component') {
    const m = content.match(REACT_HEADER_RE);
    if (!m) return null;
    try {
      return fromObject(JSON.parse(m[1]));
    } catch {
      return null;
    }
  }
  if (ext === 'comp' || ext === 'seq') {
    try {
      return fromObject(JSON.parse(content));
    } catch {
      return null;
    }
  }
  return null;
}

/* ── Resolution inside ONE workspace ─────────────────────────────────────── */

/**
 * Where a declared brand lives, seen from the workspace the file is in.
 *
 *   root     the workspace's own brand — nothing to override
 *   aux      `root` is the workspace-relative folder (`brands/{slug}`) to read DNA from
 *   missing  names an auxiliary brand of this workspace that has no tokens
 *   foreign  names another workspace — out of reach for a reader scoped to this one
 */
export type LocalBrandResolution =
  | { kind: 'root' }
  | { kind: 'aux'; slug: string; root: string }
  | { kind: 'missing'; slug: string }
  | { kind: 'foreign'; ref: BrandOverrideRef };

/**
 * Resolve a ref against the CURRENT workspace only — the reading a server-side
 * renderer can act on, since it holds one workspace's keys and no directory of
 * checkouts. Mirrors Studio's `resolveFileBrand` order: a bare name is this
 * workspace's `brands/{name}/` first, then (if it names this workspace) the root.
 *
 * `workspaceSlug` null means "unknown here": a dotted ref is then honoured when
 * the auxiliary brand it names exists, because refusing would make every render
 * on a host without the slug ignore every declaration.
 *
 * `hasAuxBrand(slug)` answers "does `brands/{slug}/config/design-tokens.json`
 * exist" — sync or async, so a key list and an R2 HEAD both fit.
 */
export async function resolveLocalBrandOverride(
  ref: BrandOverrideRef,
  workspaceSlug: string | null | undefined,
  hasAuxBrand: (slug: string) => boolean | Promise<boolean>,
): Promise<LocalBrandResolution> {
  const ws = workspaceSlug ? workspaceSlug.trim().toLowerCase() : null;
  const aux = async (slug: string): Promise<LocalBrandResolution> =>
    (await hasAuxBrand(slug))
      ? { kind: 'aux', slug, root: resolveAuxBrandPath(slug) }
      : { kind: 'missing', slug };

  if (ref.brand) {
    if (ws === ref.workspace) return aux(ref.brand);
    if (ws === null && isAuxBrandSlug(ref.brand) && (await hasAuxBrand(ref.brand))) {
      return { kind: 'aux', slug: ref.brand, root: resolveAuxBrandPath(ref.brand) };
    }
    return { kind: 'foreign', ref };
  }
  if (ref.local && isAuxBrandSlug(ref.workspace) && (await hasAuxBrand(ref.workspace))) {
    return { kind: 'aux', slug: ref.workspace, root: resolveAuxBrandPath(ref.workspace) };
  }
  if (ws !== null && ref.workspace === ws) return { kind: 'root' };
  return { kind: 'foreign', ref };
}
