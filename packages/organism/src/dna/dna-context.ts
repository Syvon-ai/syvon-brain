/**
 * Load all DNA files into a single context object for variable substitution.
 * Called once before substitution — not per-variable.
 */

import type { Brand } from './dna-types';
import { readDnaFile } from './dna-io';

/**
 * v6 DNA path bundle returned by `getDnaPaths(root, slug)` /
 * `getRelativeDnaPaths(slug)` in `@syvon/organism/dna/solver-paths`.
 *
 * All brand-derived paths (`brand`, `masterAnim`, `masterTokens`,
 * `masterDesignTokens`) route to `brands/{slug}/…`.
 * Workspace-wide state (`core`, `history`, `memory`, `signals`) lives
 * under `.Syvon/` and is used for solver-runtime bookkeeping.
 */
export interface DnaPaths {
  /** `.Syvon/` root — dotfile namespace for workspace runtime state. */
  core: string;
  /** `brands/{slug}/brand.json` — brand DNA (voice, visual, identity, …). */
  brand: string;
  /** `.Syvon/History` — solver-runtime bookkeeping. */
  history: string;
  /** `.Syvon/Memory` — solver-runtime bookkeeping. */
  memory: string;
  /** `.Syvon/Memory/signals.json` — workspace-wide runtime signals (DB-only in prod). */
  signals: string;
  /** `brands/{slug}/animation.json` — per-brand motion curves. */
  masterAnim: string;
  /** `brands/{slug}/figma-tokens.json` — per-brand Figma integration cache. */
  masterTokens: string;
  /** `brands/{slug}/design-tokens.json` — per-brand tokens. */
  masterDesignTokens: string;
}

export interface DnaContext {
  brand: Brand | null;
  designTokens: Record<string, unknown> | null;
}

/**
 * Load all DNA files from the workspace into a DnaContext.
 * Each file that's missing or invalid becomes null — no errors thrown.
 * Pass paths from getDnaPaths() (absolute) or getRelativeDnaPaths() (workspace-relative)
 * depending on whether readFile resolves paths internally.
 */
export async function loadDnaContext(
  readFile: (path: string) => Promise<string>,
  paths: DnaPaths
): Promise<DnaContext> {
  const [brand, designTokens] = await Promise.all([
    readDnaFile<Brand>(readFile, paths.brand),
    readDnaFile<Record<string, unknown>>(readFile, paths.masterDesignTokens).catch(() => null),
  ]);

  return { brand, designTokens };
}
