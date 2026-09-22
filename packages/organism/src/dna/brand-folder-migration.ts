/**
 * Legacy → v8.6 brand folder migration.
 *
 * Promotes a legacy singleton brand layout to the current layout. The
 * destinations follow the path builders, so v11 retargeted this for free when
 * the brand folder collapsed to the workspace root:
 *
 *   BEFORE (legacy)                     AFTER (v11)
 *   ──────────────────────              ──────────────────────────────────────────
 *   .Syvon/Core/brand.json              config/brand.json
 *   .Syvon/Core/design-tokens.json      config/design-tokens.json
 *   .Syvon/Core/text-styles.json        config/text-styles.json
 *   .Syvon/Core/figma-tokens.json       config/figma-tokens.json
 *   .Syvon/Core/animation.json          config/animation.json
 *   .Syvon/animation.json               config/animation.json  (interim-hoist location, also migrated)
 *   library/brand/logo.svg              assets/logo.svg
 *   library/brand/…                     assets/…
 *
 *   (.Syvon/Memory/signals.json stays — DB-only in v6 per Decision #2)
 *
 * Contract:
 *   - Idempotent: safe to re-run. If the target brand.json already exists,
 *     the function returns { migrated: false } without touching anything.
 *   - Non-destructive: uses `rename` (atomic on most filesystems) to move
 *     files. The caller decides how `rename` is implemented (fs.rename,
 *     R2 copy-then-delete, etc.).
 *   - Partial-safe: if the legacy brand.json is absent, returns early.
 *     Sidecar files that happen to be missing are silently skipped.
 *
 * See `.schema/organism-map.md` → "DB split — done" and
 * "`@syvon/organism` — phase 2 (TODO)".
 */

import {
  DEFAULT_BRAND_SLUG,
  getBrandFolderPaths,
} from './brand-folder-paths';

type ReadFile = (path: string) => Promise<string>;
type Rename = (oldPath: string, newPath: string) => Promise<void>;
type CreateFolder = (path: string) => Promise<void>;
type ListDirEntry = { name: string; kind: 'file' | 'directory' };
type ListDir = (path: string) => Promise<ListDirEntry[]>;

export interface BrandFolderMigrationOpts {
  readFile: ReadFile;
  rename: Rename;
  createFolder: CreateFolder;
  listDir: ListDir;
}

export interface BrandFolderMigrationReport {
  /** True iff any file was moved. False on already-migrated or legacy-absent workspaces. */
  migrated: boolean;
  /** Slug assigned to the promoted brand — always `DEFAULT_BRAND_SLUG` in this migration. */
  brandSlug: string;
  /** `"{fromPath} → {toPath}"` entries for each config file moved. */
  filesMoved: string[];
  /** `"{fromPath} → {toPath}"` entries for each binary asset moved from Library/Brand/. */
  assetsMoved: string[];
  /** Non-fatal issues (missing sidecar files, rename failures on non-primary assets). */
  warnings: string[];
}

const LEGACY_BRAND_PATH = '.Syvon/Core/brand.json';
const LEGACY_DESIGN_TOKENS_PATH = '.Syvon/Core/design-tokens.json';
const LEGACY_TEXT_STYLES_PATH = '.Syvon/Core/text-styles.json';
const LEGACY_FIGMA_TOKENS_PATH = '.Syvon/Core/figma-tokens.json';
const LEGACY_ANIMATION_CORE_PATH = '.Syvon/Core/animation.json';
// Interim-hoist location from an earlier migration attempt. If present,
// also moved into the default brand's folder.
const LEGACY_ANIMATION_HOISTED_PATH = '.Syvon/animation.json';
// After the §8 case-flip R2 migration, the legacy `Library/Brand/` folder was
// renamed to `library/brand/` on R2. Readers below look for lowercase.
const LEGACY_BRAND_ASSETS_DIR = 'library/brand';

/**
 * Check whether a file exists by attempting to read it. Returns `true` if
 * the read succeeds, `false` if it throws (ENOENT-style). Used here because
 * we don't want to introduce a separate `exists` callback surface when the
 * existing `readFile` callback already gives us the signal.
 */
async function exists(readFile: ReadFile, path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

export async function migrateLegacyBrandToFolder(
  opts: BrandFolderMigrationOpts
): Promise<BrandFolderMigrationReport> {
  const slug = DEFAULT_BRAND_SLUG;
  const target = getBrandFolderPaths(slug);
  const report: BrandFolderMigrationReport = {
    migrated: false,
    brandSlug: slug,
    filesMoved: [],
    assetsMoved: [],
    warnings: [],
  };

  // 1. Already migrated? If Brands/default/brand.json exists we're done.
  if (await exists(opts.readFile, target.brand)) {
    return report;
  }

  // 2. Legacy singleton present? If not, nothing to migrate.
  if (!(await exists(opts.readFile, LEGACY_BRAND_PATH))) {
    return report;
  }

  // 3. Ensure target folders exist (brands/default/ + brands/default/config/ + brands/default/assets/).
  try {
    await opts.createFolder(target.root);
  } catch {
    // EEXIST or similar — folder may already exist
  }
  try {
    await opts.createFolder(target.config);
  } catch {
    // EEXIST or similar
  }
  try {
    await opts.createFolder(target.assets);
  } catch {
    // EEXIST or similar
  }

  // 4. Move per-brand config files. The primary (brand.json) is required;
  //    sidecars are best-effort (workspaces may be missing some).
  const configMoves: Array<[from: string, to: string, required: boolean]> = [
    [LEGACY_BRAND_PATH, target.brand, true],
    [LEGACY_DESIGN_TOKENS_PATH, target.designTokens, false],
    [LEGACY_TEXT_STYLES_PATH, target.textStyles, false],
    [LEGACY_FIGMA_TOKENS_PATH, target.figmaTokens, false],
    // Animation moves into the default brand too — v6 retires workspace-wide
    // `.Syvon/animation.json`. Try `.Syvon/Core/animation.json` first; if
    // a prior interim hoist already moved it to `.Syvon/animation.json`,
    // the second entry picks it up.
    [LEGACY_ANIMATION_CORE_PATH, target.animation, false],
    [LEGACY_ANIMATION_HOISTED_PATH, target.animation, false],
  ];

  for (const [from, to, required] of configMoves) {
    // Skip if the target was already written by a prior entry (e.g.
    // `.Syvon/Core/animation.json` already moved — don't clobber with
    // `.Syvon/animation.json`).
    if (await exists(opts.readFile, to)) continue;
    if (!(await exists(opts.readFile, from))) continue;
    try {
      await opts.rename(from, to);
      report.filesMoved.push(`${from} → ${to}`);
    } catch (err) {
      const msg = `Failed to rename ${from} → ${to}: ${String(err)}`;
      if (required) {
        // Primary failed — surface as warning but keep going so partial
        // migration doesn't leave the workspace in a half-moved state.
        report.warnings.push(msg);
      } else {
        report.warnings.push(msg);
      }
    }
  }

  // 5. Move `library/brand/*` binaries into `brands/default/assets/`.
  let brandBinaries: ListDirEntry[] = [];
  try {
    brandBinaries = await opts.listDir(LEGACY_BRAND_ASSETS_DIR);
  } catch {
    // library/brand/ absent — skip
  }

  for (const entry of brandBinaries) {
    if (entry.kind !== 'file') continue;
    const from = `${LEGACY_BRAND_ASSETS_DIR}/${entry.name}`;
    const to = `${target.assets}/${entry.name}`;
    try {
      await opts.rename(from, to);
      report.assetsMoved.push(`${from} → ${to}`);
    } catch (err) {
      report.warnings.push(`Failed to move asset ${from}: ${String(err)}`);
    }
  }

  report.migrated =
    report.filesMoved.length > 0 || report.assetsMoved.length > 0;
  return report;
}
