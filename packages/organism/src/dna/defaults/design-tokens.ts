/**
 * Canonical default design tokens (design-tokens/v2).
 * Single source of truth for .syvon/core/design-tokens.json seeding and agent reference.
 *
 * Values are the hardcoded output of the former v1 derivation engine
 * (modular scale, spacing multipliers, radius modes) run against the
 * original APP_DEFAULTS inputs. The v1 engine is now dead code outside
 * of the migration shim in design-tokens-migration.ts.
 */

import type { DesignTokensV2, RegistryVariable, VariableType } from '../design-tokens/design-tokens-v2-types';
import type { DesignTokens } from '../design-tokens/design-tokens-types';

function v(type: VariableType, value: string, label?: string): RegistryVariable {
  return label ? { type, value, label } : { type, value };
}

/**
 * @legacy v1 defaults — only consumed by `migrateV1ToV2()` in design-tokens-migration.ts.
 * Do NOT use in new code. Use `DEFAULT_V2_REGISTRY` instead.
 */
export const APP_DEFAULTS: DesignTokens = {
  $schema: 'design-tokens/v1',
  colors: {
    primary: '#3B82F6',
    secondary: '#6366F1',
    tertiary: '#F59E0B',
    quaternary: '#22C55E',
    neutral: '#6B7280',
    background: '#111111',
    surface: '#1A1A1A',
    text: '#EDEDED',
  },
  fonts: {
    heading: 'DM Sans',
    body: 'DM Sans',
  },
  type: {
    baseSize: '18px',
    scaleRatio: 1.25,
    headingWeight: '400',
    bodyWeight: '400',
  },
  spacing: {
    baseUnit: '4px',
  },
  radius: {
    base: '12px',
    scale: 'proportional',
  },
  animation: {
    entrance: 'fade',
    exit: 'fade',
    stagger: 0.05,
  },
};

/**
 * Canonical v2 registry — hardcoded computed values from the former v1
 * derivation engine. This is the single source of truth for all default
 * design token values in the application.
 */
export const DEFAULT_V2_REGISTRY: DesignTokensV2 = {
  $schema: 'design-tokens/v2',
  version: 2,
  variables: {
    // ── Colors (10) ──
    'color.primary':    v('color', '#3B82F6', 'Primary'),
    'color.secondary':  v('color', '#6366F1', 'Secondary'),
    'color.tertiary':   v('color', '#F59E0B', 'Tertiary'),
    'color.quaternary': v('color', '#22C55E', 'Quaternary'),
    'color.canvas':     v('color', '#111111', 'Canvas'),
    'color.text':       v('color', '#EDEDED', 'Text'),
    'color.textMuted':  v('color', '#999999', 'Text Muted'),
    'color.border':     v('color', '#2A2A2A', 'Border'),
    'color.background': v('color', '#111111', 'Background'),
    'color.surface':    v('color', '#1A1A1A', 'Surface'),

    /*
     * ── Gradients: DELIBERATELY ABSENT ──
     *
     * Shipping them here as literal colours looked tidier and was wrong: a new
     * workspace would carry authored gradients that no longer follow its
     * palette, so changing `color.primary` would re-theme everything EXCEPT
     * the gradient built from it. A test caught exactly that.
     *
     * With no `gradient.*` in the registry, `dnaToCssVars` derives all four
     * from the colours above, so they re-theme for free. The tokens editor
     * still SHOWS them (it seeds the rows from the same derivation), and
     * editing one writes a real token — which is the point at which the user
     * has asked for a fixed gradient rather than a derived one.
     */

    // ── Fonts (2) ──
    'font.heading':   v('font', 'DM Sans', 'Heading'),
    'font.body':      v('font', 'DM Sans', 'Body'),

    // ── Weights (3) ──
    'weight.display':  v('weight', '400', 'Display Weight'),
    'weight.heading':  v('weight', '400', 'Heading Weight'),
    'weight.body':     v('weight', '400', 'Body Weight'),

    // ── Stretch (3) ──
    'stretch.display':  v('stretch', 'normal', 'Display Stretch'),
    'stretch.heading':  v('stretch', 'normal', 'Heading Stretch'),
    'stretch.body':     v('stretch', 'normal', 'Body Stretch'),

    // ── Typography sizes (6) ──
    'size.display': v('size', '128px', 'Display Size'),
    'size.h1':      v('size', '96px', 'H1 Size'),
    'size.h2':      v('size', '80px', 'H2 Size'),
    'size.h3':      v('size', '64px', 'H3 Size'),
    'size.body':    v('size', '48px', 'Body Size'),
    'size.caption': v('size', '32px', 'Caption Size'),

    // ── Spacing (7) ──
    'size.spacingSm':  v('size', '8px', 'Spacing SM'),
    'size.spacingMd':  v('size', '16px', 'Spacing MD'),
    'size.spacingLg':  v('size', '32px', 'Spacing LG'),
    'size.spacingXl':  v('size', '64px', 'Spacing XL'),
    'size.pageMargin': v('size', '40px', 'Page Margin'),
    'size.pageGap':    v('size', '24px', 'Page Gap'),
    'size.gridGap':    v('size', '32px', 'Grid Gap'),

    /**
     * ── Tracking (5) ──
     *
     * Letter-spacing as a VARIABLE, so a text style can link to "the brand's
     * tight tracking" instead of restating `-0.03em` on every display style and
     * drifting from the others the first time one is nudged.
     *
     * Typed `size` and grouped by KEY PREFIX, the way spacing and radius above
     * already are. A `tracking` member of `VariableType` would have meant
     * widening that union and every switch over it for a set of values the
     * resolver already accepts — `resolve-preset-refs` has listed `tracking`
     * as ref-resolvable since it was written; nothing had ever offered one.
     */
    'tracking.tight':  v('size', '-0.03em', 'Tracking Tight'),
    'tracking.snug':   v('size', '-0.01em', 'Tracking Snug'),
    'tracking.normal': v('size', '0',       'Tracking Normal'),
    'tracking.wide':   v('size', '0.05em',  'Tracking Wide'),
    'tracking.wider':  v('size', '0.1em',   'Tracking Wider'),

    // ── Radius (3) ──
    'size.radiusSm': v('size', '4px', 'Radius SM'),
    'size.radiusMd': v('size', '8px', 'Radius MD'),
    'size.radiusLg': v('size', '12px', 'Radius LG'),

    // ── Meta (scale factors) ──
    'meta.textScale':    v('size', '1', 'Text Scale'),
    'meta.spacingScale': v('size', '1', 'Spacing Scale'),
  },
};

/** Simple color defaults for onboarding UI. */
export const DEFAULT_COLORS: Record<string, string> = {
  primary:    '#3B82F6',
  secondary:  '#6366F1',
  tertiary:   '#F59E0B',
  quaternary: '#22C55E',
  neutral:    '#6B7280',
  text:       '#EDEDED',
  background: '#111111',
  surface:    '#1A1A1A',
  border:     '#2A2A2A',
};

/** Simple font defaults for onboarding UI. */
export const DEFAULT_FONTS: Record<string, string> = {
  heading: 'DM Sans',
  body:    'DM Sans',
};
