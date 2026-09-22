/**
 * @legacy design-tokens/v1 — superseded by DesignTokensV2 (design-tokens-v2-types.ts).
 * Kept for the v1->v2 migration shim in design-tokens-migration.ts.
 */

export interface DesignTokenColors {
  primary: string;
  secondary: string;
  tertiary?: string;
  quaternary?: string;
  neutral: string;
  background: string;
  surface: string;
  canvas?: string;
  text: string;
}

export interface DesignTokenFonts {
  heading: string;
  body: string;
}

export interface DesignTokenType {
  baseSize?: string;
  scaleRatio?: number;
  headingWeight?: string;
  bodyWeight?: string;
}

export interface DesignTokenSpacing {
  baseUnit?: string;
  /** Multipliers — each value is Nx baseUnit. */
  pageMargin?: number;
  pageGap?: number;
  gridGap?: number;
}

export interface DesignTokenRadius {
  base?: string;
  scale?: 'proportional' | 'uniform';
}

export interface DesignTokenAnimation {
  entrance?: string;
  exit?: string;
  stagger?: number;
  maxStagger?: number;
  sectionOffset?: number;
}

export interface DesignTokens {
  $schema?: string;
  colors: DesignTokenColors;
  fonts: DesignTokenFonts;
  type?: DesignTokenType;
  spacing?: DesignTokenSpacing;
  radius?: DesignTokenRadius;
  animation?: DesignTokenAnimation;
}
