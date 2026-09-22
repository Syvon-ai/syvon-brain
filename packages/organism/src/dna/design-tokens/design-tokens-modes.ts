/**
 * COLOUR MODES — resolving a registry for one mode.
 *
 * A token file can carry named modes (`light`, `print`, …) as per-variable
 * `modes` maps beside the base `value`. Nothing downstream reads those maps:
 * `registryToDna`, the text-style resolver, the cycle sampler, the sandbox
 * realm and the HTML theme all read `variable.value`. So a mode is applied
 * the one way every one of those lanes already honours — by handing them a
 * registry whose `value`s ARE the mode's.
 *
 * ── Why the output strips `modes` ─────────────────────────────────────────
 *
 * The engine touches a registry at two or three nesting levels (renderer →
 * brand scope → DnaProvider, text styles and anim alongside). If the resolved
 * copy kept its `modes`, the second pass would re-resolve
 * `{ ref: 'color.background', mode: 'default' }` against a `color.background`
 * that is already the light one — and un-swap it. Stripping, plus the
 * `resolvedMode` marker, makes resolution idempotent: a mode is chosen once
 * per lane, and a flat registry passes through every later resolution
 * untouched.
 *
 * ── References ────────────────────────────────────────────────────────────
 *
 * `{ ref }` resolves the target in the mode being resolved; `{ ref, mode }`
 * pins the source mode (`default` = the base `value`). A cycle, a missing
 * target, a target of the wrong type or a chain deeper than
 * `MAX_MODE_REF_DEPTH` falls back to the variable's OWN base value and warns
 * — a broken mode degrades to the default palette, never to blank.
 */

import {
  DEFAULT_COLOR_MODE,
  type DesignTokensV2,
  type RegistryVariable,
} from './design-tokens-v2-types';

export interface ModeResolveWarning {
  variable: string;
  mode: string;
  reason: 'cycle' | 'missing-ref' | 'ref-type' | 'depth' | 'blank';
  ref?: string;
  message: string;
}

export interface ResolveModeOptions {
  warn?: (w: ModeResolveWarning) => void;
}

export const MAX_MODE_REF_DEPTH = 8;

/** Which target types a reference from `source` may land on. */
function refTypeAllowed(source: RegistryVariable, target: RegistryVariable): boolean {
  // A cycle's `value` is its resting colour, so a colour may point at one.
  if (source.type === 'color') return target.type === 'color' || target.type === 'cycle';
  return target.type === source.type;
}

function walk(
  dt: DesignTokensV2,
  name: string,
  mode: string,
  stack: string[],
  origin: { variable: string; mode: string },
  warn: ResolveModeOptions['warn'],
): string | null {
  const v = dt.variables[name];
  if (!v) return null;
  if (mode === DEFAULT_COLOR_MODE) return v.value;

  const entry = v.modes?.[mode];
  if (!entry) return v.value;

  if ('value' in entry) {
    if (entry.value) return entry.value;
    warn?.({ ...origin, reason: 'blank', message: `"${name}" has a blank value in mode "${mode}"` });
    return v.value;
  }

  const key = `${name}@${mode}`;
  if (stack.includes(key)) {
    warn?.({ ...origin, reason: 'cycle', ref: entry.ref, message: `Mode reference cycle: ${[...stack, key].join(' → ')}` });
    return null;
  }
  if (stack.length >= MAX_MODE_REF_DEPTH) {
    warn?.({ ...origin, reason: 'depth', ref: entry.ref, message: `Mode reference chain from "${origin.variable}" is deeper than ${MAX_MODE_REF_DEPTH}` });
    return null;
  }
  const target = dt.variables[entry.ref];
  if (!target) {
    warn?.({ ...origin, reason: 'missing-ref', ref: entry.ref, message: `"${name}" in mode "${mode}" references "${entry.ref}", which does not exist` });
    return null;
  }
  if (!refTypeAllowed(v, target)) {
    warn?.({ ...origin, reason: 'ref-type', ref: entry.ref, message: `"${name}" (${v.type}) cannot reference "${entry.ref}" (${target.type})` });
    return null;
  }
  return walk(dt, entry.ref, entry.mode ?? mode, [...stack, key], origin, warn);
}

/**
 * One variable's value in one mode. Returns `''` for a variable that does not
 * exist; otherwise always a value (the base one when the mode's entry is
 * broken).
 */
export function resolveVariableForMode(
  dt: DesignTokensV2,
  name: string,
  mode: string | null | undefined,
  opts: ResolveModeOptions = {},
): string {
  const v = dt.variables[name];
  if (!v) return '';
  if (!mode || mode === DEFAULT_COLOR_MODE) return v.value;
  return walk(dt, name, mode, [], { variable: name, mode }, opts.warn) || v.value;
}

/**
 * The registry as it reads in `mode` — flat: every `value` is the mode's, no
 * variable carries `modes`, and `resolvedMode` records which mode it is.
 *
 * Returns `dt` itself (identity) for no mode, `default`, or an already
 * resolved registry.
 */
export function resolveRegistryForMode(
  dt: DesignTokensV2,
  mode: string | null | undefined,
  opts: ResolveModeOptions = {},
): DesignTokensV2 {
  if (!mode || mode === DEFAULT_COLOR_MODE) return dt;
  if (dt.resolvedMode !== undefined) return dt;

  const variables: Record<string, RegistryVariable> = {};
  for (const [name, v] of Object.entries(dt.variables)) {
    if (!v.modes) {
      variables[name] = v;
      continue;
    }
    const { modes: _modes, ...rest } = v;
    variables[name] = {
      ...rest,
      value: walk(dt, name, mode, [], { variable: name, mode }, opts.warn) || v.value,
    };
  }
  return { ...dt, variables, resolvedMode: mode };
}

/**
 * Every mode the registry knows: declared ones in declaration order, then any
 * used on a variable but never declared, sorted. Never `default`.
 */
export function listModes(dt: DesignTokensV2 | null | undefined): string[] {
  if (!dt) return [];
  const declared = Object.keys(dt.modes ?? {}).filter((m) => m !== DEFAULT_COLOR_MODE);
  const seen = new Set(declared);
  const used: string[] = [];
  for (const v of Object.values(dt.variables ?? {})) {
    for (const m of Object.keys(v.modes ?? {})) {
      if (m === DEFAULT_COLOR_MODE || seen.has(m)) continue;
      seen.add(m);
      used.push(m);
    }
  }
  return [...declared, ...used.sort()];
}

export function hasColorModes(dt: DesignTokensV2 | null | undefined): boolean {
  return listModes(dt).length > 0;
}
