/**
 * WHAT COUNTS AS AUTHORED TEXT, and how a key is spelled.
 *
 * These three rules used to live privately inside
 * `packages/workspace-sync/src/engine.ts`, where they answered one question:
 * does `ws push` upload this file as a string or as bytes. They moved here
 * because a second consumer — the file version log — has to answer the SAME
 * question and getting a different answer would be a bug nobody could see: a
 * file synced as text but versioned as binary, or vice versa.
 *
 * The engine still owns transfer. This file owns the vocabulary both share.
 */

/**
 * Extensions treated as UTF-8 text. Everything else is bytes.
 *
 * `.svg` and `.lottie` are here because they transfer as text and diff as text,
 * even though a 6 MB Lottie under `assets/` is media by any honest reading —
 * which is why the version log decides what to KEEP by root
 * (`isVersionedKey`), and uses this only to decide what is READABLE.
 */
export const WORKSPACE_TEXT_EXTENSIONS = new Set([
  '.json', '.txt', '.md', '.css', '.svg', '.dsgn', '.seq',
  '.comp', '.react', '.shot', '.lottie', '.html', '.xml', '.yaml', '.yml',
  '.skill', '.slvr', '.tool',
  /* `.jsonl` — the workspace's append-only logs: the cards a person wrote, and
     the revisions that say which file answered which. Its absence here was a
     quiet joke at the log's expense: the record of every version was the one
     file the version store could not read, so `meta/cards.jsonl` had no
     history of its own and neither would `meta/revisions.jsonl`. */
  '.jsonl',
]);

/**
 * The size above which a file is not hashed and not versioned.
 *
 * The editable surface — `.dsgn`, `.comp`, `.react`, configs, markdown — sits
 * far below this; the files that exceed it are exported Lotties and scraped
 * payloads, which are content rather than authorship. `ws push` uses the same
 * ceiling to fall back to size+mtime change detection.
 */
export const WORKSPACE_TEXT_HASH_MAX_BYTES = 5 * 1024 * 1024;

/** Lowercased extension including the dot, or '' when there is none. */
function extname(filePath: string): string {
  const base = filePath.slice(filePath.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  return dot <= 0 ? '' : base.slice(dot).toLowerCase();
}

/** Is this path one we read and write as UTF-8 text? */
export function isTextFile(filePath: string): boolean {
  return WORKSPACE_TEXT_EXTENSIONS.has(extname(filePath));
}

/**
 * Collapse every spelling of a workspace file key to the WORKSPACE-RELATIVE
 * form (`config/app.json`).
 *
 * This exists because the same file is currently indexed under two different
 * keys: `packages/agent`'s tool context writes the ABSOLUTE r2 key
 * (`workspaces/{id}/config/app.json`) while `ws push`, the portal route and the
 * MCP service all write the relative one — so `WorkspaceFileIndex` holds two
 * rows for one file and neither knows about the other. The version log
 * normalises on the way in so it cannot inherit that split.
 *
 * Returns **null** when the key carries a prefix naming a DIFFERENT workspace.
 * That is a caller bug — a cross-tenant key reaching a writer — and quietly
 * rewriting it to look local is the one outcome worse than dropping it.
 */
export function toWorkspaceRelativeKey(raw: string, workspaceId: string): string | null {
  if (!raw || !workspaceId) return null;

  // Windows checkouts and hand-built keys both produce backslashes.
  const cleaned = raw.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!cleaned) return null;

  if (!cleaned.startsWith('workspaces/')) return cleaned;

  const rest = cleaned.slice('workspaces/'.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;

  const owner = rest.slice(0, slash);
  if (owner !== workspaceId) return null;

  const relative = rest.slice(slash + 1);
  return relative || null;
}
