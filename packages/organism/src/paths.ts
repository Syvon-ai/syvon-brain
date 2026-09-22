/**
 * Canonical cross-platform path utilities for @syvon/organism.
 * Consolidates implementations from:
 *   - packages/agent/src/utils/path.ts
 *   - packages/organism/src/dna/path-utils.ts
 *   - packages/schema-engine/src/core/path-utils.ts
 */
// Inline workspace-root check to avoid circular dep with workspace-config.ts
// (workspace-config.ts imports from this file). MUST stay in sync with
// WORKSPACE_ROOT_PREFIXES in workspace-config.ts — guarded by paths.test.ts.
// Includes the v11 brand roots (config/, meta/, wrapper/, knowledge/) so an
// absolute brand reference in a .seq/.comp is treated as workspace-relative
// rather than joined to seqDir — miss one and `config/brand.json` resolves to
// `workflows/deck/config/brand.json`, which simply is not there.
//
// `brands/` stays listed though it is retired: a surviving reference should
// resolve to the (empty) root folder and 404 honestly, not silently become a
// path under whatever directory the .seq happens to live in.
const WS_ROOT_RE = /^(templates|projects|workflows|flows|content|brands|assets|config|meta|wrapper|knowledge|widget|ui|import|admin|skills|agents|\.syvon|\.renders|\.meta|posts|sessions|tools)\//i;

/**
 * Normalize path to forward slashes, collapse duplicate slashes, trim whitespace.
 * Preserves UNC prefix (// stays as //).
 */
export function normalizePath(p: string): string {
  if (!p) return '';
  const trimmed = p.trim();
  if (!trimmed) return '';
  // Convert all backslashes to forward slashes
  const converted = trimmed.replace(/\\/g, '/');
  // Check if this is a UNC path (starts with //)
  if (converted.startsWith('//')) {
    // Preserve the leading //, then collapse any remaining duplicate slashes
    const rest = converted.slice(2).replace(/\/+/g, '/');
    return '//' + rest;
  }
  // Collapse all duplicate slashes
  return converted.replace(/\/+/g, '/');
}

/**
 * Resolve dot segments (. and ..) in a path string.
 */
export function normalizeDotSegments(p: string): string {
  const s = p.includes('/') ? '/' : '\\';
  const parts = p.split(/[/\\]/);
  const result: string[] = [];
  for (const part of parts) {
    if (part === '..') {
      // Pop if there is something to pop that is NOT the root anchor.
      // Root anchor = empty string (leading slash) or drive letter (e.g. 'C:').
      const last = result[result.length - 1];
      const isRootAnchor = last === '' || (last !== undefined && /^[a-zA-Z]:$/.test(last));
      if (result.length > 0 && !isRootAnchor) {
        result.pop();
      }
    } else if (part !== '.') {
      result.push(part);
    }
  }
  return result.join(s);
}

/**
 * Normalize a workspace root path: convert backslashes, resolve dot segments,
 * strip trailing slash (unless it is a bare drive root like C:/).
 * Returns '' for empty input.
 */
export function normalizeRoot(p: string): string {
  if (!p) return '';
  const trimmed = p.trim();
  if (!trimmed) return '';
  // First normalize to forward slashes and collapse duplicates
  const normalized = normalizePath(trimmed);
  // Resolve dot segments
  const resolved = normalizeDotSegments(normalized);
  // Strip trailing slash unless it is a bare drive root (e.g. C:/)
  if (/^[a-zA-Z]:\/+$/.test(resolved)) {
    // Preserve bare drive root as X:/
    return resolved.replace(/\/+$/, '/');
  }
  return resolved.replace(/\/+$/, '');
}

/**
 * Join path segments always using forward slashes.
 * Collapses duplicate separators. Empty parts are skipped.
 */
export function joinPath(...parts: string[]): string {
  if (parts.length === 0) return '';
  return parts
    .map(p => p.replace(/\\/g, '/'))
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/');
}

/**
 * Return true if path starts with prefix (case-insensitive).
 */
export function pathStartsWith(path: string, prefix: string): boolean {
  return path.toLowerCase().startsWith(prefix.toLowerCase());
}

/**
 * Return the path portion after stripping rootPath (case-insensitive).
 * Returns '.' for exact match, original path if not under root.
 */
export function relativeFrom(rootPath: string, absolutePath: string): string {
  const root = rootPath.replace(/[/\\]+$/, '').replace(/\\/g, '/');
  const abs = absolutePath.replace(/\\/g, '/');
  if (!root || !abs) return absolutePath;
  const lowerRoot = root.toLowerCase();
  const lowerAbs = abs.toLowerCase();
  if (!lowerAbs.startsWith(lowerRoot)) return absolutePath;
  let i = 0;
  while (i < root.length && i < abs.length && lowerRoot[i] === lowerAbs[i]) i++;
  const suffix = abs.slice(i).replace(/^\/+/, '');
  return suffix || '.';
}

/**
 * Compute the relative path from baseDir to targetPath (case-insensitive segment comparison).
 */
export function pathRelative(baseDir: string, targetPath: string): string {
  const base = baseDir.replace(/\\/g, '/').replace(/\/+$/, '');
  const target = targetPath.replace(/\\/g, '/');
  if (!base) return target.replace(/^\/+/, '');
  const a = base.split('/').filter(s => s && s !== '.');
  const b = target.split('/').filter(s => s && s !== '.');
  let i = 0;
  while (i < a.length && i < b.length && a[i]!.toLowerCase() === b[i]!.toLowerCase()) i++;
  const ups = a.length - i;
  const down = b.slice(i);
  const segments = [...Array(ups).fill('..'), ...down];
  return segments.length ? segments.join('/') : '.';
}

/** Parent directory (cross-platform — preserves the separator style of the input). */
export function dirname(p: string): string {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  if (i <= 0) return p;
  return p.slice(0, i);
}

/** Basename of path, optionally stripping an extension. */
export function basename(p: string, ext?: string): string {
  const name = p.split(/[/\\]/).pop() ?? p;
  if (ext && name.endsWith(ext)) return name.slice(0, -ext.length);
  return name;
}

/** File extension including the dot, e.g. '.txt'. Returns '' if none. */
export function extname(p: string): string {
  const i = p.lastIndexOf('.');
  if (i <= 0) return '';
  return p.slice(i);
}

/** True if path is absolute (drive letter, unix root, or UNC). */
export function isAbsolutePath(p: string): boolean {
  if (!p || !p.trim()) return false;
  const t = p.trim();
  return /^[a-zA-Z]:[/\\]/.test(t) || t.startsWith('/');
}

/**
 * Convert a path to a workspace-relative path by stripping workspaceRoot.
 * Case-insensitive. Passes through relative paths unchanged.
 */
export function toWorkspaceRelPath(workspaceRoot: string, rawPath: string): string {
  const root = normalizeDotSegments(workspaceRoot.replace(/\\/g, '/').replace(/\/+$/, ''));
  const p = normalizeDotSegments(rawPath.replace(/\\/g, '/').trim());
  if (!root || !p) return p;
  const isAbs = /^[a-zA-Z]:[/\\]/.test(p) || p.startsWith('/');
  if (isAbs) {
    const lRoot = root.toLowerCase();
    const lPath = p.toLowerCase();
    if (lPath.startsWith(lRoot + '/') || lPath === lRoot) {
      return p.slice(root.length).replace(/^\/+/, '') || '.';
    }
    return p;
  }
  const rootLast = root.split('/').filter(Boolean).pop() ?? '';
  if (rootLast) {
    const prefix = rootLast + '/';
    if (p === rootLast) return '.';
    if (p.startsWith(prefix)) return p.slice(prefix.length);
    const pLower = p.toLowerCase();
    const prefixLower = prefix.toLowerCase();
    if (pLower === rootLast.toLowerCase()) return '.';
    if (pLower.startsWith(prefixLower)) return p.slice(prefix.length);
  }
  return p.replace(/^\/+/, '');
}

/**
 * Resolve relativePath against rootPath.
 * If relativePath is already absolute, returns it unchanged.
 * If rootPath is null/empty, returns relativePath.
 * Always uses forward slashes in the result.
 */
/**
 * Resolve an asset path referenced from a .seq file.
 * Workspace-root paths (Templates/, Library/, .Syvon/, etc.) stay as-is.
 * Relative paths (../, ./, plain) resolve against seqDir.
 * Always returns a workspace-relative path with forward slashes.
 */
export function resolveSeqAssetPath(seqDir: string, rawPath: string): string {
  const norm = rawPath.replace(/\\/g, '/');
  // Workspace-root paths — already workspace-relative
  if (WS_ROOT_RE.test(norm)) return norm;
  // Relative path — resolve against seqDir
  const combined = seqDir ? seqDir + '/' + norm : norm;
  return normalizeDotSegments(combined.replace(/\\/g, '/').replace(/\/+/g, '/'));
}

/**
 * Sanitize a raw file path: normalize slashes, strip leading slashes, resolve dots.
 * For use in workspace-file serving endpoints.
 */
export function sanitizeFilePath(rawPath: string): string {
  let p = rawPath.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
  return normalizeDotSegments(p);
}

/**
 * Format a byte count into a human-readable string (e.g. "1.5 MB").
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function resolvePath(rootPath: string | null, relativePath: string): string {
  if (!relativePath?.trim()) return relativePath;
  if (isAbsolutePath(relativePath)) return relativePath;
  if (!rootPath?.trim()) return relativePath;
  const base = rootPath.replace(/[/\\]+$/, '').replace(/\\/g, '/');
  const rel = relativePath.replace(/^[/\\]+/, '').replace(/\\/g, '/');
  const joined = `${base}/${rel}`.replace(/\/+/g, '/');
  return normalizeDotSegments(joined);
}
