/**
 * .Syvon/wrap.json — links a local workspace to its R2 cloud workspace.
 *
 * Written once when a Builder creates or links a workspace.
 * Read by the push button to know where to upload.
 */

import { joinPath } from './paths';

export interface WrapLink {
  /** The workspace ID from the DB */
  workspaceId: string;
  /** R2 key prefix (e.g. "workspaces/{id}/") */
  prefix: string;
  /** Workspace slug for /wrap/[slug] URL */
  slug?: string;
  /** ISO timestamp when the link was created */
  linkedAt: string;
}

const WRAP_LINK_PATH = '.Syvon/wrap.json';

export function getWrapLinkPath(workspaceRoot: string): string {
  return joinPath(workspaceRoot, WRAP_LINK_PATH);
}

export async function readWrapLink(
  readFile: (path: string) => Promise<string>,
  workspaceRoot: string,
): Promise<WrapLink | null> {
  try {
    const raw = await readFile(getWrapLinkPath(workspaceRoot));
    const parsed = JSON.parse(raw);
    if (parsed?.workspaceId && parsed?.prefix) return parsed as WrapLink;
    return null;
  } catch {
    return null;
  }
}

export async function writeWrapLink(
  writeFile: (path: string, content: string) => Promise<void>,
  workspaceRoot: string,
  link: Omit<WrapLink, 'linkedAt'>,
): Promise<void> {
  const data: WrapLink = {
    ...link,
    linkedAt: new Date().toISOString(),
  };
  await writeFile(getWrapLinkPath(workspaceRoot), JSON.stringify(data, null, 2));
}
