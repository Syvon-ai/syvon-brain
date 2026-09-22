/**
 * v7 project path helpers.
 *
 * All project content lives under `projects/{slug}/` — flat, no sub-collections.
 * The top-level segment is `WS_WORK`, sourced from the folder registry so a
 * rename of the folder vocabulary propagates here automatically.
 */
import { WS_WORK } from '../workspace-config';

/** Get the project folder path (R2 prefix). */
export function getProjectFolder(slug: string): string {
  return `${WS_WORK}/${slug}`;
}

/**
 * The WORKSPACE-RELATIVE path of a file inside a project — `projects/{slug}/…`.
 *
 * This is the form a `.comp` stores for its own siblings (`audioRelPath`), NOT
 * the form that goes in the database. For `ProjectItem.r2Key` use
 * `getProjectItemKey()` — see the note there.
 */
export function getProjectItemPath(slug: string, filename: string): string {
  return `${WS_WORK}/${slug}/${filename}`;
}

/**
 * The CANONICAL `ProjectItem.r2Key`: BUCKET-ABSOLUTE,
 * `workspaces/{ws}/projects/{slug}/{filename}`.
 *
 * Both halves of this matter, because getting it wrong does not fail — it
 * silently DOUBLES the row. `ProjectItem` is unique on `(projectId, r2Key)`, so
 * a relative key and an absolute key for the same object are two different keys,
 * two rows, and two identical-looking cards in every project grid. That is
 * exactly what happened: the agent's `make/persist.ts` stored the relative path
 * while `workspace-sync`'s R2 reconcile upserted the absolute one, so every
 * `ws push` after a generation minted a second row (personal-web reached 485
 * rows for 325 real files).
 *
 * Absolute is canonical here because it is what an R2 listing yields, what the
 * schema documents, and what every other `r2Key` in the system holds —
 * `Post.r2Key` is the single documented exception.
 *
 * Every writer of `ProjectItem.r2Key` must go through this.
 */
export function getProjectItemKey(storagePrefix: string, itemPath: string): string {
  const prefix = storagePrefix.replace(/\/+$/, '');
  const rel = itemPath.replace(/^\/+/, '');
  return prefix ? `${prefix}/${rel}` : rel;
}

/** Strip a `workspaces/{ws}/` prefix — the identity of the R2 OBJECT, shared by
 *  both historic key shapes. Use it to compare or de-duplicate keys, never to
 *  store one. */
export function toProjectItemObjectKey(r2Key: string): string {
  return r2Key.replace(/^workspaces\/[^/]+\/+/, '');
}

/** Get the .context.jsonl sidecar path. */
export function getProjectContextPath(slug: string): string {
  return `${WS_WORK}/${slug}/.context.jsonl`;
}

/**
 * This project's PREFERRED generation settings (`generation/v1`) —
 * `projects/{slug}/generation.json`.
 *
 * The middle layer: workspace `config/generation.json` → this → the session's
 * `session.json#settings` → the request. A file rather than DB columns because
 * a session already records the same shape one folder down, and one shape with
 * one parser beats a JSON blob in Postgres that only the app can read. (The
 * legacy `Project.aspect/typography/format/motion` columns are a different,
 * dead thing — pre-rig scaffolding nothing writes.)
 */
export function getProjectGenerationPath(slug: string): string {
  return `${WS_WORK}/${slug}/generation.json`;
}

/** Files that are internal infrastructure and should not be shown as project items. */
const INFRA_FILES = new Set(['.context.jsonl', '.approvals.json', '.meta']);

/** Check if a filename is an infrastructure file (not a user-visible item). */
export function isInfraFile(filename: string): boolean {
  return INFRA_FILES.has(filename) || filename.startsWith('.meta/');
}
