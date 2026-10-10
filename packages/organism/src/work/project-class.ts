/**
 * `projects/{slug}/project.json` — what a project IS, as a classification.
 *
 * The sibling of `scope.json` (work/contracts.ts): scope says what DONE means
 * (outcomes, evidence), this says what the project's deliverable IS — a
 * presentation, a report, a reel — so surfaces can group, icon and filter
 * projects by kind instead of listing them as one undifferentiated column.
 *
 * A FILE rather than `Project` DB columns on purpose. The legacy
 * `aspect/typography/format/motion` columns are documented dead scaffolding
 * nothing writes, and the brain reads a workspace from its files — scope.json,
 * outcomes.jsonl — never from Postgres. A classification only the app can see
 * is one the brain cannot use, and this is the layer meant to feed both.
 *
 * ── THE TAXONOMY IS THE CATALOG'S, NAMED ONE LEVEL UP ─────────────────────
 *
 * Every catalog collection's children are semantic types already — `documents`
 * holds report/whitepaper/ebook/one-pager/proposal, `social` holds post/
 * carousel/story/reel/social-ad. The one exception is `presentations`, whose
 * children (boardroom, editorial, monolith…) are layout LANGUAGES, not types,
 * so the kind is the collection and a language is a `styleRef`, not a subtype.
 * `classifyTemplateRef` is that mapping as a function: a template ref in, a
 * {kind, subtype} out. Nothing here maintains a second taxonomy beside the
 * catalog's — it names points in the one that exists.
 *
 * ── EXTENSIBLE BY CONSTRUCTION ────────────────────────────────────────────
 *
 * Adding a kind is ONE entry in `PROJECT_KINDS` — no parser change, because
 * the registry is data the parser reads, not a union type it encodes. New axis
 * VALUES (a new surface, a new intent) need no change at all: axis keys are
 * closed but their values are open lowercase tokens, mirroring the manifest
 * fields the social collection already stamps (`intent`, `behavior`, `unit`,
 * `surface`, `ratios`), which `parseTemplateManifest` passes through untyped.
 *
 * Reading is FORWARD-TOLERANT where writing is strict. `kind`/`subtype` are
 * validated as portable identifiers but NOT against the registry: a file
 * written by a newer registry (a kind this build has never heard of) still
 * parses, and `resolveProjectClass` reports it as unknown rather than the
 * parse failing — the same fail-open posture the template library takes for a
 * manifest it cannot read. A classification that stops a workspace opening is
 * worse than one that renders with a fallback icon.
 */
import { WS_WORK } from '../workspace-config';
import { parseTemplateRef } from '../dna/template-paths';

export const PROJECT_CLASS_SCHEMA = 'project-class/v1';

// ── Axes ──────────────────────────────────────────────────────────────────
// Keys are closed (a new key is a schema version, not a value); values are
// open lowercase tokens. `ratios` is the one list-valued axis — aspect ratios
// stack ('4:5' AND '1:1'); every other axis names one condition.

export const PROJECT_AXIS_KEYS = ['intent', 'behavior', 'unit', 'surface', 'ratios'] as const;
export type ProjectAxisKey = (typeof PROJECT_AXIS_KEYS)[number];

export type ProjectAxes = Partial<Record<ProjectAxisKey, string | string[]>>;

// ── The registry ──────────────────────────────────────────────────────────

/** A refinement of a kind. `catalogSlugs` maps subtypes onto catalog entries
 *  that mean them — plural where two entries mean one subtype (both
 *  `instagram-ads` and `paid-vertical-video` are a `social-ad`). */
export interface ProjectSubtype {
  id: string;
  title: string;
  /** Material symbol, when the subtype earns its own. */
  icon?: string;
  catalogSlugs?: string[];
  /** Axes the subtype implies, a caller may override them. */
  axes?: ProjectAxes;
}

/** One kind of work a project can be. Data, not a union: adding an entry is
 *  the whole act of extending the taxonomy. */
export interface ProjectKind {
  id: string;
  title: string;
  /** Material symbol name — the same vocabulary `Project.icon` and
   *  `create_workflow` already use, so one icon table serves every surface. */
  icon: string;
  /** Catalog collection (or `collection/sub-collection`) this kind names, so
   *  `classifyTemplateRef` can map a template ref onto it. */
  catalogPath?: string;
  subtypes?: ProjectSubtype[];
}

export const PROJECT_KINDS: ProjectKind[] = [
  {
    id: 'presentation',
    title: 'Presentation',
    icon: 'co_present',
    catalogPath: 'presentations',
    // Boardroom/editorial/monolith… are layout languages, not types: they are
    // a styleRef, never a subtype. The kind has no subtypes of its own.
  },
  {
    id: 'document',
    title: 'Document',
    icon: 'description',
    catalogPath: 'documents',
    subtypes: [
      { id: 'report', title: 'Report', catalogSlugs: ['report'] },
      { id: 'whitepaper', title: 'Whitepaper', catalogSlugs: ['whitepaper'] },
      { id: 'ebook', title: 'Ebook', catalogSlugs: ['ebook'] },
      { id: 'one-pager', title: 'One-pager', catalogSlugs: ['one-pager'] },
      { id: 'proposal', title: 'Proposal', catalogSlugs: ['proposal'] },
    ],
  },
  {
    id: 'social-content',
    title: 'Social content',
    icon: 'share',
    catalogPath: 'social',
    subtypes: [
      { id: 'post', title: 'Post', catalogSlugs: ['single-post'], axes: { behavior: 'still', unit: 'single', surface: 'feed' } },
      { id: 'carousel', title: 'Carousel', catalogSlugs: ['still-carousel'], axes: { behavior: 'still', unit: 'sequence', surface: 'feed' } },
      { id: 'story', title: 'Story', catalogSlugs: ['stories'], axes: { behavior: 'still', unit: 'sequence', surface: 'story' } },
      { id: 'reel', title: 'Reel', catalogSlugs: ['reels'], axes: { behavior: 'motion', unit: 'sequence', surface: 'vertical-video' } },
      // Paid feed units and paid vertical video are one subtype: the split the
      // catalog makes is placement, and placement is the `surface` axis.
      { id: 'social-ad', title: 'Social ad', catalogSlugs: ['instagram-ads', 'paid-vertical-video'], axes: { intent: 'paid' } },
    ],
  },
  {
    id: 'video',
    title: 'Video',
    icon: 'movie_edit',
    catalogPath: 'scenes',
    subtypes: [
      { id: 'reel', title: 'Reel', catalogSlugs: ['reels'], axes: { behavior: 'motion', unit: 'sequence', surface: 'vertical-video' } },
      { id: 'titles', title: 'Titles', catalogSlugs: ['titles'], axes: { behavior: 'motion' } },
      // Scenes are shot families (product, money, imagery…): edit/assembly
      // work over them is the kind's own shape, not one subfamily.
      { id: 'scene-cut', title: 'Scene cut' },
    ],
  },
  {
    id: 'motion-design',
    title: 'Motion design',
    icon: 'animation',
    catalogPath: 'motion',
    subtypes: [
      // Filed by what moves — the motion collection's own top split.
      { id: 'path', title: 'Path' },
      { id: 'grid', title: 'Grid' },
      { id: 'rig', title: 'Rig' },
      { id: 'type', title: 'Type' },
      { id: 'transition', title: 'Transition' },
      { id: 'drawn', title: 'Drawn' },
    ],
  },
  {
    id: 'advertising',
    title: 'Advertising',
    icon: 'ads_click',
    catalogPath: 'advertising',
    subtypes: [
      { id: 'display', title: 'Display', catalogSlugs: ['display'] },
      { id: 'out-of-home', title: 'Out of home', catalogSlugs: ['out-of-home'] },
      // The five amazon-* entries are one subtype: retail media, with the
      // surface as the distinguishing axis.
      { id: 'retail-media', title: 'Retail media', catalogSlugs: ['amazon-stores', 'amazon-ads', 'amazon-listing', 'amazon-brand-story', 'amazon-a-plus'] },
    ],
  },
  {
    id: 'brand-guideline',
    title: 'Brand guidelines',
    icon: 'menu_book',
    catalogPath: 'brand/brand-guidelines',
  },
  {
    id: 'brand-rollout',
    title: 'Brand rollout',
    icon: 'deployed_code',
    catalogPath: 'brand/template-set',
  },
  { id: 'campaign', title: 'Campaign', icon: 'campaign', catalogPath: 'campaigns' },
  { id: 'data-visualization', title: 'Data visualization', icon: 'monitoring', catalogPath: 'data-visualization/charts' },
];

export function projectKind(id: string): ProjectKind | null {
  return PROJECT_KINDS.find((k) => k.id === id) ?? null;
}

// ── The document ──────────────────────────────────────────────────────────

export interface ProjectClass {
  schema: typeof PROJECT_CLASS_SCHEMA;
  /** One kind, no multiple inheritance — a reel is either social content or
   *  video work by PRIMARY intent, and the axes carry the rest. */
  kind: string;
  subtype?: string;
  axes?: ProjectAxes;
  /** A template-library ref (`parseTemplateRef` grammar) grounding the
   *  project's style, e.g. `catalog/templates/social/reels`. When present, a
   *  reader may derive axes from the referenced manifest instead of trusting
   *  restated ones. */
  styleRef?: string;
  /** Material symbol; absent means "derive from the kind". */
  icon?: string;
}

export type ProjectClassResult = { ok: true; value: ProjectClass } | { ok: false; issues: string[] };

const KIND_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const TOKEN_RE = /^[a-z0-9][a-z0-9-]*$/;
const RATIO_RE = /^\d{1,2}:\d{1,2}$/;

/**
 * Parse and structurally validate a project class.
 *
 * Strict on shape — unknown FIELDS are rejected (a future schema is a new
 * version string, not silent extra fields; same rule as work/contracts.ts).
 * Tolerant on VOCABULARY — kind/subtype must be well-formed identifiers but
 * need not exist in THIS build's registry, so a file written by a newer
 * registry still opens. `resolveProjectClass` says whether they're known.
 */
export function parseProjectClass(raw: unknown): ProjectClassResult {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw); } catch { return { ok: false, issues: ['$: invalid JSON'] }; }
  }
  const issues: string[] = [];
  const fail = (path: string, why: string) => { issues.push(`${path}: ${why}`); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, issues: ['$: expected object'] };
  const v = value as Record<string, unknown>;
  for (const key of Object.keys(v)) {
    if (!['schema', 'kind', 'subtype', 'axes', 'styleRef', 'icon'].includes(key)) fail(`$.${key}`, 'unknown field; use a supported schema version');
  }
  if (v.schema !== PROJECT_CLASS_SCHEMA) fail('$.schema', `expected ${PROJECT_CLASS_SCHEMA}`);
  if (typeof v.kind !== 'string' || !KIND_RE.test(v.kind)) fail('$.kind', 'expected a kebab-case kind');
  if (v.subtype !== undefined && (typeof v.subtype !== 'string' || !KIND_RE.test(v.subtype))) fail('$.subtype', 'expected a kebab-case subtype');
  if (v.icon !== undefined && (typeof v.icon !== 'string' || !v.icon.trim())) fail('$.icon', 'expected a material symbol name');
  if (v.styleRef !== undefined && (typeof v.styleRef !== 'string' || !parseTemplateRef(v.styleRef))) fail('$.styleRef', 'not a template-library ref');
  if (v.axes !== undefined) {
    if (!v.axes || typeof v.axes !== 'object' || Array.isArray(v.axes)) fail('$.axes', 'expected an object');
    else for (const [key, val] of Object.entries(v.axes as Record<string, unknown>)) {
      if (!(PROJECT_AXIS_KEYS as readonly string[]).includes(key)) { fail(`$.axes.${key}`, 'unknown axis; a new axis key is a schema version'); continue; }
      if (key === 'ratios') {
        if (!Array.isArray(val) || !val.length || val.some((r) => typeof r !== 'string' || !RATIO_RE.test(r))) fail(`$.axes.ratios`, 'expected nonempty aspect ratios like 4:5');
      } else if (typeof val !== 'string' || !TOKEN_RE.test(val)) {
        fail(`$.axes.${key}`, 'expected a lowercase token');
      }
    }
  }
  return issues.length ? { ok: false, issues } : { ok: true, value: v as unknown as ProjectClass };
}

// ── Resolution: registry lookups and derivation ───────────────────────────

export interface ResolvedProjectClass {
  /** The registry entry, or null when this build does not know the kind —
   *  render with a fallback icon and the raw id, never drop the file. */
  kind: ProjectKind | null;
  subtype: ProjectSubtype | null;
  /** The icon to show: explicit > subtype's > kind's > the generic fallback. */
  icon: string;
  /** The subtype's implied axes, when both subtype and its axes are known. */
  axes?: ProjectAxes;
}

export const FALLBACK_PROJECT_ICON = 'topic';

export function resolveProjectClass(cls: ProjectClass): ResolvedProjectClass {
  const kind = projectKind(cls.kind);
  const subtype = kind?.subtypes?.find((s) => s.id === cls.subtype) ?? null;
  return {
    kind,
    subtype,
    icon: cls.icon ?? subtype?.icon ?? kind?.icon ?? FALLBACK_PROJECT_ICON,
    ...(subtype?.axes ? { axes: subtype.axes } : {}),
  };
}

/**
 * Map a template-library ref onto the taxonomy — the "classify from the
 * catalog" direction. `catalog/templates/social/reels` → social-content/reel;
 * a presentation THEME (`…/presentations/monolith`) → presentation, with the
 * language left to the caller as the ref it already holds. Returns null when
 * the ref names no catalog collection the registry knows — a workspace's own
 * template under `templates/…` classifies nothing, because the taxonomy is
 * the CATALOG's, not an invention beside it.
 */
export function classifyTemplateRef(ref: string): { kind: string; subtype?: string } | null {
  const parsed = parseTemplateRef(ref);
  if (!parsed || parsed.scope !== 'catalog') return null;
  // A ref names a collection either directly (`presentations`) or by a member
  // (`presentations/monolith` → pack + slug). Try both spellings.
  const candidates: Array<[string, string | undefined]> = parsed.pack
    ? [[parsed.pack, parsed.slug]]
    : [[parsed.slug, undefined]];
  for (const kind of PROJECT_KINDS) {
    if (!kind.catalogPath) continue;
    const [collection, sub] = kind.catalogPath.split('/');
    for (const [pack, slug] of candidates) {
      if (pack !== collection) continue;
      if (!sub) {
        // The kind IS the collection: the slug (when present) is a style
        // language or a member, not a subtype of the kind.
        return slug && kind.subtypes?.length
          ? { kind: kind.id, subtype: matchSubtype(kind, slug) ?? undefined }
          : { kind: kind.id };
      }
      if (slug !== sub) continue;
      return { kind: kind.id };
    }
  }
  return null;
}

function matchSubtype(kind: ProjectKind, slug: string): string | null {
  return kind.subtypes?.find((s) => s.catalogSlugs?.includes(slug))?.id ?? null;
}

// ── Where it lives ────────────────────────────────────────────────────────

const SEGMENT_RE = /^[^\\/:*?"<>|%\x00-\x1f]+$/;
const RESERVED_RE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;

/** `projects/{slug}/project.json` — same folder as scope.json and
 *  generation.json, so the per-project sidecars stay together. */
export function projectClassPath(project: string): string {
  const ok = project.trim() === project && project !== '' && SEGMENT_RE.test(project)
    && !RESERVED_RE.test(project) && !/[. ]$/.test(project);
  if (!ok) throw new Error(`not a portable project segment: ${project}`);
  return `${WS_WORK}/${project}/project.json`;
}

/**
 * A project's class after a person picks a new KIND (or `null`, "Not
 * classified"). The subtype survives only when the new kind has it; the
 * project's own axes, styleRef and icon always do. One rule for every place
 * the Type is changed — the inspector, a card's kebab, project settings.
 */
export function withProjectKind(current: ProjectClass | null, kind: string | null): ProjectClass | null {
  if (!kind) return null;
  const subtype = current?.subtype && projectKind(kind)?.subtypes?.some((s) => s.id === current.subtype)
    ? current.subtype
    : undefined;
  return {
    schema: PROJECT_CLASS_SCHEMA,
    kind,
    ...(subtype ? { subtype } : {}),
    ...(current?.axes ? { axes: current.axes } : {}),
    ...(current?.styleRef ? { styleRef: current.styleRef } : {}),
    ...(current?.icon ? { icon: current.icon } : {}),
  };
}
