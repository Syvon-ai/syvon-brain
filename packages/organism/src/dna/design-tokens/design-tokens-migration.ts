import type { DesignTokens } from './design-tokens-types';
import { APP_DEFAULTS } from '../defaults/design-tokens';
import { opacityBlend } from './design-tokens-color-math';
import type { DesignTokensV2, RegistryVariable, VariableType } from './design-tokens-v2-types';

/* ── v1 derivation helpers (only used by migrateV1ToV2) ── */

/** Default spacing multipliers (each value is Nx baseUnit). */
const SPACING_MULTIPLIERS = {
  sm: 2, md: 4, lg: 8, xl: 16,
  pageMargin: 10, pageGap: 6, gridGap: 8,
} as const;

/** Parse a CSS px value (e.g. '16px') to a number, with a fallback. */
function parsePx(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = parseFloat(value.replace('px', ''));
  return Number.isFinite(n) ? n : fallback;
}

/** Round to nearest 0.5 px. */
function roundHalf(v: number): number {
  return Math.round(v * 2) / 2;
}

/** Format a px value: if it's an integer use '16px', otherwise '31.5px'. */
function fmtPx(v: number): string {
  return `${v}px`;
}

/** Merge partial v1 tokens with APP_DEFAULTS to get a complete DesignTokens. */
function mergeWithDefaults(partial: Partial<DesignTokens>): DesignTokens {
  return {
    $schema: partial.$schema ?? APP_DEFAULTS.$schema,
    colors: { ...APP_DEFAULTS.colors, ...partial.colors },
    fonts: { ...APP_DEFAULTS.fonts, ...partial.fonts },
    type: { ...APP_DEFAULTS.type, ...partial.type },
    spacing: { ...APP_DEFAULTS.spacing, ...partial.spacing },
    radius: { ...APP_DEFAULTS.radius, ...partial.radius },
    animation: { ...APP_DEFAULTS.animation, ...partial.animation },
  };
}

/**
 * Convert design-tokens/v1 to runtime Dna shape.
 * Only used by migrateV1ToV2 — not exported for general use.
 */
function designTokensToDna(tokens: DesignTokens) {
  const colors = tokens.colors ?? APP_DEFAULTS.colors!;
  const fonts = tokens.fonts ?? APP_DEFAULTS.fonts!;
  const canvas = colors.canvas ?? colors.background;
  const background = colors.background;
  const text = colors.text;

  const textMuted = opacityBlend(text, 0.6, background);
  const border = opacityBlend(colors.neutral, 0.25, background);

  const typeDefaults = APP_DEFAULTS.type!;
  const baseSize = parsePx(tokens.type?.baseSize ?? typeDefaults.baseSize, 16);
  const rawRatio = tokens.type?.scaleRatio ?? typeDefaults.scaleRatio!;
  const ratio = Math.min(2, Math.max(1, rawRatio));

  const displaySize = roundHalf(baseSize * Math.pow(ratio, 6));
  const h1Size      = roundHalf(baseSize * Math.pow(ratio, 5));
  const h2Size      = roundHalf(baseSize * Math.pow(ratio, 4));
  const h3Size      = roundHalf(baseSize * Math.pow(ratio, 3));
  const bodySize    = roundHalf(baseSize);
  const captionSize = roundHalf(baseSize / Math.pow(ratio, 0.5));

  const headingWeight = tokens.type?.headingWeight ?? typeDefaults.headingWeight!;
  const bodyWeight    = tokens.type?.bodyWeight ?? typeDefaults.bodyWeight!;

  const spacingDefaults = APP_DEFAULTS.spacing!;
  const baseUnit = parsePx(tokens.spacing?.baseUnit ?? spacingDefaults.baseUnit, 4);

  const mult = {
    ...SPACING_MULTIPLIERS,
    ...(tokens.spacing?.pageMargin  != null && { pageMargin:  tokens.spacing.pageMargin }),
    ...(tokens.spacing?.pageGap     != null && { pageGap:     tokens.spacing.pageGap }),
    ...(tokens.spacing?.gridGap     != null && { gridGap:     tokens.spacing.gridGap }),
  };

  const radiusDefaults = APP_DEFAULTS.radius!;
  const radiusBase = parsePx(tokens.radius?.base ?? radiusDefaults.base, 12);
  const scale = tokens.radius?.scale ?? radiusDefaults.scale!;

  let radiusSm: number;
  let radiusMd: number;
  let radiusLg: number;

  if (scale === 'uniform') {
    radiusSm = Math.round(radiusBase * 0.5);
    radiusMd = Math.round(radiusBase * 1.0);
    radiusLg = Math.round(radiusBase);
  } else {
    radiusSm = Math.round(radiusBase * 0.33);
    radiusMd = Math.round(radiusBase * 0.67);
    radiusLg = Math.round(radiusBase);
  }

  const textScale = baseSize / 16;
  const spacingScale = baseUnit / 4;

  return {
    colors: {
      primary: colors.primary,
      secondary: colors.secondary,
      tertiary: colors.tertiary ?? APP_DEFAULTS.colors.tertiary ?? '#F59E0B',
      quaternary: colors.quaternary ?? APP_DEFAULTS.colors.quaternary ?? '#22C55E',
      canvas,
      text,
      textMuted,
      border,
      background,
      surface: colors.surface,
    },
    fonts: {
      heading: `${fonts.heading}, system-ui, sans-serif`,
      body: `${fonts.body}, system-ui, sans-serif`,
    },
    typography: {
      displaySize: fmtPx(displaySize),
      h1Size: fmtPx(h1Size),
      h2Size: fmtPx(h2Size),
      h3Size: fmtPx(h3Size),
      bodySize: fmtPx(bodySize),
      captionSize: fmtPx(captionSize),
      displayWeight: '800',
      headingWeight,
      bodyWeight,
    },
    spacing: {
      sm:          fmtPx(mult.sm * baseUnit),
      md:          fmtPx(mult.md * baseUnit),
      lg:          fmtPx(mult.lg * baseUnit),
      xl:          fmtPx(mult.xl * baseUnit),
      pageMargin:  fmtPx(mult.pageMargin * baseUnit),
      pageGap:     fmtPx(mult.pageGap * baseUnit),
      gridGap:     fmtPx(mult.gridGap * baseUnit),
    },
    radius: {
      sm: fmtPx(radiusSm),
      md: fmtPx(radiusMd),
      lg: fmtPx(radiusLg),
    },
    textScale,
    spacingScale,
  };
}

/* ── V1 -> V2 migration ── */

function rv(type: VariableType, value: string, label?: string): RegistryVariable {
  return label ? { type, value, label } : { type, value };
}

/**
 * Migrate a design-tokens/v1 shape to a v2 global variable registry.
 * Runs `designTokensToDna()` one last time to compute all derived values,
 * then explodes the Dna into ~45 named variables.
 */
export function migrateV1ToV2(v1: Partial<DesignTokens>): DesignTokensV2 {
  const merged = mergeWithDefaults(v1);
  const dna = designTokensToDna(merged);

  const canvas = merged.colors.canvas ?? merged.colors.background;

  const variables: Record<string, RegistryVariable> = {
    // ── Colors (11) ──
    'color.primary':    rv('color', dna.colors.primary, 'Primary'),
    'color.secondary':  rv('color', dna.colors.secondary, 'Secondary'),
    'color.tertiary':   rv('color', dna.colors.tertiary, 'Tertiary'),
    'color.quaternary': rv('color', dna.colors.quaternary, 'Quaternary'),
    'color.canvas':     rv('color', canvas, 'Canvas'),
    'color.text':       rv('color', dna.colors.text, 'Text'),
    'color.textMuted':  rv('color', dna.colors.textMuted, 'Text Muted'),
    'color.border':     rv('color', dna.colors.border, 'Border'),
    'color.background': rv('color', dna.colors.background, 'Background'),
    'color.surface':    rv('color', dna.colors.surface, 'Surface'),

    // ── Fonts (2) ──
    'font.heading':   rv('font', merged.fonts.heading, 'Heading'),
    'font.body':      rv('font', merged.fonts.body, 'Body'),

    // ── Weights (3) ──
    'weight.display':  rv('weight', dna.typography.displayWeight, 'Display Weight'),
    'weight.heading':  rv('weight', dna.typography.headingWeight, 'Heading Weight'),
    'weight.body':     rv('weight', dna.typography.bodyWeight, 'Body Weight'),

    // ── Stretch (3) ──
    'stretch.display':  rv('stretch', 'normal', 'Display Stretch'),
    'stretch.heading':  rv('stretch', 'normal', 'Heading Stretch'),
    'stretch.body':     rv('stretch', 'normal', 'Body Stretch'),

    // ── Typography sizes (6) ──
    'size.display': rv('size', dna.typography.displaySize, 'Display Size'),
    'size.h1':      rv('size', dna.typography.h1Size, 'H1 Size'),
    'size.h2':      rv('size', dna.typography.h2Size, 'H2 Size'),
    'size.h3':      rv('size', dna.typography.h3Size, 'H3 Size'),
    'size.body':    rv('size', dna.typography.bodySize, 'Body Size'),
    'size.caption': rv('size', dna.typography.captionSize, 'Caption Size'),

    // ── Spacing (7) ──
    'size.spacingSm':      rv('size', dna.spacing.sm, 'Spacing SM'),
    'size.spacingMd':      rv('size', dna.spacing.md, 'Spacing MD'),
    'size.spacingLg':      rv('size', dna.spacing.lg, 'Spacing LG'),
    'size.spacingXl':      rv('size', dna.spacing.xl, 'Spacing XL'),
    'size.pageMargin':     rv('size', dna.spacing.pageMargin, 'Page Margin'),
    'size.pageGap':        rv('size', dna.spacing.pageGap, 'Page Gap'),
    'size.gridGap':        rv('size', dna.spacing.gridGap, 'Grid Gap'),

    // ── Radius (3) ──
    'size.radiusSm': rv('size', dna.radius.sm, 'Radius SM'),
    'size.radiusMd': rv('size', dna.radius.md, 'Radius MD'),
    'size.radiusLg': rv('size', dna.radius.lg, 'Radius LG'),

    // ── Meta (scale factors) ──
    'meta.textScale':    rv('size', String(dna.textScale), 'Text Scale'),
    'meta.spacingScale': rv('size', String(dna.spacingScale), 'Spacing Scale'),
  };

  return {
    $schema: 'design-tokens/v2',
    version: 2,
    variables,
  };
}
