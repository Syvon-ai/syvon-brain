/**
 * Where a rendered/exported artifact BELONGS — derived from the spine, not from
 * a constant.
 *
 * The feed is a projection of `projects/{slug}/output/`: a media file there
 * becomes a card when a sibling `<stem>.json` sidecar declares a non-empty
 * `channels[]`. Two things used to make that unreachable (G2):
 *
 *   1. `render_sequence` / `export_design` defaulted their output to `export/`,
 *      which `WORKSPACE_CONFIG.folders` marks `sync: false` — it never reaches
 *      R2, so nothing written there can ever be published. The `/syvon:render`
 *      and `/syvon:export` slash commands worked around this in PROSE
 *      ("outputPath = projects/{slug}/output/…, the default export/ folder is
 *      invisible to /api/feed"), which only helps an agent that reads them.
 *   2. Some generation doors write the `.comp` to
 *      `projects/{slug}/sessions/{id}/output/` (the work chat, autopilot, MCP —
 *      the session is that batch's conversation), while the composer writes
 *      project-level. Both are fine for the DECK, which reads both. Neither is
 *      fine for the FEED unless the artifact reaches project-root `output/`,
 *      because no sidecar reader descends into sessions.
 *
 * Both are the same missing rule: **a session holds drafts; project-root
 * `output/` holds exports.** Rendering or exporting IS the promote step, so the
 * destination should be computed from where the source sits on the spine.
 *
 * Pure string helpers — no I/O, no registry lookups beyond `WS_WORK`.
 */
import { WS_WORK } from '../workspace-config';
import { WS_SESSIONS } from './session-paths';

/** Normalize to forward slashes and drop any leading slashes. */
function norm(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
}

/**
 * The project slug owning `path`, for any workspace-relative path under
 * `projects/`. Works at any depth, so a session artifact resolves to the same
 * slug as a project-root one:
 *
 *   projects/reel/reel.comp                          → 'reel'
 *   projects/reel/sessions/s-1/output/reel.comp      → 'reel'
 *   brands/fortys/assets/logos/mark.svg              → null
 *
 * Returns null when the path is not under `projects/` (case-insensitive).
 */
export function projectSlugFromPath(path: string): string | null {
  const parts = norm(path).split('/').filter(Boolean);
  if (parts.length < 2) return null;
  if (parts[0]!.toLowerCase() !== WS_WORK.toLowerCase()) return null;
  const slug = parts[1]!;
  // A bare `projects/output/…` is malformed, not a project named "output".
  return slug && slug !== '.' && slug !== '..' ? slug : null;
}

/**
 * True when `path` sits inside a project's session folder — i.e. it is a DRAFT
 * that no sidecar reader will ever see.
 *
 *   projects/reel/sessions/s-1/output/reel.comp → true
 *   projects/reel/output/reel.mp4               → false
 */
export function isSessionScopedPath(path: string): boolean {
  const parts = norm(path).split('/').filter(Boolean);
  return (
    parts.length > 2 &&
    parts[0]!.toLowerCase() === WS_WORK.toLowerCase() &&
    parts[2]!.toLowerCase() === WS_SESSIONS.toLowerCase()
  );
}

/**
 * The publishable destination for an artifact derived from `sourcePath`:
 * `projects/{slug}/output/{filename}` — flattening any session segment, because
 * the render of a draft is the export.
 *
 * Returns null when the source is not under `projects/`, so the caller keeps
 * whatever fallback it had (`export/`) for genuinely project-less renders —
 * this helper narrows the default, it does not invent a project.
 */
export function resolveProjectOutputPath(sourcePath: string, filename: string): string | null {
  const slug = projectSlugFromPath(sourcePath);
  if (!slug) return null;
  const name = norm(filename).split('/').filter(Boolean).pop();
  if (!name) return null;
  return `${WS_WORK}/${slug}/output/${name}`;
}

/**
 * The project that owns renders of sources NO project owns — a `templates/`
 * design, a `workflows/{slug}/` exemplar, a brand's `.react`.
 *
 * Those are previews of REUSABLE assets, so there is no project to derive from,
 * but they still belong on the spine: before this they fell back to top-level
 * `export/`, which is `sync:false` (never reaches R2) and read by nothing, so a
 * preview was stranded on whichever machine produced it.
 *
 * Safe on both surfaces, checked rather than assumed:
 *   - the DECK (`/api/unreviewed`) scans only the ACTIVE project, so previews
 *     stay out of it unless you deliberately switch to this project;
 *   - the FEED scans every `projects/*​/output/` but gates on a sibling
 *     `<stem>.json` sidecar with non-empty `channels[]`, which no renderer
 *     writes — so a preview is invisible there too.
 * And unlike `export/` it is under `projects/`, which IS synced, so a preview
 * reaches R2 and can actually be looked at from somewhere else.
 */
export const PREVIEWS_PROJECT_SLUG = 'previews';

/**
 * Where a render/export of `sourcePath` belongs — the ONE resolver every
 * renderer should call. Never null: a project-owned source lands in its own
 * `projects/{slug}/output/`, anything else in the previews project.
 *
 * Prefer this over `resolveProjectOutputPath`, which returns null off-spine and
 * left each caller to invent its own fallback — that is precisely how five
 * renderers ended up defaulting to a folder nothing reads.
 */
/**
 * Slug for a worn brand, from the root that supplies its DNA.
 *
 * Taken from the theme root's own folder name, NOT from the override's display
 * name: the display name is editable and may carry spaces and capitals, while
 * the folder is the workspace's stable identity. Lowercased and hyphenated so
 * the result is a filename you would have typed yourself.
 *
 * Returns null for anything that does not reduce to a usable slug, so a caller
 * can fall back to the unstamped name rather than writing `deck-.mp4`.
 */
export function brandSlugFromThemeRoot(themeRoot: string | null | undefined): string | null {
  if (!themeRoot?.trim()) return null;
  const leaf = norm(themeRoot).split('/').filter(Boolean).pop();
  if (!leaf) return null;
  const slug = leaf
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s._-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .toLowerCase();
  return slug || null;
}

/**
 * Stamp a worn brand onto a filename: `deck.mp4` + `nike` → `deck-nike.mp4`.
 *
 * WHY THE NAME AND NOT A FOLDER. A render of the same source under two brands
 * has to land on two paths or the second silently overwrites the first — which
 * is what happened before this existed. The obvious shape is a folder per
 * brand, and it is the wrong one: the FEED scans `projects/*​/output/` one level
 * deep and gates on a sibling `<stem>.json`, so `output/{brand}/deck.mp4` would
 * be invisible to it and stranded exactly the way top-level `export/` used to
 * strand previews (see PREVIEWS_PROJECT_SLUG above). The suffix keeps every
 * render in the one folder that is actually read.
 *
 * A falsy brand returns the filename untouched — a workspace wearing its own
 * brand keeps the plain name it has always had, so nothing existing moves.
 */
export function brandStampedFilename(filename: string, brandSlug: string | null | undefined): string {
  if (!brandSlug?.trim()) return filename;
  const name = norm(filename).split('/').filter(Boolean).pop() ?? filename;
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  // Idempotent: re-stamping an already-stamped name must not produce
  // `deck-nike-nike.mp4` when a caller resolves the destination twice.
  if (stem.toLowerCase().endsWith(`-${brandSlug.toLowerCase()}`)) return name;
  return `${stem}-${brandSlug}${ext}`;
}

/**
 * @param brandSlug when set, the worn brand — stamped onto the filename so two
 *   brands' renders of one source do not collide. See `brandStampedFilename`.
 */
export function resolveRenderOutputPath(sourcePath: string, filename: string, brandSlug?: string | null): string {
  filename = brandStampedFilename(filename, brandSlug);
  return (
    resolveProjectOutputPath(sourcePath, filename) ??
    resolveProjectOutputPath(`${WS_WORK}/${PREVIEWS_PROJECT_SLUG}/x`, filename) ??
    `${WS_WORK}/${PREVIEWS_PROJECT_SLUG}/output/${filename}`
  );
}
