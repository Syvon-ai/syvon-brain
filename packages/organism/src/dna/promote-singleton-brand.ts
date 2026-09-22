/**
 * Promote a legacy singleton brand (v5 `.Syvon/Core/*`) into the v6
 * `brands/default/*` layout.
 *
 * Idempotent: if `brands/default/config/brand.json` already exists, no-op.
 * Otherwise:
 * 1. For each of the four singleton DNA files under `.Syvon/Core/`
 *    (`brand.json`, `design-tokens.json`, `text-styles.json`,
 *    `figma-tokens.json`), copy to `brands/default/config/` and delete the
 *    source.
 * 2. Move `animation.json` into `brands/default/config/animation.json`. Tries
 *    `.Syvon/Core/animation.json` first; if absent, tries the
 *    interim-hoist location `.Syvon/animation.json` (from an earlier
 *    migration attempt). v6: animation is brand-scoped like every other
 *    DNA file; there is no workspace-wide `.Syvon/animation.json`.
 * 3. Attempt to copy `.Syvon/Core/brand-logo.svg` (if present) into
 *    `brands/default/assets/logo.svg` (assets stay flat, unchanged). Best-effort — binaries might not
 *    be readable through a text-only `readFile` wrapper, in which case
 *    the caller can handle asset migration separately.
 *
 * Storage-agnostic: callers wire `readFile` / `writeFile` / `deleteFile`
 * / `createFolder` to local fs (desktop) or R2 (server). The contract
 * mirrors `ensureDnaStructure` + `ensureBrandFolderStructureV7`.
 *
 * Callers:
 * - syvon-app workspace-store on workspace open (desktop).
 * - Studio `scripts/promote-singleton-brand.cjs` one-shot migration
 *   (server, covers R2 workspaces with the legacy layout).
 */

import { DEFAULT_BRAND_SLUG, getBrandFolderPaths } from './brand-folder-paths';

export interface PromoteSingletonOps {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  createFolder: (path: string) => Promise<void>;
}

export interface PromoteSingletonResult {
  promoted: boolean;
  filesMoved: string[];
  filesFailed: string[];
}

const LEGACY_DNA_FILES: Array<{ legacy: string; key: 'brand' | 'designTokens' | 'textStyles' | 'figmaTokens' }> = [
  { legacy: '.Syvon/Core/brand.json', key: 'brand' },
  { legacy: '.Syvon/Core/design-tokens.json', key: 'designTokens' },
  { legacy: '.Syvon/Core/text-styles.json', key: 'textStyles' },
  { legacy: '.Syvon/Core/figma-tokens.json', key: 'figmaTokens' },
];

export async function promoteSingletonToDefaultBrand(
  workspaceRoot: string,
  ops: PromoteSingletonOps,
): Promise<PromoteSingletonResult> {
  const root = workspaceRoot.replace(/[/\\]+$/, '');
  const paths = getBrandFolderPaths(DEFAULT_BRAND_SLUG);
  const targetBrandJson = `${root}/${paths.brand}`;

  const result: PromoteSingletonResult = {
    promoted: false,
    filesMoved: [],
    filesFailed: [],
  };

  // Idempotency: already promoted.
  try {
    await ops.readFile(targetBrandJson);
    return result;
  } catch {
    // Target doesn't exist — proceed.
  }

  // Nothing to promote? No legacy brand.json either.
  const legacyBrandPath = `${root}/.Syvon/Core/brand.json`;
  try {
    await ops.readFile(legacyBrandPath);
  } catch {
    return result;
  }

  // Ensure target brands/default/ + config/ + assets/ folders exist.
  try {
    await ops.createFolder(`${root}/${paths.root}`);
  } catch {
    // May already exist.
  }
  try {
    await ops.createFolder(`${root}/${paths.config}`);
  } catch {
    // May already exist.
  }
  try {
    await ops.createFolder(`${root}/${paths.assets}`);
  } catch {
    // May already exist.
  }

  // Move each DNA file.
  for (const { legacy, key } of LEGACY_DNA_FILES) {
    const src = `${root}/${legacy}`;
    const dst = `${root}/${paths[key]}`;
    try {
      const content = await ops.readFile(src);
      await ops.writeFile(dst, content);
      try {
        await ops.deleteFile(src);
      } catch {
        // Non-fatal — file copied but source still exists. Caller can
        // clean up later; both paths read the same content.
      }
      result.filesMoved.push(legacy);
    } catch {
      result.filesFailed.push(legacy);
    }
  }

  // Move animation.json into brands/default/animation.json.
  // Tries `.Syvon/Core/animation.json` first; if absent, falls back to the
  // interim-hoist location `.Syvon/animation.json` (from an earlier
  // migration attempt). v6: animation is brand-scoped.
  const animTarget = `${root}/${paths.animation}`;
  const animSources = [
    `${root}/.Syvon/Core/animation.json`,
    `${root}/.Syvon/animation.json`,
  ];
  try {
    await ops.readFile(animTarget);
    // Already at target — just clean up any stale sources.
    for (const src of animSources) {
      try { await ops.deleteFile(src); } catch { /* ok */ }
    }
  } catch {
    for (const src of animSources) {
      try {
        const content = await ops.readFile(src);
        await ops.writeFile(animTarget, content);
        try { await ops.deleteFile(src); } catch { /* ok */ }
        result.filesMoved.push(src.slice(root.length + 1));
        // Clean up any remaining sibling legacy source (e.g. both existed).
        for (const other of animSources) {
          if (other !== src) {
            try { await ops.deleteFile(other); } catch { /* ok */ }
          }
        }
        break;
      } catch {
        // Try the next source.
      }
    }
  }

  result.promoted = result.filesMoved.length > 0;
  return result;
}
