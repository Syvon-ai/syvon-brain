/**
 * `/templates` — the REFERENCE library. The peer of `/workflows`, and its
 * opposite half.
 *
 * Two first-class roots sit at a workspace's top level, and they answer
 * different questions:
 *
 *   `workflows/{slug}/`  — PROCESS. Steps, a graph, a system prompt, exemplars
 *                          the flow owns. It is RUN (`run_workflow`/`run_flow`)
 *                          and it decides HOW a generation proceeds.
 *   `templates/{slug}/`  — REFERENCE. Real, working pieces kept to build FROM.
 *                          They are READ, COPIED, and (when a caller names one)
 *                          passed into a generation as grounding. They decide
 *                          nothing; they are what "like this one" points at.
 *
 * A curated set of real design files (`.dsgn` / `.comp` / `.react`), one folder
 * per template, described by a single `index.json` manifest. The library exists
 * at two SCOPES with identical shape — the workspace's own `templates/`
 * (`WS_TEMPLATES`, local references) and the platform's `catalog/templates/`
 * (global references, the cold-start set). `templateLibraryRoots()` is the one
 * ordered list every reader walks, and the order IS the precedence: a
 * workspace's own entry shadows the catalog's entry of the same slug.
 *
 * Organism owns the SHAPE (the manifest type, the ref grammar, the merge) and
 * the WHERE (these builders). The bytes live in the workspace / R2 — never in
 * this package.
 *
 * WRITES are narrow on purpose. Free-form `write_file` into `templates/` stays
 * blocked (folder-restriction.ts); the only way in is `save_template`, which
 * composes the key from a validated slug and keeps `index.json` in step. A
 * library whose manifest and folders can drift apart is not a library.
 *
 * Still NOT wired into workflow graphs: a workflow's own folder stays its
 * single source of truth (see `add-workflow-to-workspace.ts`). A template
 * reaches generation only when a caller names it for that one run — never by
 * being installed into a flow.
 *
 * This is the FLAT library layout (`{root}/{slug}/{file}` + a root `index.json`),
 * distinct from the deprecated versioned-collection layout
 * (`catalog/templates/{collection}/{template}/v{N}/`) whose builders live in
 * `@syvon/catalog/r2-paths` and whose library layer was removed 2026-07-31.
 */

import { parseApproval, approvalCovers, type FileApproval } from '../approval';
import {
  WS_TEMPLATES,
  WS_BRANDS,
  CATALOG_WORKSPACE_PREFIX,
  isReservedSegment,
} from '../workspace-config';

/** Manifest filename at the root of a templates library. */
export const TEMPLATES_INDEX_FILE = 'index.json';

/**
 * Schema id stamped in a templates manifest. Kept as `catalog-examples/v1` for
 * back-compat with the manifest and MCP-resource fallback already in the wild —
 * the shape is the same whichever library root it describes.
 */
export const TEMPLATE_MANIFEST_SCHEMA = 'catalog-examples/v1';

/**
 * Coarse kind of a template's primary file — plus `collection`, which is not a
 * file kind at all.
 *
 * A `collection` entry points at a PACK: its `path` is that pack's own
 * `index.json`, and the slides or components it describes live inside. The
 * presentation system (`catalog/templates/presentations`, seven layout
 * languages x ten slide roles) is one, and it has to be typed as something —
 * typed as `composition` or `design` it would claim its index.json is a file
 * you can open with read_comp or read_design, which it is not.
 *
 * Consumers that filter by kind must let it through: it is the entry that says
 * "what you are looking for is in here", so hiding it from a caller asking for
 * a design is how a caller asking for a slide ends up with the one loose poster
 * instead. Use `isCollectionEntry`, never a bare `=== 'collection'`, or the
 * legacy spelling below slips through the gap. See the filter in
 * `list_templates`.
 */
export type TemplateEntryType =
  | 'design'
  | 'composition'
  | 'react-component'
  | 'collection'
  /**
   * @deprecated The old name for `collection`. Nothing writes it any more.
   *
   * Kept ONLY so a manifest written before the rename still reads. It stayed in
   * the code long after it left the data, and the two halves drifted: every
   * pointer the live catalog ships — `presentations`, `social`, `advertising`
   * and the rest — is a `collection`, while the descent tested for `library`
   * and therefore skipped all of them. Nothing rejected the entries, so the
   * seven collections listed normally and not one pack child ever entered the
   * library.
   *
   * What that looked like from outside: one tool telling a model that "14
   * approved 16:9 pages" exist in the monolith language, and the next answering
   * `unknown_template` for `catalog/templates/presentations/monolith`. It tried
   * twice, believed the library over itself, and abandoned templates to author
   * raw markup instead.
   *
   * Do not write this. When no stored manifest carries it, delete it.
   */
  | 'library';

/**
 * Whether an entry POINTS AT another manifest rather than being a file.
 *
 * The one test for it, because there are two spellings and only one is current
 * — see the deprecation note above.
 */
export function isCollectionEntry(type: TemplateEntryType | string | undefined): boolean {
  return type === 'collection' || type === 'library';
}

/** One entry in a templates manifest. */
export interface TemplateEntry {
  /** Folder name under the library root, e.g. `poster-quote`. */
  slug: string;
  /** Human title. */
  title: string;
  /** Coarse kind. */
  type: TemplateEntryType;
  /** The read tool that opens the primary file (`read_design|read_comp|read_react`). */
  open: string;
  /** Rooted key to the primary file, e.g. `catalog/templates/poster-quote/poster-quote.dsgn`. */
  path: string;
  /** One-line teaching note: what this template demonstrates. */
  teaches?: string;
  /** Every file the template ships (for multi-file pieces like a deck). */
  files?: string[];
  /**
   * A person approved this template for the agent to use here.
   *
   * On a WORKSPACE entry this mirrors the file's own `.meta/` sidecar. On a
   * CATALOG entry it is the only home there is: the catalog is one shared,
   * read-only library, so a stamp written inside it would approve the template
   * for every workspace at once. Either way the workspace's own
   * `templates/index.json` is what a reader consults.
   *
   * Absent = not approved. See `approval.ts` for why that direction.
   */
  approved?: FileApproval;
  /**
   * For an approved CATALOG template listed in a WORKSPACE manifest: the
   * catalog ref it approves (`catalog/templates/<collection>/<slug>`).
   *
   * Deliberately not `ref` — `ResolvedTemplateEntry.ref` is the resolved ref
   * every reader already uses, and shadowing it made the resolved one optional
   * across the codebase.
   */
  catalogRef?: string;
}

/** A templates library manifest (`index.json`). */
export interface TemplateManifest {
  $schema: string;
  title: string;
  note?: string;
  examples: TemplateEntry[];
}

// ── Root-generic key builders ────────────────────────────────────────────
// Given a library ROOT prefix, compose the manifest / folder / file keys.
// A library root is either `getWorkspaceTemplatesRoot()` (a workspace's own
// `templates/`) or `getCatalogTemplatesRoot()` (the shared, app-owned set).

/** The `index.json` manifest key for a templates library at `root`. */
export function templatesIndexKey(root: string): string {
  return `${root}/${TEMPLATES_INDEX_FILE}`;
}

/** A single template's folder inside a templates library at `root`. */
export function templateFolderKey(root: string, slug: string): string {
  return `${root}/${slug}`;
}

/** A file inside a template folder inside a templates library at `root`. */
export function templateFileKey(root: string, slug: string, filename: string): string {
  return `${root}/${slug}/${filename}`;
}

// ── The two named library roots ──────────────────────────────────────────

/** A workspace's own templates root — `templates/` (`WS_TEMPLATES`). */
export function getWorkspaceTemplatesRoot(): string {
  return WS_TEMPLATES;
}

/**
 * The shared, app-owned templates library root — `catalog/templates`.
 *
 * This is what the `examples://catalog` MCP resource reads. On the connector the
 * `catalog/…` prefix is routed to the bucket root (see `resolveKey`/`isCatalogPath`
 * in `r2-tool-context.ts`), so it is readable from inside any workspace context.
 */
export function getCatalogTemplatesRoot(): string {
  return `${CATALOG_WORKSPACE_PREFIX}templates`;
}

// ── The two roots, as ONE ordered list ───────────────────────────────────

/**
 * Which library an entry came from.
 *
 * `workspace` is the workspace's own `templates/` — its LOCAL references, the
 * pieces this brand keeps to build from. `catalog` is the platform's shared
 * `catalog/templates/` — GLOBAL references, the cold-start set every workspace
 * can see. Same shape, same manifest, different reach.
 */
export type TemplateScope = 'workspace' | 'catalog';

/** A library root paired with the scope it represents. */
export interface TemplateLibraryRoot {
  scope: TemplateScope;
  root: string;
}

/**
 * Both library roots, in RESOLUTION ORDER — workspace first, catalog second.
 *
 * The order is the contract, not a convenience: a workspace that curates its
 * own reference under a slug shadows the platform's entry of the same name, so
 * "poster-quote" means the brand's poster wherever the brand has one. Every
 * reader (the MCP resource, `list_templates`, generation ref resolution) walks
 * THIS array rather than hand-listing the two roots, so the precedence cannot
 * drift between surfaces.
 */
export function templateLibraryRoots(): TemplateLibraryRoot[] {
  return [
    { scope: 'workspace', root: getWorkspaceTemplatesRoot() },
    { scope: 'catalog', root: getCatalogTemplatesRoot() },
  ];
}

/** The root prefix for one scope. */
export function templateRootFor(scope: TemplateScope): string {
  return scope === 'workspace' ? getWorkspaceTemplatesRoot() : getCatalogTemplatesRoot();
}

// ── Refs: how a template is NAMED by a caller ────────────────────────────

/**
 * Slugs are folder names, and a ref is user/model input that becomes a path.
 * Lowercase alphanumeric + hyphen only — no dots, no slashes, so no ref can
 * traverse out of a library root.
 */
export const TEMPLATE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidTemplateSlug(slug: string): boolean {
  return TEMPLATE_SLUG_RE.test(slug);
}

/**
 * May this segment name a PACK?
 *
 * A valid slug, and not a workspace root. The second half is the load-bearing
 * one: packs made the two-part form `{head}/{slug}` meaningful, and without
 * this guard `workflows/deck-basics` — a pointer at the OTHER first-class root,
 * which templates deliberately do not reach — would quietly parse as "the
 * `deck-basics` template in the `workflows` pack" instead of being rejected.
 * A ref that names a foreign root is an error, and has to keep reading as one.
 *
 * `isReservedSegment` covers most of them; `brands/` and the catalog prefix are
 * real roots that it does not list, so they are named here. Erring toward
 * rejection is the safe direction — a pack that cannot be called `brands` costs
 * nothing, while a foreign root read as a pack is a ref that resolves when it
 * should have failed.
 */
export function isPackHead(segment: string): boolean {
  if (!isValidTemplateSlug(segment)) return false;
  if (isReservedSegment(segment)) return false;
  return segment !== WS_BRANDS && segment !== CATALOG_WORKSPACE_PREFIX.replace(/\/+$/, '');
}

/** A parsed reference to one template. `scope: null` = "either, workspace first". */
export interface TemplateRef {
  scope: TemplateScope | null;
  slug: string;
  /**
   * The PACK the slug lives in, when the ref named one.
   *
   * ABSENT means "unqualified" — resolve it against every pack, and against the
   * top level, by slug alone. That is the spelling a model reaches for first
   * ("boardroom"), and it works whenever the slug is unique. It is not always:
   * `editorial` and `monolith` name a theme in BOTH the presentation system and
   * the brand-guidelines book system, which is exactly why the qualified form
   * has to exist.
   */
  pack?: string;
}

/**
 * Parse a template reference.
 *
 * Accepted spellings, all resolving to the same entry:
 *   `poster-quote`                     → either library, workspace first
 *   `templates/poster-quote`           → the workspace's own
 *   `catalog/poster-quote`             → the shared catalog
 *   `catalog/templates/poster-quote`   → the shared catalog (full key form)
 *
 * And the same four again, QUALIFIED BY PACK, for a template that lives inside
 * a `type: "collection"` entry rather than at the top level:
 *   `presentations/boardroom`                     → either library
 *   `templates/presentations/boardroom`           → the workspace's own
 *   `catalog/presentations/boardroom`             → the shared catalog
 *   `catalog/templates/presentations/boardroom`   → the shared catalog (full key)
 *
 * The two-part form is genuinely ambiguous on its face — `templates/x` is a
 * ROOT plus a slug while `presentations/x` is a PACK plus a slug — and is
 * resolved by the head: only `templates` and `catalog` name roots, so anything
 * else in that position is a pack. This is why a pack may not be called either.
 *
 * A ref is deliberately NOT a path: it names a template, and the reader
 * composes the key from the root. That is what keeps `../` and cross-workspace
 * keys out of a surface a model fills in. Returns null for anything else.
 */
export function parseTemplateRef(raw: string): TemplateRef | null {
  const s = raw.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
  if (!s) return null;
  const catalogHead = CATALOG_WORKSPACE_PREFIX.replace(/\/+$/, '');
  const parts = s.split('/');
  if (parts.length === 1) {
    // A bare root name is not a template. `templates/` normalises to
    // `templates`, which would otherwise read as a slug and point the reader at
    // `templates/templates/`.
    if (parts[0] === WS_TEMPLATES || parts[0] === catalogHead) return null;
    return isValidTemplateSlug(parts[0]) ? { scope: null, slug: parts[0] } : null;
  }
  if (parts.length === 2) {
    const [head, slug] = parts;
    if (!isValidTemplateSlug(slug)) return null;
    if (head === WS_TEMPLATES) return { scope: 'workspace', slug };
    if (head === catalogHead) return { scope: 'catalog', slug };
    // Not a root, so it is a pack: `presentations/boardroom`.
    return isPackHead(head) ? { scope: null, slug, pack: head } : null;
  }
  if (parts.length === 3) {
    const [head, mid, slug] = parts;
    if (!isValidTemplateSlug(slug)) return null;
    // `catalog/templates/{slug}` — the full key form of a TOP-LEVEL entry.
    // Checked before the pack reading, or a pack could never be called
    // `templates`, and more importantly this spelling predates packs.
    if (head === catalogHead && mid === WS_TEMPLATES) return { scope: 'catalog', slug };
    if (!isPackHead(mid)) return null;
    if (head === WS_TEMPLATES) return { scope: 'workspace', slug, pack: mid };
    if (head === catalogHead) return { scope: 'catalog', slug, pack: mid };
    return null;
  }
  if (parts.length === 4) {
    const [head, mid, pack, slug] = parts;
    if (!isValidTemplateSlug(slug) || !isPackHead(pack)) return null;
    if (head === catalogHead && mid === WS_TEMPLATES) return { scope: 'catalog', slug, pack };
    return null;
  }
  return null;
}

/**
 * The canonical spelling of a resolved ref — what every surface echoes back.
 *
 * A packed entry always echoes QUALIFIED (`catalog/templates/presentations/
 * boardroom`) even when the bare slug happens to be unique today. The canonical
 * form has to stay stable as the library grows, and a second pack adding an
 * `editorial` is not a reason for an already-issued ref to stop resolving.
 */
export function formatTemplateRef(ref: {
  scope: TemplateScope;
  slug: string;
  pack?: string;
}): string {
  const root = templateRootFor(ref.scope);
  return ref.pack ? `${root}/${ref.pack}/${ref.slug}` : `${root}/${ref.slug}`;
}

// ── Manifest shape helpers ───────────────────────────────────────────────

/** An entry plus where it came from — what readers hand back. */
export interface ResolvedTemplateEntry extends TemplateEntry {
  scope: TemplateScope;
  /** Canonical ref (`templates/{slug}` or `catalog/templates/{slug}`). */
  ref: string;
  /**
   * The `type: "collection"` entry this came from, absent for a top-level one.
   *
   * Stamped by the READER, not declared in the manifest: a pack's own
   * `index.json` does not know what it is called from outside, and the same
   * manifest read from a workspace root and from the catalog is two different
   * refs.
   */
  pack?: string;
}

/** Parse a manifest, returning null rather than throwing on anything unusable. */
export function parseTemplateManifest(text: string): TemplateManifest | null {
  try {
    const m = JSON.parse(text) as Partial<TemplateManifest>;
    if (!Array.isArray(m.examples)) return null;
    return {
      $schema: typeof m.$schema === 'string' ? m.$schema : TEMPLATE_MANIFEST_SCHEMA,
      title: typeof m.title === 'string' ? m.title : 'Templates',
      ...(typeof m.note === 'string' ? { note: m.note } : {}),
      examples: m.examples
        .filter(
          (e): e is TemplateEntry =>
            !!e && typeof e === 'object' && typeof (e as TemplateEntry).slug === 'string',
        )
        // A malformed stamp is dropped rather than trusted: `parseApproval`
        // requires an author and a date, because a half-written record reads as
        // approved while naming nobody accountable.
        .map((e) => {
          const approved = parseApproval(e);
          return approved ? { ...e, approved } : (({ approved: _drop, ...rest }) => rest)(e);
        }),
    };
  } catch {
    return null;
  }
}

/**
 * The entries a person approved for use here — the default a listing shows.
 *
 * Callers that want the whole library ask for it (`list_templates` keeps
 * `includeUnapproved`), because the failure this prevents is silent: an agent
 * building from the one template nobody vetted looks exactly like an agent
 * building from the right one.
 */
export function approvedEntries<T extends { approved?: FileApproval }>(
  entries: readonly T[],
  opts: { brand?: string | null } = {},
): T[] {
  return entries.filter((e) => approvalCovers(e.approved ?? null, opts.brand));
}

/** Is anything here approved? Tells "nobody has approved yet" from "none match". */
export function hasApprovals(entries: readonly { approved?: FileApproval }[]): boolean {
  return entries.some((e) => !!e.approved);
}

/** An empty manifest for a library root that has none yet. */
export function emptyTemplateManifest(title: string): TemplateManifest {
  return { $schema: TEMPLATE_MANIFEST_SCHEMA, title, examples: [] };
}

/** Key a pack manifest by the scope and library-entry slug it was read from. */
export function packManifestKey(scope: TemplateScope, packSlug: string): string {
  return `${scope}:${packSlug.toLowerCase()}`;
}

/**
 * Every file a pack's manifest describes — the pack's own contents, flattened.
 *
 * Used to give a theme entry real `files` so copying it copies the deck. Each
 * example contributes its `files` when it lists them and its `path` otherwise,
 * which is `templateEntryFiles`' rule applied one level down.
 */
function manifestFiles(manifest: TemplateManifest): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const e of manifest.examples) {
    for (const f of templateEntryFiles(e)) {
      if (typeof f === 'string' && f && !seen.has(f)) {
        seen.add(f);
        out.push(f);
      }
    }
  }
  return out;
}

/**
 * Merge the two libraries into one list, WORKSPACE FIRST and workspace-wins.
 *
 * Pass the manifests keyed by scope; a scope with no manifest is simply
 * skipped, which is the ordinary case (most workspaces curate none of their
 * own). The result is ordered workspace-then-catalog, so a caller that just
 * prints the list shows the brand's own references above the platform's.
 *
 * ── PACKS ────────────────────────────────────────────────────────────────
 * A `type: "collection"` entry is a POINTER at another manifest, and for a long
 * time this walked straight past it. The effect was that everything the
 * platform actually ships for building a deck was unreachable: all six
 * presentation themes, all three brand-guideline themes, every chart component
 * — sixty-odd templates — sat behind four library entries, so `use_template
 * ("boardroom")` answered `unknown_template` and the only way to start from a
 * theme was to copy its files one at a time by hand. Which is what the model
 * did, at one LLM round trip per file.
 *
 * `packs` carries those inner manifests, keyed by `packManifestKey`. A pack
 * whose manifest was not read is not an error — the library entry still lands,
 * still says what is inside, and the caller can read it. Descent is an
 * improvement on the listing, never a precondition for it.
 *
 * Inner entries are inlined DIRECTLY AFTER their library entry rather than
 * appended, so a printed list reads as the library reads: the pack, then what
 * is in it.
 */
export function mergeTemplateManifests(
  manifests: Partial<Record<TemplateScope, TemplateManifest | null>>,
  packs?: ReadonlyMap<string, TemplateManifest | null>,
): ResolvedTemplateEntry[] {
  const out: ResolvedTemplateEntry[] = [];
  const seen = new Set<string>();

  /** Dedup identity: a packed slug is only unique WITHIN its pack. */
  const identity = (slug: string, pack?: string) =>
    pack ? `${pack.toLowerCase()}/${slug.toLowerCase()}` : slug.toLowerCase();

  const push = (entry: TemplateEntry, scope: TemplateScope, pack?: string): boolean => {
    const id = identity(entry.slug, pack);
    if (seen.has(id)) return false; // workspace shadows catalog
    seen.add(id);
    out.push({
      ...entry,
      scope,
      ...(pack ? { pack } : {}),
      ref: formatTemplateRef({ scope, slug: entry.slug, pack }),
    });
    return true;
  };

  for (const { scope } of templateLibraryRoots()) {
    const manifest = manifests[scope];
    if (!manifest) continue;
    for (const entry of manifest.examples) {
      const added = push(entry, scope);
      if (!isCollectionEntry(entry.type)) continue;
      // Descend even when the library entry itself was shadowed: the shadowing
      // entry is a pack too, and its contents are what the caller wants.
      void added;
      const inner = packs?.get(packManifestKey(scope, entry.slug));
      if (!inner) continue;
      for (const child of inner.examples) {
        /*
         * A CHILD THAT IS ITSELF A PACK IS STILL A TEMPLATE YOU CAN NAME.
         *
         * The catalog is three deep, not two: `presentations` holds seven
         * themes, each of which holds its own slides. This used to `continue`
         * on a child pack — "a pack of packs is not a shape we ship" — which
         * was true of the shape and wrong about the consequence: it dropped
         * every theme, so `catalog/templates/presentations/monolith` named
         * nothing and `use_template` said `unknown_template` for a theme
         * `make_piece` had just recommended by name.
         *
         * The theme is the unit a person asks for ("use monolith"), so it is
         * pushed. What is NOT done is descend again: a slide is addressed
         * through its theme, and the ref grammar has no fourth level to spell
         * one with.
         *
         * Its FILES come from its own manifest, because its `path` is an
         * index.json — copying that alone would hand someone a deck-shaped
         * nothing. A theme whose manifest was not read still lands, still
         * says what it is, and is one read away, exactly as a pack is.
         */
        if (isCollectionEntry(child.type)) {
          const grand = packs?.get(packManifestKey(scope, `${entry.slug}/${child.slug}`));
          push(grand ? { ...child, files: manifestFiles(grand) } : child, scope, entry.slug);
          continue;
        }
        push(child, scope, entry.slug);
      }
    }
  }
  return out;
}

/** Find the entry a ref names, honouring scope and the workspace-first order. */
export function findTemplateEntry(
  entries: ResolvedTemplateEntry[],
  ref: TemplateRef,
): ResolvedTemplateEntry | null {
  const matches = findTemplateMatches(entries, ref);
  // Exactly one, or the caller has to be told which — see findTemplateMatches.
  return matches.length === 1 ? matches[0]! : null;
}

/**
 * EVERY entry a ref could mean, in resolution order.
 *
 * `findTemplateEntry` returns a single entry and therefore cannot distinguish
 * "no such template" from "that name names two" — and those need opposite replies.
 * Told `unknown_template` for an ambiguous ref, a caller retries the same
 * spelling or invents a new one; told the two candidates, it picks. So the
 * lookup returns the list and the single-answer helper is the thin wrapper.
 *
 * An UNQUALIFIED ref prefers a top-level entry over any packed one: the top
 * level is the curated surface of a library, and a workspace that puts its own
 * `editorial` there means that one.
 */
export function findTemplateMatches(
  entries: ResolvedTemplateEntry[],
  ref: TemplateRef,
): ResolvedTemplateEntry[] {
  const slug = ref.slug.toLowerCase();
  const pack = ref.pack ? ref.pack.toLowerCase() : null;
  const inScope = (e: ResolvedTemplateEntry) => ref.scope === null || e.scope === ref.scope;
  const bySlug = entries.filter((e) => e.slug.toLowerCase() === slug && inScope(e));

  if (pack) return bySlug.filter((e) => (e.pack ?? '').toLowerCase() === pack);

  const topLevel = bySlug.filter((e) => !e.pack);
  return topLevel.length > 0 ? topLevel : bySlug;
}

/**
 * Every file a template ships, as rooted keys.
 *
 * `files` is authoritative when the entry declares it (a deck is several files);
 * otherwise the primary `path` is the whole template. Callers copying a
 * template out — `use_template` — must use this, not `path`, or a multi-file
 * piece lands half-copied and renders against nothing.
 */
export function templateEntryFiles(entry: TemplateEntry): string[] {
  const files = Array.isArray(entry.files) ? entry.files.filter((f) => typeof f === 'string') : [];
  return files.length > 0 ? files : [entry.path];
}

/** Insert or replace an entry by slug, keeping manifest order stable. */
export function upsertTemplateEntry(
  manifest: TemplateManifest,
  entry: TemplateEntry,
): TemplateManifest {
  const i = manifest.examples.findIndex(
    (e) => e.slug.toLowerCase() === entry.slug.toLowerCase(),
  );
  const examples = [...manifest.examples];
  if (i >= 0) examples[i] = entry;
  else examples.push(entry);
  return { ...manifest, examples };
}

/** The read tool that opens a template's primary file, by extension. */
export function templateOpenTool(filename: string): string {
  const f = filename.toLowerCase();
  if (f.endsWith('.comp')) return 'read_comp';
  if (f.endsWith('.react')) return 'read_react';
  return 'read_design';
}

/** The coarse kind of a template's primary file, by extension. */
export function templateTypeOf(filename: string): TemplateEntryType {
  const f = filename.toLowerCase();
  if (f.endsWith('.comp')) return 'composition';
  if (f.endsWith('.react')) return 'react-component';
  return 'design';
}

/** True when a workspace-relative path lives inside either library. */
export function isTemplateLibraryPath(path: string): boolean {
  const p = path.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
  return templateLibraryRoots().some(({ root }) => p === root || p.startsWith(`${root}/`));
}
