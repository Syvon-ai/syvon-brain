/**
 * DNA file I/O utilities: read, write with history snapshots.
 * Follows the workspace-prefs.ts pattern (load → parse → type-guard → use).
 * All file access goes through readFile/writeFile callbacks — no direct fs.
 */

import { joinPath, basename, dirname } from '../paths';
import {
  DEFAULT_BRAND,
  DEFAULT_SIGNALS,
  DEFAULT_ANIM_PRESETS,
  DEFAULT_ANIM_DEFAULTS,
  getDefaultTextStyleFileShape,
} from './defaults/index';
import { isV2 } from './design-tokens/design-tokens-v2-types';
import { DEFAULT_V2_REGISTRY } from './defaults/design-tokens';
import { migrateV1ToV2 } from './design-tokens/design-tokens-migration';

type ReadFile = (path: string) => Promise<string>;
type WriteFile = (path: string, content: string) => Promise<void>;
type ListDir = (path: string) => Promise<{ name: string; kind: 'file' | 'directory' }[]>;
type DeleteFile = (path: string) => Promise<void>;

const MAX_HISTORY = 20;

/** Read and parse a DNA JSON file. Returns null if missing or invalid. */
export async function readDnaFile<T>(readFile: ReadFile, path: string): Promise<T | null> {
  try {
    const raw = await readFile(path);
    if (typeof raw !== 'string' || !raw.trim()) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * Snapshot the current DNA file to history/, then write the new version.
 * History files are named `<filename>.<timestamp>.json`.
 * Auto-prunes to MAX_HISTORY entries.
 */
export async function writeDnaFile(
  writeFile: WriteFile,
  readFile: ReadFile,
  path: string,
  data: unknown,
  opts?: { listDir?: ListDir; deleteFile?: DeleteFile }
): Promise<void> {
  // Snapshot existing file before overwriting
  await snapshotDna(writeFile, readFile, path, opts);
  // Write new version
  await writeFile(path, JSON.stringify(data, null, 2));
}

/**
 * Copy the current DNA file to the history directory with a timestamp suffix.
 * If the file doesn't exist yet, this is a no-op.
 */
async function snapshotDna(
  writeFile: WriteFile,
  readFile: ReadFile,
  path: string,
  opts?: { listDir?: ListDir; deleteFile?: DeleteFile }
): Promise<void> {
  let existing: string;
  try {
    existing = await readFile(path);
    if (!existing.trim()) return;
  } catch {
    return; // File doesn't exist yet — nothing to snapshot
  }

  const fileName = basename(path).replace(/\.json$/, '');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const historyDir = joinPath(dirname(path), 'History');
  const snapshotPath = joinPath(historyDir, `${fileName}.${timestamp}.json`);

  await writeFile(snapshotPath, existing);

  // Auto-prune history to MAX_HISTORY files
  if (opts?.listDir && opts?.deleteFile) {
    try {
      const entries = await opts.listDir(historyDir);
      const matching = entries
        .filter((e) => e.kind === 'file' && e.name.startsWith(fileName + '.') && e.name.endsWith('.json'))
        .map((e) => e.name)
        .sort();
      if (matching.length > MAX_HISTORY) {
        const toDelete = matching.slice(0, matching.length - MAX_HISTORY);
        for (const name of toDelete) {
          await opts.deleteFile(joinPath(historyDir, name));
        }
      }
    } catch {
      // Pruning is best-effort
    }
  }
}

/**
 * One-time migration: consolidate `imports/figma/tokens.json` and
 * `imports/figma/figma-link.json` into `core/figma-tokens.json`.
 * The link data (if present) is embedded as the `_link` key.
 * Idempotent — skips if neither legacy file exists.
 */
export async function migrateFigmaLink(
  syvonDir: string,
  opts: {
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<void>;
    deleteFile: (path: string) => Promise<void>;
    createFolder: (path: string) => Promise<void>;
  }
): Promise<void> {
  const legacyTokensPath = `${syvonDir}/imports/figma/tokens.json`;
  const legacyLinkPath = `${syvonDir}/imports/figma/figma-link.json`;
  const targetPath = `${syvonDir}/Core/figma-tokens.json`;

  // Read legacy tokens file
  let tokensRaw: string | null = null;
  try {
    tokensRaw = await opts.readFile(legacyTokensPath);
  } catch {
    // Doesn't exist
  }

  // Read legacy link file
  let linkRaw: string | null = null;
  try {
    linkRaw = await opts.readFile(legacyLinkPath);
  } catch {
    // Doesn't exist
  }

  // Nothing to migrate
  if (!tokensRaw && !linkRaw) return;

  // Build merged content
  let merged: Record<string, unknown> = { tokens: {} };
  if (tokensRaw) {
    try {
      merged = JSON.parse(tokensRaw);
    } catch {
      // Invalid JSON — use default
    }
  }
  if (linkRaw) {
    try {
      merged._link = JSON.parse(linkRaw);
    } catch {
      // Invalid JSON — skip link embedding
    }
  }

  // Write to new canonical location
  try {
    await opts.writeFile(targetPath, JSON.stringify(merged, null, 2));
  } catch {
    return; // Can't write — abort
  }

  // Clean up old files (best-effort)
  try { await opts.deleteFile(legacyTokensPath); } catch { /* ok */ }
  try { await opts.deleteFile(legacyLinkPath); } catch { /* ok */ }
}

/**
 * One-time migration: move contents of legacy `.solver/` directory to `.Syvon/Solvers/`.
 * Idempotent — skips if `.solver/` doesn't exist or if target already has the content.
 * Best-effort: individual failures are logged and skipped.
 *
 * @param syvonDir - workspace-relative path to .Syvon (e.g. '.Syvon')
 */
export async function migrateLegacySolverDir(
  syvonDir: string,
  opts: {
    listDir: (path: string) => Promise<{ name: string; kind: 'file' | 'directory' }[]>;
    rename: (oldPath: string, newPath: string) => Promise<void>;
    createFolder: (path: string) => Promise<void>;
  }
): Promise<void> {
  // Derive workspace root from syvonDir (e.g. '/workspace/.Syvon' → '/workspace', '.Syvon' → '')
  const wsRoot = syvonDir.replace(/(?:^|[/\\])\.Syvon[/\\]?$/, '');
  const legacyDir = wsRoot ? `${wsRoot}/.solver` : '.solver';
  const targetDir = `${syvonDir}/Solvers`;

  // Check if legacy .solver/ directory exists by listing its contents
  let legacyEntries: { name: string; kind: 'file' | 'directory' }[];
  try {
    legacyEntries = await opts.listDir(legacyDir);
  } catch {
    // .solver/ doesn't exist — nothing to migrate
    return;
  }

  if (legacyEntries.length === 0) return;

  // Ensure target directory exists
  try {
    await opts.createFolder(targetDir);
  } catch {
    // May already exist
  }

  // Check what already exists in .Syvon/Solvers/
  let existingNames: Set<string>;
  try {
    const existing = await opts.listDir(targetDir);
    existingNames = new Set(existing.map((e) => e.name));
  } catch {
    existingNames = new Set();
  }

  // Move each subdirectory from .solver/ to .Syvon/Solvers/
  for (const entry of legacyEntries) {
    if (entry.kind !== 'directory') continue;
    if (existingNames.has(entry.name)) continue; // Already migrated — skip

    const oldPath = `${legacyDir}/${entry.name}`;
    const newPath = `${targetDir}/${entry.name}`;

    try {
      await opts.rename(oldPath, newPath);
    } catch {
      // Best-effort: skip this entry if rename fails
    }
  }
}

/**
 * Reset identity/brand/intent to empty defaults so the onboarding wizard triggers again.
 * Used when FORCE_ONBOARDING=1. Overwrites unconditionally (no snapshot — this is a dev reset).
 */
export async function resetDnaForOnboarding(
  syvonDir: string,
  writeFile: (path: string, content: string) => Promise<void>
): Promise<void> {
  const resets: Array<[string, unknown]> = [
    [`${syvonDir}/Core/brand.json`, DEFAULT_BRAND],
    [`${syvonDir}/Core/design-tokens.json`, structuredClone(DEFAULT_V2_REGISTRY)],
    [`${syvonDir}/Memory/signals.json`, DEFAULT_SIGNALS],
  ];
  for (const [path, data] of resets) {
    await writeFile(path, JSON.stringify(data, null, 2));
  }
}

/**
 * Non-destructive in-memory migration of DNA objects.
 * Takes parsed JSON objects, applies all schema upgrades (v1→v2 tokens,
 * brand key backfill, animation preset backfill, text-style recovery),
 * and returns migrated versions with flags indicating which files changed.
 *
 * Use this when you already have the objects in memory (e.g. read from R2)
 * and want to migrate without going through file I/O.
 */
export function migrateDnaObjects(input: {
  brand?: unknown;
  designTokens?: unknown;
  animation?: unknown;
  textStyles?: unknown;
}): {
  brand: unknown;
  designTokens: unknown;
  animation: unknown;
  textStyles: unknown;
  changed: { brand: boolean; designTokens: boolean; animation: boolean; textStyles: boolean };
} {
  const changed = { brand: false, designTokens: false, animation: false, textStyles: false };

  // ── Design tokens: v1 → v2 ──
  let dt = input.designTokens ?? null;
  if (dt && typeof dt === 'object' && !isV2(dt as Record<string, unknown>)) {
    dt = migrateV1ToV2(dt as Record<string, unknown>);
    changed.designTokens = true;
  }

  // ── Text styles: recover missing blockStyles ──
  let ts = input.textStyles ?? null;
  if (ts && typeof ts === 'object' && !(ts as Record<string, unknown>).blockStyles) {
    ts = getDefaultTextStyleFileShape();
    changed.textStyles = true;
  }

  // ── Animation: backfill defaults and missing presets ──
  let anim = input.animation ? structuredClone(input.animation) as Record<string, unknown> : null;
  if (anim && typeof anim === 'object') {
    if (!anim.defaults) {
      anim.defaults = DEFAULT_ANIM_DEFAULTS;
      changed.animation = true;
    }
    if (anim.presets && typeof anim.presets === 'object') {
      const presets = anim.presets as Record<string, unknown>;
      for (const [id, preset] of Object.entries(DEFAULT_ANIM_PRESETS)) {
        if (!(id in presets)) {
          presets[id] = preset;
          changed.animation = true;
        }
      }
    }
  }

  // ── Brand: backfill missing top-level keys and visual style keys ──
  let brand = input.brand ? structuredClone(input.brand) as Record<string, unknown> : null;
  if (brand && typeof brand === 'object') {
    for (const [key, defaultValue] of Object.entries(DEFAULT_BRAND)) {
      if (!(key in brand)) {
        brand[key] = defaultValue;
        changed.brand = true;
      }
    }
    /*
     * NO VISUAL-STYLE BACKFILL. It filled every style preset with the ten
     * empty keys of the default, which is how a brand that never had a visual
     * style ended up with one that looked authored. The presets are legacy
     * now — `assets/world/world.md` holds the imagery — so a file that has
     * them keeps them exactly as they are, and one that does not is left
     * alone.
     */
  }

  return {
    brand: brand ?? input.brand ?? null,
    designTokens: dt ?? input.designTokens ?? null,
    animation: anim ?? input.animation ?? null,
    textStyles: ts ?? input.textStyles ?? null,
    changed,
  };
}
