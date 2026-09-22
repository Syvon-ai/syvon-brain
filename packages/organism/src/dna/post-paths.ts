/**
 * `posts/` path helpers — the single source of truth for the copy-on-publish
 * feed prefix (see the plan at
 * `docs/superpowers/plans/2026-08-15-posts-prefix-feed-centralisation.md`).
 *
 * D1: a post is a FOLDER — `posts/{slug}/…` — so a carousel's pages, poster
 * and primary media group naturally.
 *
 * D3: `Post.r2Key` is BUCKET-ABSOLUTE — `workspaces/{ws}/posts/{slug}/…` —
 * unlike the historic `projects/`-relative exception documented at
 * `packages/organism/src/dna/project-paths.ts:27-41`. `getPostKey()` is the
 * mandated single writer for it, exactly as `getProjectItemKey()` is for
 * `ProjectItem.r2Key`.
 *
 * D5: only baked, servable bytes live here. `.comp` sources are never copied
 * — they stay in `projects/` as provenance (`schema.prisma:849`).
 */
/** The registered folder segment — see `workspace-config.ts`'s `posts` entry. */
export const POSTS_DIR = 'posts';

/** The primary media stem — `media.mp4` / `media.jpg`, never the bare source filename. */
export const POST_MEDIA_STEM = 'media';
/** The poster/thumbnail filename for a motion post. */
export const POST_POSTER_FILENAME = 'poster.jpg';
/** The frozen descriptor — written LAST, the completion marker for a promote. */
export const POST_DESCRIPTOR_FILENAME = 'post.json';

/** Get the post folder path (workspace-relative R2 prefix) — `posts/{slug}`. */
export function getPostFolder(slug: string): string {
  return `${POSTS_DIR}/${slug}`;
}

/** The WORKSPACE-RELATIVE path of a file inside a post — `posts/{slug}/{filename}`. */
export function getPostFilePath(slug: string, filename: string): string {
  return `${POSTS_DIR}/${slug}/${filename}`;
}

/** Carousel/story page filename, 1-indexed — `1.png`, `12.jpg`. */
export function postPageFilename(page: number, ext: string): string {
  return `${page}.${ext.replace(/^\.+/, '')}`;
}

/**
 * The CANONICAL `Post.r2Key` (and poster/playable/page key) shape: BUCKET-
 * ABSOLUTE, `workspaces/{ws}/posts/{slug}/{filename}`. Prefix-tolerant — a
 * trailing slash on `storagePrefix` is optional.
 *
 * Every writer of a `posts/`-scoped key must go through this — see D3 and
 * the note on `getProjectItemKey()` for why absolute is canonical and what
 * a relative/absolute mismatch actually costs (a doubled row, not a 404).
 */
export function getPostKey(storagePrefix: string, slug: string, filename: string): string {
  const prefix = storagePrefix.replace(/\/+$/, '');
  const rel = getPostFilePath(slug, filename);
  return prefix ? `${prefix}/${rel}` : rel;
}

/** True if `key` is a posts/ key, in either the bare or bucket-absolute shape. */
export function isPostKey(key: string): boolean {
  return /^(?:workspaces\/[^/]+\/)?posts\//.test(key);
}
