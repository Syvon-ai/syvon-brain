/**
 * Session path helpers — v2 (workspace root) and v1 (within-project, legacy).
 *
 * **v2 is canonical.** A session lives at `sessions/{sessionId}/` and holds the
 * CONVERSATION only: `session.json`, the transcript, and `cards.jsonl`. It is a
 * registered workspace root (see WORKSPACE_CONFIG.folders for why it is
 * `sync:false` + `hidden`).
 *
 * **v1 is legacy-read-only.** Sessions used to live at
 * `projects/{slug}/sessions/{sessionId}/`, which made a session a possession of
 * one project. Every v1 export below is kept BYTE-IDENTICAL because existing R2
 * objects are still at those keys and nothing is being moved — resolution falls
 * back through them (see the app's `session-locator`). Do not write v1 paths.
 *
 * The one thing that did NOT move is the session's OUTPUT: drafts and renders
 * still land under `projects/{slug}/`, so `projectSlugFromPath` and
 * `isSessionScopedPath` in `./output-paths` still read an artifact's owning slug
 * out of its own key. `WS_SESSIONS` is the segment both layouts share, which is
 * why `isSessionScopedPath` keeps working unchanged.
 *
 * These are pure, workspace-relative path builders (no `workspaces/{id}/`
 * bucket prefix). Callers that need an absolute R2 key prepend their own
 * storage prefix, exactly as they do with `getProjectItemPath`.
 */
import { getProjectItemPath } from './project-paths';

/** The `sessions` path segment — a workspace root in v2, a within-project
 *  subfolder in v1. Shared so `isSessionScopedPath` matches both. */
export const WS_SESSIONS = 'sessions';

// ── v2: session as a workspace root ──────────────────────────────────

/** `sessions/{sessionId}` — where a conversation lives. */
export function getWorkspaceSessionFolder(sessionId: string): string {
  return `${WS_SESSIONS}/${sessionId}`;
}

/** `sessions/{sessionId}/{filename}` (filename may include subdirs). */
export function getWorkspaceSessionItemPath(sessionId: string, filename: string): string {
  return `${WS_SESSIONS}/${sessionId}/${filename}`;
}

/** `sessions/{sessionId}/session.json` — the SessionManifest. */
export function getWorkspaceSessionManifestPath(sessionId: string): string {
  return getWorkspaceSessionItemPath(sessionId, 'session.json');
}

/** `sessions/{sessionId}/cards.jsonl` — the append-only card ledger that feeds
 *  the canvas. Written by the shared tool executor, so a card lands here
 *  whether the call came from the in-app chat or a remote MCP client. */
export function getSessionCardsPath(sessionId: string): string {
  return getWorkspaceSessionItemPath(sessionId, 'cards.jsonl');
}

// ── v1: within-project (legacy read path — never write these) ────────

/** `projects/{slug}/sessions/{sessionId}` */
export function getSessionFolder(slug: string, sessionId: string): string {
  return getProjectItemPath(slug, `${WS_SESSIONS}/${sessionId}`);
}

/** `projects/{slug}/sessions/{sessionId}/{filename}` (filename may include subdirs). */
export function getSessionItemPath(slug: string, sessionId: string, filename: string): string {
  return getProjectItemPath(slug, `${WS_SESSIONS}/${sessionId}/${filename}`);
}

/** `projects/{slug}/sessions/{sessionId}/session.json` */
export function getSessionManifestPath(slug: string, sessionId: string): string {
  return getSessionItemPath(slug, sessionId, 'session.json');
}

/** `projects/{slug}/sessions/{sessionId}/.context.jsonl` (this session's chat history). */
export function getSessionContextPath(slug: string, sessionId: string): string {
  return getSessionItemPath(slug, sessionId, '.context.jsonl');
}

/** `projects/{slug}/sessions` — the root that holds all session folders. */
export function getProjectSessionsFolder(slug: string): string {
  return getProjectItemPath(slug, WS_SESSIONS);
}

/** Time-sortable id: `s-{base36(ms)}-{rand}` so prefix-listing sorts ~chronologically.
 *  Random suffix uses Web Crypto (`crypto.getRandomValues`) — a CSPRNG available
 *  in both browser and Node 18+ — rather than Math.random; kept isomorphic because
 *  this module is consumed from source by client code (no node:crypto import). */
export function newSessionId(): string {
  const ts = Date.now().toString(36);
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const rand = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `s-${ts}-${rand}`;
}

/** A safe single path segment (no slashes, dot-escapes, or empties). */
export function isSessionId(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(value) && value !== '.' && value !== '..';
}
