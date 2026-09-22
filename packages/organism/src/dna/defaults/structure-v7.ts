/**
 * Project-item kinds + the shared font directory.
 *
 * The canonical top-level folder list lives in `workspace-config.ts`
 * (`WORKSPACE_TOP_DIRS`). v7 model notes (see .schema/organism-map-v7.md):
 * - All project content lives flat under `projects/{slug}/`.
 * - File extensions: .seq -> .comp, .comp -> .react
 * - No catalog provenance on project items (unlinked on add).
 */

/** Canonical font directory — shared workspace fonts. */
export const WORKSPACE_FONTS_DIR = 'assets/fonts';

/** Project file extensions and their kind discriminator. */
export const PROJECT_ITEM_KINDS = {
  '.dsgn': 'dsgn',
  '.comp': 'comp',
  '.react': 'react',
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.svg': 'image',
  '.webp': 'image',
  '.gif': 'image',
  '.mp4': 'video',
  '.webm': 'video',
  '.mov': 'video',
  '.woff2': 'font',
  '.woff': 'font',
  '.ttf': 'font',
  '.otf': 'font',
} as const;

export type ProjectItemKind = 'dsgn' | 'comp' | 'react' | 'image' | 'video' | 'font' | 'other';

/** Derive kind from filename extension. */
export function kindFromFilename(filename: string): ProjectItemKind {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return (PROJECT_ITEM_KINDS as Record<string, ProjectItemKind>)[ext] ?? 'other';
}
