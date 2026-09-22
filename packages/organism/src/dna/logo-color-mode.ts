/**
 * THE LOGO A COLOUR MODE WEARS.
 *
 * A logo slot that names no treatment (`{brand_logo}`, `{brand_lockup_stacked}`)
 * draws the `color` file. In a colour mode whose ground is the other way round
 * from the base palette that is the wrong mark: a light page's full-colour logo
 * on the dark mode's background. So a mode picks a treatment —
 *
 *   mode ground dark, base ground light   → `light` (reversed, for dark surfaces)
 *   mode ground light, base ground dark   → `dark`  (mono, for light surfaces)
 *   same ground as the base, or no mode   → no opinion (the slot's own treatment)
 *
 * — where a mode's ground is its `scheme` when declared, else the lightness of
 * its resolved `color.background`, and the base ground is always the latter.
 * A slot that names a treatment (`brand_logo_light`) is never overridden: the
 * design said which mark it wants.
 *
 * HOW IT TRAVELS. Slot values are resolved to files by the host, long before a
 * renderer knows which subtree paints in which mode. So the host also fills the
 * treatment-qualified companions (`brand_logo_light`, `brand_logo_dark`) — only
 * when they resolve to a DIFFERENT file than the slot itself
 * (`buildSlotMediaValues`) — and the renderer swaps `brand_logo` for its
 * companion inside a mode that wants it (`slotValuesForLogoTreatment`).
 */

import { isLogoSlot, synthesizeLogoManifest, type LogoVariantFiles } from './logo-manifest';
import { isLight } from './design-tokens/design-tokens-color-math';
import { resolveVariableForMode } from './design-tokens/design-tokens-modes';
import { DEFAULT_COLOR_MODE, type DesignTokensV2 } from './design-tokens/design-tokens-v2-types';

/** The treatments a colour mode can ask a logo for. */
export type LogoModeTreatment = 'light' | 'dark';
export const LOGO_MODE_TREATMENTS: readonly LogoModeTreatment[] = ['light', 'dark'];

/** Same qualifiers `classifyLogoSlot` reads a treatment from. */
const NAMED_TREATMENT_RE = /light|white|reverse|revers|invert|knockout|negative|\bneg\b|\bdark\b|black|mono/i;

/** Whether a logo slot name already says which treatment it wants. */
export function logoSlotNamesTreatment(name: string): boolean {
  return NAMED_TREATMENT_RE.test(name);
}

/** `brand_logo` → `brand_logo_light`. */
export function logoSlotWithTreatment(name: string, treatment: LogoModeTreatment): string {
  return `${name}_${treatment}`;
}

/** A logo slot a mode may re-point: a logo slot naming no treatment. */
export function isModeableLogoSlot(name: string): boolean {
  return isLogoSlot(name) && !logoSlotNamesTreatment(name);
}

const silent = { warn: () => {} };

/** The logo treatment `mode` asks for on `tokens`, or null for no opinion. */
export function logoTreatmentForColorMode(
  tokens: DesignTokensV2 | null | undefined,
  mode: string | null | undefined,
): LogoModeTreatment | null {
  if (!tokens?.variables || !mode || mode === DEFAULT_COLOR_MODE) return null;
  const base = tokens.variables['color.background']?.value;
  if (typeof base !== 'string' || !/^#[0-9a-f]{3,8}$/i.test(base.trim())) return null;
  const baseDark = !isLight(base.trim());

  const scheme = tokens.modes?.[mode]?.scheme;
  let modeDark: boolean;
  if (scheme === 'dark' || scheme === 'light') {
    modeDark = scheme === 'dark';
  } else {
    const ground = resolveVariableForMode(tokens, 'color.background', mode, silent);
    if (!/^#[0-9a-f]{3,8}$/i.test(ground.trim())) return null;
    modeDark = !isLight(ground.trim());
  }
  if (modeDark === baseDark) return null;
  return modeDark ? 'light' : 'dark';
}

/**
 * Slot values as a subtree painting in `treatment` sees them: every modeable
 * logo slot whose companion is filled reads the companion. Returns the input by
 * identity when nothing changes (stable for memo deps).
 */
export function slotValuesForLogoTreatment<T extends Record<string, string> | null | undefined>(
  slotValues: T,
  treatment: LogoModeTreatment | null,
): T {
  if (!slotValues || !treatment) return slotValues;
  let out: Record<string, string> | null = null;
  for (const key of Object.keys(slotValues)) {
    if (!isModeableLogoSlot(key)) continue;
    const companion = slotValues[logoSlotWithTreatment(key, treatment)];
    if (!companion || companion === slotValues[key]) continue;
    out ??= { ...slotValues };
    out[key] = companion;
  }
  return (out ?? slotValues) as T;
}

/** The light / dark marks a brand has for its base logo — each only when it is a distinct file. */
export interface LogoModeVariants {
  light?: string;
  dark?: string;
}

const baseName = (p: string) => p.split(/[?#]/)[0]!.split(/[\\/]/).pop() ?? p;

/**
 * THE COMPANIONS OF A LOGO, FROM A FLAT FILE LIST — for hosts that know the
 * brand's logo files (a DB listing, a folder) but never run
 * `buildSlotMediaValues`, and so hand players a bare `{ brand_logo }`.
 *
 * `files` are keys or URLs in any form; each is classified by its BASENAME
 * only (a brand slug or folder called `dark-studio` must not make every file a
 * dark mark). A companion is the file of the SAME variant and orientation as
 * `base` in that treatment — never a fallback: a reversed symbol is not a stand
 * in for a lockup, and a design laid out for one would break with the other.
 * Returned entries are the original strings from `files`.
 */
export function logoModeVariantsFromFiles(files: readonly string[], base: string | null | undefined): LogoModeVariants {
  if (!base || files.length === 0) return {};
  const byName = new Map<string, string>();
  for (const f of files) {
    const n = baseName(f);
    if (!byName.has(n)) byName.set(n, f);
  }
  const manifest = synthesizeLogoManifest([...byName.keys()]);
  if (!manifest) return {};
  const baseFile = baseName(base);

  let files0: LogoVariantFiles | undefined;
  let baseKey: keyof LogoVariantFiles | undefined;
  for (const variant of Object.values(manifest.variants)) {
    const hit = (Object.entries(variant ?? {}) as [keyof LogoVariantFiles, string][]).find(([, f]) => f === baseFile);
    if (hit) { files0 = variant; baseKey = hit[0]; break; }
  }
  if (!files0 || !baseKey) return {};
  const stacked = String(baseKey).startsWith('stacked');

  const out: LogoModeVariants = {};
  for (const t of LOGO_MODE_TREATMENTS) {
    const key = (stacked ? `stacked-${t}` : t) as keyof LogoVariantFiles;
    const file = files0[key];
    if (file && file !== baseFile) out[t] = byName.get(file)!;
  }
  return out;
}

/**
 * The slot map a player wants for a brand's logo: `{ brand_logo }` plus the
 * `brand_logo_light` / `brand_logo_dark` companions a colour mode swaps in
 * (`slotValuesForLogoTreatment`). `null` without a logo — never a
 * `{ brand_logo: undefined }` that renders the slot literal.
 */
export function brandLogoSlotValues(
  logo: string | null | undefined,
  variants?: LogoModeVariants | null,
): Record<string, string> | null {
  if (!logo) return null;
  const values: Record<string, string> = { brand_logo: logo };
  for (const t of LOGO_MODE_TREATMENTS) {
    const v = variants?.[t];
    if (v && v !== logo) values[logoSlotWithTreatment('brand_logo', t)] = v;
  }
  return values;
}
