/**
 * Path resolvers for solver-runtime state and DNA files.
 *
 * A solver is a `.slvr` file in the workspace; its runtime directory mirrors
 * the workspace-relative path of that file (with `/` → `_`), so a solver at
 * `Solvers/brand-voice.slvr` writes its conversation + manifest under
 * `.Syvon/Solvers/brand-voice/`.
 *
 * DNA paths are v6 brand-scoped — `activeBrandSlug` is required and routes
 * to `brands/{slug}/…`. Workspace-wide residuals (memory / signals) live
 * under `.Syvon/`.
 *
 * These helpers used to live in `@syvon/solver`; absorbed here alongside
 * `brand-folder-paths` now that the solver package has no remaining reason
 * to exist.
 */

import { basename, joinPath, normalizePath, pathStartsWith } from '../paths';
import { WS_SYVON, WS_SYVON_MEMORY, WS_SYVON_SIGNALS } from '../workspace-config';
import { getBrandFilePath } from './brand-folder-paths';
import type { DnaPaths } from './dna-context';

/* ── Solver-runtime paths ───────────────────────────────────────────────── */

function getWorkspaceRelativePath(workspaceRoot: string, solverPath: string): string {
  const root = normalizePath(workspaceRoot).replace(/\/+$/, '');
  const solver = normalizePath(solverPath);
  if (!root || !solver) return basename(solverPath).replace(/\.[^.]+$/, '') || 'solver';
  if (solver === root) return 'solver';
  if (!pathStartsWith(solver, root + '/')) {
    return basename(solverPath).replace(/\.[^.]+$/, '') || 'solver';
  }
  return solver.slice(root.length + 1);
}

/**
 * Derive a stable solver name from the `.slvr` path for use as the
 * `.Syvon/Solvers/{name}` directory. Workspace-relative path, lowercase,
 * path separators replaced with `_`.
 */
export function getSolverName(workspaceRoot: string, solverPath: string): string {
  const relative = getWorkspaceRelativePath(workspaceRoot, solverPath);
  const withoutExt = relative.toLowerCase().endsWith('.slvr')
    ? relative.slice(0, -5)
    : relative.replace(/\.[^.]+$/, '');
  const name = withoutExt.replace(/[/\\]+/g, '_').replace(/^_|_$/g, '') || 'solver';
  return name || 'solver';
}

export interface SolverDataPaths {
  root: string;
  inputDir: string;
  manifestPath: string;
  conversationPath: string;
}

/** Paths for solver data under `{workspaceRoot}/.Syvon/Solvers/{solver-name}/`. */
export function getSolverDataPaths(workspaceRoot: string, solverPath: string): SolverDataPaths {
  const name = getSolverName(workspaceRoot, solverPath);
  const root = joinPath(workspaceRoot, WS_SYVON, 'Solvers', name);
  return {
    root,
    inputDir: joinPath(root, 'input'),
    manifestPath: joinPath(root, 'manifest.json'),
    conversationPath: joinPath(root, 'conversation.chat'),
  };
}

/* ── DNA paths ──────────────────────────────────────────────────────────── */

/**
 * Get DNA file paths — absolute, prefixed with `workspaceRoot`.
 *
 * v6: `activeBrandSlug` is required. All brand-derived paths route to
 * `brands/{slug}/…`. Workspace-wide paths (memory / signals) stay under
 * `.Syvon/`. The `core`/`history` fields on `DnaPaths` are kept for
 * solver-runtime bookkeeping compatibility; they reference the dotfile
 * namespace only.
 */
export function getDnaPaths(workspaceRoot: string, activeBrandSlug: string): DnaPaths {
  return {
    core: joinPath(workspaceRoot, WS_SYVON),
    history: joinPath(workspaceRoot, WS_SYVON, 'History'),
    memory: joinPath(workspaceRoot, WS_SYVON, 'Memory'),
    signals: joinPath(workspaceRoot, WS_SYVON, 'Memory', 'signals.json'),
    masterAnim: joinPath(workspaceRoot, getBrandFilePath(activeBrandSlug, 'animation')),
    brand: joinPath(workspaceRoot, getBrandFilePath(activeBrandSlug, 'brand')),
    masterTokens: joinPath(workspaceRoot, getBrandFilePath(activeBrandSlug, 'figmaTokens')),
    masterDesignTokens: joinPath(workspaceRoot, getBrandFilePath(activeBrandSlug, 'designTokens')),
  };
}

/**
 * Workspace-relative DNA paths (no workspace root prefix). Use this when
 * passing paths to ToolContext (readFile/writeFile) which resolves paths
 * relative to workspace root internally.
 *
 * v6: `activeBrandSlug` is required. See `getDnaPaths` for the shape.
 */
export function getRelativeDnaPaths(activeBrandSlug: string): DnaPaths {
  return {
    core: WS_SYVON,
    history: `${WS_SYVON}/History`,
    memory: WS_SYVON_MEMORY,
    signals: WS_SYVON_SIGNALS,
    masterAnim: getBrandFilePath(activeBrandSlug, 'animation'),
    brand: getBrandFilePath(activeBrandSlug, 'brand'),
    masterTokens: getBrandFilePath(activeBrandSlug, 'figmaTokens'),
    masterDesignTokens: getBrandFilePath(activeBrandSlug, 'designTokens'),
  };
}
