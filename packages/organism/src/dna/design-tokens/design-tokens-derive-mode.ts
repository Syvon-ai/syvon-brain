/**
 * SEEDING A COLOUR MODE FROM THE BRAND'S OWN PALETTE.
 *
 * "Add a light mode" should not start from an empty column of swatches. The
 * `invert` strategy writes the mode a designer would sketch first: the ground
 * and the ink trade places, and the colours that sit between them are
 * re-derived for the new ground.
 *
 * The swap is written as REFERENCES to the default mode, not as copied hex:
 * `color.text` in the new mode is `{ ref: 'color.background', mode: 'default' }`.
 * Change the brand's background later and the inverted text follows it. The
 * in-between colours (surface, muted text, border) have no single source to
 * point at, so they are literals — a snapshot of the palette at the moment the
 * mode was added, the same caveat a literal gradient stop carries.
 *
 * The accents (primary … quaternary) get no entry: absent means "same as
 * default", which is what a brand colour should do across modes until someone
 * decides otherwise.
 */

import { liftSurface, opacityBlend } from './design-tokens-color-math';
import {
  COLOR_MODE_NAME_RE,
  DEFAULT_COLOR_MODE,
  type DesignTokensV2,
  type ModeValue,
  type RegistryVariable,
} from './design-tokens-v2-types';
import { resolveVariableForMode } from './design-tokens-modes';

export type DeriveModeStrategy = 'invert' | 'empty';

export interface DeriveModeOptions {
  name: string;
  /** `invert` (default) seeds the swap; `empty` only declares the mode. */
  strategy?: DeriveModeStrategy;
  label?: string;
  /**
   * Whether the mode reads light or dark. NOT inferred: setting it is what binds
   * the mode to a visitor's OS setting on a website (`prefers-color-scheme`), so
   * an inverted mode added from the palette card must not opt a site in by
   * itself. Set it explicitly (the tokens editor's scheme select) to opt in.
   */
  scheme?: 'light' | 'dark';
  /** Replace an existing mode's entries instead of throwing. */
  overwrite?: boolean;
}

function titleCase(name: string): string {
  return name.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

export function deriveModeFromPalette(dt: DesignTokensV2, opts: DeriveModeOptions): DesignTokensV2 {
  const { name } = opts;
  if (!COLOR_MODE_NAME_RE.test(name)) {
    throw new Error(`Invalid colour mode name "${name}" — lowercase letters, digits and hyphens; "${DEFAULT_COLOR_MODE}" is reserved`);
  }
  if (dt.resolvedMode !== undefined) {
    throw new Error('deriveModeFromPalette: registry is already resolved to a mode');
  }
  const exists = !!dt.modes?.[name]
    || Object.values(dt.variables).some((v) => v.modes && name in v.modes);
  if (exists && !opts.overwrite) throw new Error(`Colour mode "${name}" already exists`);

  // Clear any previous entries for this mode first, so `overwrite` is a
  // replacement and not a merge that leaves stale literals behind.
  const base = removeColorMode(dt, name);
  const variables = { ...base.variables };
  const strategy = opts.strategy ?? 'invert';
  const bg = resolveVariableForMode(base, 'color.background', DEFAULT_COLOR_MODE);
  const text = resolveVariableForMode(base, 'color.text', DEFAULT_COLOR_MODE);
  const newBg = strategy === 'invert' && text ? text : bg;

  const set = (key: string, mv: ModeValue) => {
    const v = variables[key];
    if (!v || v.type !== 'color') return;
    variables[key] = { ...v, modes: { ...(v.modes ?? {}), [name]: mv } };
  };

  if (strategy === 'invert' && bg && text) {
    const newText = bg;
    set('color.text', { ref: 'color.background', mode: DEFAULT_COLOR_MODE });
    set('color.background', { ref: 'color.text', mode: DEFAULT_COLOR_MODE });
    set('color.canvas', { ref: 'color.text', mode: DEFAULT_COLOR_MODE });
    set('color.surface', { value: liftSurface(newBg) });
    set('color.textMuted', { value: opacityBlend(newText, 0.6, newBg) });
    set('color.border', { value: opacityBlend(newText, 0.15, newBg) });
  }

  return {
    ...base,
    modes: {
      ...(base.modes ?? {}),
      [name]: {
        label: opts.label ?? titleCase(name),
        ...(opts.scheme ? { scheme: opts.scheme } : {}),
      },
    },
    variables,
  };
}

/** Remove a mode everywhere — its declaration and every variable's entry. */
export function removeColorMode(dt: DesignTokensV2, name: string): DesignTokensV2 {
  const variables: Record<string, RegistryVariable> = {};
  for (const [key, v] of Object.entries(dt.variables)) {
    if (v.modes && name in v.modes) {
      const { [name]: _drop, ...restModes } = v.modes;
      const { modes: _m, ...rest } = v;
      variables[key] = Object.keys(restModes).length > 0 ? { ...rest, modes: restModes } : rest;
    } else {
      variables[key] = v;
    }
  }
  const next: DesignTokensV2 = { ...dt, variables };
  if (dt.modes) {
    const { [name]: _drop, ...restModes } = dt.modes;
    if (Object.keys(restModes).length > 0) next.modes = restModes;
    else delete next.modes;
  }
  return next;
}

/**
 * Rename a mode everywhere — its declaration, every variable's entry, and
 * every reference pinned to it (`{ ref, mode: old }`).
 */
export function renameColorMode(dt: DesignTokensV2, from: string, to: string): DesignTokensV2 {
  if (from === to) return dt;
  if (!COLOR_MODE_NAME_RE.test(to)) throw new Error(`Invalid colour mode name "${to}"`);
  const taken = !!dt.modes?.[to] || Object.values(dt.variables).some((v) => v.modes && to in v.modes);
  if (taken) throw new Error(`Colour mode "${to}" already exists`);

  const renameEntries = (modes: Record<string, ModeValue>): Record<string, ModeValue> => {
    const out: Record<string, ModeValue> = {};
    for (const [m, mv] of Object.entries(modes)) {
      const fixed: ModeValue = 'ref' in mv && mv.mode === from ? { ref: mv.ref, mode: to } : mv;
      out[m === from ? to : m] = fixed;
    }
    return out;
  };

  const variables: Record<string, RegistryVariable> = {};
  for (const [key, v] of Object.entries(dt.variables)) {
    variables[key] = v.modes ? { ...v, modes: renameEntries(v.modes) } : v;
  }
  const next: DesignTokensV2 = { ...dt, variables };
  if (dt.modes) {
    next.modes = Object.fromEntries(Object.entries(dt.modes).map(([m, meta]) => [m === from ? to : m, meta]));
  }
  return next;
}
