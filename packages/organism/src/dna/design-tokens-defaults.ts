import { APP_DEFAULTS, DEFAULT_V2_REGISTRY, DEFAULT_COLORS, DEFAULT_FONTS } from './defaults/design-tokens';
import { isV2 } from './design-tokens/design-tokens-v2-types';
import type { DesignTokensV2 } from './design-tokens/design-tokens-v2-types';

export { APP_DEFAULTS, DEFAULT_V2_REGISTRY, DEFAULT_COLORS, DEFAULT_FONTS };

/**
 * Returns true if the given (parsed) design-tokens data differs from defaults.
 * Works for both v2 registry and v1 shapes.
 *
 * - If v2: compares variable values against DEFAULT_V2_REGISTRY.
 * - If v1 or unknown: returns true (assume custom — safe default).
 *
 * Use this before overwriting design-tokens.json to avoid destroying
 * user customizations.
 */
export function isRegistryCustom(data: unknown): boolean {
  if (!data || typeof data !== 'object') return true;

  if (!isV2(data)) return true; // v1 or unknown → assume custom

  const dt = data as DesignTokensV2;
  const defaultVars = DEFAULT_V2_REGISTRY.variables;

  // Anything authored BESIDE a value is a customization the defaults never
  // carry: a colour mode, a cycle ramp, a role nickname. Comparing values
  // alone called a brand whose only authoring was a light mode "default" —
  // and a recompile would have overwritten it.
  if (dt.modes && Object.keys(dt.modes).length > 0) return true;

  for (const [name, variable] of Object.entries(dt.variables)) {
    const def = defaultVars[name];
    if (!def) return true; // extra variable → custom
    if (variable.value !== def.value) return true;
    if (variable.modes && Object.keys(variable.modes).length > 0) return true;
    if (variable.cycle || (variable.aka && variable.aka.length > 0)) return true;
  }

  // Check if any default variables are missing
  for (const name of Object.keys(defaultVars)) {
    if (!(name in dt.variables)) return true;
  }

  return false;
}
