/**
 * APPLYING A FLAT `{ tokenKey: value }` DIFF ONTO THE REGISTRY — one copy.
 *
 * Every brand editor commits the same shape: the palette card, the typography
 * card, the spacing preset, and `BrandTokensEditor`'s type and spacing groups
 * all hand back only the keys that moved. What happens next — read
 * `design-tokens.json`, merge, write it back — used to live only in
 * `@syvon/agent-server`, next to the R2 client that does the reading, so a host
 * that reads its workspace some other way (vessel writes through its own file
 * route; a local checkout writes to disk) could not reuse the one part that is
 * genuinely shared: the merge itself.
 *
 * It is pure, and it belongs beside the registry's own types. `commitBrandTokens`
 * in agent-server is now the R2 read-modify-write around this.
 */

import {
  COLOR_MODE_NAME_RE,
  DEFAULT_COLOR_MODE,
  isModeValue,
  type DesignTokensV2,
  type ModeMeta,
  type ModeValue,
  type RegistryVariable,
  type VariableType,
} from './design-tokens-v2-types';

/**
 * One entry of a diff. A string is a value; a `ModeValue` can carry a
 * reference; a `ModeMeta` declares a mode; `null` clears a mode entry or a
 * mode declaration.
 *
 * The KEY decides where it lands:
 *
 *   `color.text`        the base value                    string | { value }
 *   `color.text@light`  that variable in the `light` mode string | ModeValue | null
 *   `@light`            the `light` mode's declaration    ModeMeta | null
 *
 * A key rather than a second field so every host that already commits a flat
 * `{ tokenKey: value }` diff — the palette card, the tokens editor, the routes —
 * carries modes with no new plumbing. `diffTokenRegistries` turns any edit of
 * a whole registry (adding a mode, renaming one) into this same diff.
 */
export type TokenChange = string | ModeValue | ModeMeta | null;

export function isModeMeta(v: unknown): v is ModeMeta {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  if (Object.keys(o).some((k) => k !== 'label' && k !== 'scheme')) return false;
  if (o.label !== undefined && typeof o.label !== 'string') return false;
  if (o.scheme !== undefined && o.scheme !== 'light' && o.scheme !== 'dark') return false;
  return true;
}

/** A value a route may accept in a diff — shape only; `mergeTokenChanges` checks where it lands. */
export function isTokenChange(v: unknown): v is TokenChange {
  return v === null || typeof v === 'string' || isModeValue(v) || isModeMeta(v);
}

/** `color.text@light` → `{ name: 'color.text', mode: 'light' }`; `@default` is the bare key. */
export function parseTokenChangeKey(key: string): { name: string; mode: string | null } {
  const at = key.lastIndexOf('@');
  if (at === -1) return { name: key, mode: null };
  const name = key.slice(0, at);
  const mode = key.slice(at + 1);
  if (!name) throw new Error(`Invalid token key "${key}"`);
  if (mode === DEFAULT_COLOR_MODE) return { name, mode: null };
  if (!COLOR_MODE_NAME_RE.test(mode)) throw new Error(`Invalid colour mode name "${mode}" in "${key}"`);
  return { name, mode };
}

/**
 * A NEW key's type, from its namespace. An existing key keeps the type it
 * already declares — the diff carries values, never types, and inferring over
 * a declared one would quietly retype a variable a brand had set deliberately.
 */
export function inferVariableType(key: string): VariableType {
  if (key.startsWith('color.')) return 'color';
  if (key.startsWith('font.')) return 'font';
  if (key.startsWith('weight.')) return 'weight';
  if (key.startsWith('size.')) return 'size';
  if (key.startsWith('stretch.')) return 'stretch';
  // NOTE: `gradient.` is missing here and infers 'color' — a pre-existing gap,
  // left alone rather than fixed in passing.
  if (key.startsWith('cycle.')) return 'cycle';
  return 'color';
}

/** Apply `{ tokenKey: value }` changes onto a registry, preserving existing
 *  types, labels and mode entries. Pure — the caller owns reading and writing
 *  the file. Throws on a change it cannot apply rather than dropping it. */
export function mergeTokenChanges(
  tokens: DesignTokensV2,
  changes: Record<string, TokenChange>,
): DesignTokensV2 {
  // A resolved registry has the mode's values in `value` and no `modes` —
  // saving it would overwrite the brand's base palette with one mode's.
  if (tokens.resolvedMode !== undefined) {
    throw new Error('mergeTokenChanges: refusing to write a mode-resolved registry — merge onto the raw design-tokens.json');
  }
  const variables = { ...tokens.variables };
  let modeMeta = tokens.modes ? { ...tokens.modes } : undefined;
  for (const [key, change] of Object.entries(changes)) {
    if (key.startsWith('@')) {
      const mode = key.slice(1);
      if (!COLOR_MODE_NAME_RE.test(mode)) throw new Error(`Invalid colour mode name "${mode}"`);
      if (change === null) {
        if (modeMeta) delete modeMeta[mode];
      } else if (isModeMeta(change)) {
        modeMeta = { ...(modeMeta ?? {}), [mode]: { ...change } };
      } else {
        throw new Error(`"${key}": a mode declaration takes { label?, scheme? } or null`);
      }
      continue;
    }
    const { name, mode } = parseTokenChangeKey(key);
    const existing: RegistryVariable | undefined = variables[name];

    if (mode === null) {
      if (change === null) throw new Error(`Cannot clear "${name}" — remove the variable instead`);
      let value: string;
      if (typeof change === 'string') value = change;
      else if (isModeValue(change) && 'value' in change) value = change.value;
      else throw new Error(`"${name}": a base value must be a literal, not a reference`);
      variables[name] = existing ? { ...existing, value } : { type: inferVariableType(name), value };
      continue;
    }

    // Never create a variable from a mode entry: its base `value` would be
    // blank, and a blank value renders black on the headless stage.
    if (!existing) throw new Error(`Cannot set mode "${mode}" on "${name}" — set its base value first`);
    const modes = { ...(existing.modes ?? {}) };
    if (change === null) {
      delete modes[mode];
    } else if (typeof change === 'string') {
      modes[mode] = { value: change };
    } else if (isModeValue(change)) {
      if (!('value' in change) && change.mode !== undefined && change.mode !== DEFAULT_COLOR_MODE && !COLOR_MODE_NAME_RE.test(change.mode)) {
        throw new Error(`"${key}": invalid source mode "${change.mode}"`);
      }
      modes[mode] = 'value' in change
        ? { value: change.value }
        : change.mode !== undefined ? { ref: change.ref, mode: change.mode } : { ref: change.ref };
    } else {
      throw new Error(`"${key}": not a value or a reference`);
    }
    const { modes: _old, ...rest } = existing;
    variables[name] = Object.keys(modes).length > 0 ? { ...rest, modes } : rest;
  }
  const next: DesignTokensV2 = { ...tokens, variables };
  if (modeMeta && Object.keys(modeMeta).length > 0) next.modes = modeMeta;
  else delete next.modes;
  return next;
}

/**
 * The diff that turns `before` into `after` — values, mode entries and mode
 * declarations. What an editor commits after a whole-registry operation
 * (`deriveModeFromPalette`, `renameColorMode`, `removeColorMode`), so the
 * write still goes through the same read-merge-write as a single swatch.
 *
 * Variables `after` does not have are not deleted (a diff cannot say that).
 */
export function diffTokenRegistries(before: DesignTokensV2, after: DesignTokensV2): Record<string, TokenChange> {
  const changes: Record<string, TokenChange> = {};
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

  for (const mode of new Set([...Object.keys(before.modes ?? {}), ...Object.keys(after.modes ?? {})])) {
    const a = before.modes?.[mode];
    const b = after.modes?.[mode];
    if (!same(a, b)) changes[`@${mode}`] = b ?? null;
  }
  for (const [name, v] of Object.entries(after.variables)) {
    const prev = before.variables[name];
    if (!prev || prev.value !== v.value) changes[name] = v.value;
    for (const mode of new Set([...Object.keys(prev?.modes ?? {}), ...Object.keys(v.modes ?? {})])) {
      const a = prev?.modes?.[mode];
      const b = v.modes?.[mode];
      if (!same(a, b)) changes[`${name}@${mode}`] = b ?? null;
    }
  }
  return changes;
}
