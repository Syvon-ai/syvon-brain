/**
 * Ensure the per-brand folder structure exists in storage.
 *
 * Storage-agnostic: callers wire `createFolder` / `readFile` / `writeFile`
 * to R2 (studio + web) or local fs (desktop) — same contract as
 * `ensureWorkspaceStructureV6`. Idempotent; existing files are never
 * overwritten so repeated calls are safe (self-healing on open).
 *
 * Called from both brand create paths:
 * - Scratch: `POST /api/workspaces/[id]/brands` body `{ from: 'scratch' }`.
 * - Catalog: `addBrandToWorkspace` in `@syvon/catalog` after the per-asset
 *   CopyObject loop.
 *
 * Scope — what this seeds under `brands/{slug}/`:
 * - `config/brand.json` (brand DNA: voice / visual / identity / …)
 * - `config/design-tokens.json` (per-brand colors + typography)
 * - `config/text-styles.json` (per-brand typographic scale)
 * - `config/figma-tokens.json` (per-brand Figma integration)
 * - `config/animation.json` (per-brand motion curves — see organism-map-v7.md §1)
 * - `assets/.keep` so R2 list ops see the subfolder before any binary lands.
 * - `assets/<primitive>/.meta/_folder.json` for the 11 kit primitives
 *   (`folder-meta/v1`, `role`+`defaultUse` from `BRAND_KIT_DEFAULTS`) so a seeded
 *   brand matches `ChannelContent/_templateMaster/` — see spec
 *   `docs/superpowers/specs/2026-06-15-brand-backend-reconstruction-design.md`.
 * - `meta/.keep` so the prose-brain folder exists (prose is human-authored later).
 *
 * NOT seeded: `assets/uploads/` is a lazy runtime inbox (created on first
 * upload, no seed sidecar); `config/world.json` is compiled later (Phase 2).
 *
 * Brand folder layout is unchanged from v6 → v7. Every brand is
 * self-sufficient; readers fall back from active → `Workspace.defaultBrandId`
 * via `resolveBrandFileCandidates`.
 *
 * Out of scope: binary asset copies (handled by `addBrandToWorkspace` for
 * catalog, and by the upload route for user-provided binaries).
 *
 * See `.schema/organism-map-v7.md` and `brand-folder-paths.ts`.
 */

import {
  getBrandFolderPaths,
  getBrandAssetFolder,
  getBrandAssetSidecarFolder,
  getBrandFolderSidecarPath,
  BRAND_KIT_PRIMITIVES,
  BRAND_KIT_DEFAULTS,
  BRAND_KIT_SUBFOLDERS,
  BRAND_KIT_SUBFOLDER_DEFAULTS,
  type BrandKitSubfolder,
  type BrandKitDestination,
} from './brand-folder-paths';

type LogFn = (msg: string, meta?: Record<string, unknown>) => void;

export interface BrandFolderSeedData {
  /** Serialized brand DNA — `brand.json`. */
  brand: unknown;
  /** Serialized design tokens — `design-tokens.json`. */
  designTokens: unknown;
  /** Serialized text styles — `text-styles.json`. */
  textStyles: unknown;
  /** Serialized figma tokens — `figma-tokens.json`. */
  figmaTokens: unknown;
  /** Serialized animation presets — `animation.json`. */
  animation: unknown;
}

export async function ensureBrandFolderStructureV7(
  workspacePrefix: string,
  slug: string,
  data: BrandFolderSeedData,
  opts: {
    createFolder: (path: string) => Promise<void>;
    readFile: (path: string) => Promise<string>;
    writeFile?: (path: string, content: string) => Promise<void>;
    warn?: LogFn;
  },
): Promise<void> {
  const prefix = workspacePrefix.replace(/\/+$/, '');
  const paths = getBrandFolderPaths(slug);

  // 1. Root + Config + Assets subfolder markers.
  for (const rel of [paths.root, paths.config, paths.assets]) {
    const full = `${prefix}/${rel}`;
    try {
      await opts.createFolder(full);
    } catch {
      // May already exist.
    }
  }

  if (!opts.writeFile) return;

  // Assets/.keep marker so R2 list ops see the subfolder before any upload.
  const keepPath = `${prefix}/${paths.assets}/.keep`;
  try {
    await opts.readFile(keepPath);
  } catch {
    try {
      await opts.writeFile(keepPath, '');
    } catch {
      // Best-effort.
    }
  }

  // 2. The five per-brand JSON seed files. Never overwrite.
  const seeds: Array<{ path: string; data: unknown }> = [
    { path: paths.brand, data: data.brand },
    { path: paths.designTokens, data: data.designTokens },
    { path: paths.textStyles, data: data.textStyles },
    { path: paths.figmaTokens, data: data.figmaTokens },
    { path: paths.animation, data: data.animation },
  ];

  const warn = opts.warn ?? (() => {});
  for (const { path, data: payload } of seeds) {
    const fullPath = `${prefix}/${path}`;
    try {
      await opts.readFile(fullPath);
    } catch {
      try {
        await opts.writeFile(fullPath, JSON.stringify(payload, null, 2));
      } catch (writeErr) {
        warn('Brand seed write failed', {
          path: fullPath,
          error: writeErr instanceof Error ? writeErr.message : String(writeErr),
        });
      }
    }
  }

  // 3. Kit primitive folders + their `folder-meta/v1` sidecars (never overwrite),
  //    so a seeded brand matches `_templateMaster/assets/`. `uploads/` is the
  //    runtime inbox and is intentionally NOT seeded here.
  // The nested canonical folders (`imagery/bg`) are seeded alongside the
  // primitives — same folder, same `_folder.json`, one level down.
  const seedTargets: Array<{ folder: BrandKitDestination; def: { role: string; defaultUse: string } }> = [
    ...BRAND_KIT_PRIMITIVES.map((p) => ({ folder: p as BrandKitDestination, def: BRAND_KIT_DEFAULTS[p] })),
    ...(Object.keys(BRAND_KIT_SUBFOLDERS) as BrandKitSubfolder[]).map((k) => ({
      folder: BRAND_KIT_SUBFOLDERS[k] as BrandKitDestination,
      def: BRAND_KIT_SUBFOLDER_DEFAULTS[k],
    })),
  ];
  for (const { folder: primitive, def } of seedTargets) {
    for (const dir of [getBrandAssetFolder(slug, primitive), getBrandAssetSidecarFolder(slug, primitive)]) {
      try {
        await opts.createFolder(`${prefix}/${dir}`);
      } catch {
        // May already exist.
      }
    }
    const sidecarPath = `${prefix}/${getBrandFolderSidecarPath(slug, primitive)}`;
    try {
      await opts.readFile(sidecarPath);
    } catch {
      try {
        await opts.writeFile(
          sidecarPath,
          JSON.stringify({ $schema: 'folder-meta/v1', role: def.role, defaultUse: def.defaultUse }, null, 2),
        );
      } catch (writeErr) {
        warn('Brand kit sidecar write failed', {
          path: sidecarPath,
          error: writeErr instanceof Error ? writeErr.message : String(writeErr),
        });
      }
    }
  }

  // 4. Prose-brain folder marker so `meta/` exists before any prose is authored.
  try {
    await opts.createFolder(`${prefix}/${paths.meta}`);
  } catch {
    // May already exist.
  }
  const metaKeep = `${prefix}/${paths.meta}/.keep`;
  try {
    await opts.readFile(metaKeep);
  } catch {
    try {
      await opts.writeFile(metaKeep, '');
    } catch {
      // Best-effort.
    }
  }
}
