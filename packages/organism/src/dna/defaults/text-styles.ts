/**
 * Canonical default text styles (text-styles/v1).
 * Single source of truth for .Syvon/Core/text-styles.json seeding.
 */

export type BlockLevel = 'display' | 'h1' | 'h2' | 'h3' | 'paragraph' | 'body' | 'caption';

export interface BlockStylePreset {
  label?: string;
  level: BlockLevel;
  size?: string;
  weight?: number | string;
  tracking?: string;
  leading?: number | string;
  color?: string;
  textTransform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
  fontStyle?: 'italic' | 'normal';
  fontStretch?: string;
  opacity?: number;
  fontFamily?: string;
  /** Entrance preset id from animation.json. `'none'` disables the entrance. */
  animPreset?: string;
  animDelay?: number | string;
  /** Exit preset id. `undefined` = inherit `animPreset`'s exit (back-compat).
   *  `'none'` = no exit. Any other id uses that preset's exit config. */
  animOutroPreset?: string;
  animOutroDelay?: number | string;
}

export interface SpanStylePreset {
  label?: string;
  color?: string;
  weight?: number | string;
  fontStyle?: 'italic' | 'normal';
  fontStretch?: string;
  textTransform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
  opacity?: number;
  tracking?: string;
  animPreset?: string;
  animDelay?: number | string;
  animOutroPreset?: string;
  animOutroDelay?: number | string;
  className?: string;
}

export interface TextStyleFileShape {
  $schema?: string;
  blockStyles: Record<string, BlockStylePreset>;
  spanStyles: Record<string, SpanStylePreset>;
}

export const DEFAULT_BLOCK_STYLES: Record<string, BlockStylePreset> = {
  // TWO TEXT ANIMATIONS (2026-08-02, user rule): every heading is `wordFadeUp`,
  // every paragraph / body / caption is `wordFade`. Same duration, same word
  // stagger, same easing — the only difference is 12px of lift. Emphasis comes
  // from the TYPE ramp (240px vs 24px, weight 900 vs 400); motion's job is to
  // stay out of its way.
  //
  // Replaces the 2026-06-06 scheme, which spread three families over ten
  // styles: charSlideUp (character stagger) for headings, wordSlideUp (word
  // stagger with a `back.out(1.7)` bounce) for paragraphs, slideUp (whole
  // block) for small text. Three motion languages in one composition, and the
  // reason a syvon deck did not look like one deck.
  'display-hero': {
    label: 'Display Hero',
    level: 'display',
    size: '240px',
    weight: 900,
    tracking: '-0.03em',
    leading: 1.05,
    animPreset: 'wordFadeUp',
  },
  'h1-hero': {
    label: 'H1 Hero',
    level: 'h1',
    size: '196px',
    weight: 900,
    tracking: '-0.02em',
    leading: 1.1,
    animPreset: 'wordFadeUp',
  },
  'h1-compact': {
    label: 'H1 Compact',
    level: 'h1',
    size: '120px',
    weight: 700,
    tracking: '-0.01em',
    animPreset: 'wordFadeUp',
  },
  'h2-section': {
    label: 'H2 Section',
    level: 'h2',
    size: '96px',
    weight: 700,
    tracking: '-0.01em',
    animPreset: 'wordFadeUp',
  },
  'h3-label': {
    label: 'H3 Label',
    level: 'h3',
    size: '64px',
    weight: 600,
    leading: 1.4,
    animPreset: 'wordFadeUp',
  },
  'paragraph-large': {
    label: 'Paragraph Large',
    level: 'paragraph',
    size: '48px',
    weight: 400,
    leading: 1.4,
    animPreset: 'wordFade',
  },
  'paragraph-default': {
    label: 'Paragraph Default',
    level: 'paragraph',
    size: '40px',
    weight: 400,
    leading: 1.6,
    animPreset: 'wordFade',
  },
  'body-large': {
    label: 'Body Large',
    level: 'body',
    size: '36px',
    weight: 400,
    leading: 1.5,
    animPreset: 'wordFade',
  },
  'body-default': {
    label: 'Body Default',
    level: 'body',
    size: '24px',
    weight: 400,
    leading: 1.4,
    animPreset: 'wordFade',
  },
  'kicker': {
    label: 'Kicker',
    level: 'caption',
    size: '24px',
    weight: 600,
    tracking: '0.15em',
    textTransform: 'uppercase',
    animPreset: 'wordFade',
  },
};

/**
 * A span style paints with the BRAND, not with a colour someone typed once.
 *
 * These carry `{ ref: 'color.*' }` for the same reason the block styles carry
 * `{ ref: 'font.*' }` / `{ ref: 'size.*' }`: a pinned hex stops tracking the
 * brand the moment the brand changes, and "Brand Highlight" painting Syvon
 * orange on someone else's brand is the bug that reads as "the style did
 * nothing". `resolveTextStyleRefs` resolves these against the workspace
 * registry (`color` is already in its RESOLVABLE_FIELDS), and
 * `TextStyleProvider` falls back to `DEFAULT_V2_REGISTRY` when a workspace has
 * no tokens of its own, so a ref always lands on a real colour.
 */
export const DEFAULT_SPAN_STYLES: Record<string, SpanStylePreset> = {
  'brand-highlight': {
    label: 'Brand Highlight',
    color: { ref: 'color.primary' } as unknown as string,
    weight: 700,
    animPreset: 'wordPop',
  },
  'italic-accent': {
    label: 'Italic Accent',
    fontStyle: 'italic',
    color: { ref: 'color.secondary' } as unknown as string,
    animPreset: 'fade',
  },
  'fade-word': {
    label: 'Fade Word',
    opacity: 0.5,
    animPreset: 'fade',
  },
  'animated-pop': {
    label: 'Animated Pop',
    weight: 800,
    animPreset: 'wordPop',
  },
};

/** Map block level to the semantic font token ref. */
const LEVEL_FONT_REF: Record<BlockLevel, string> = {
  display: 'font.heading',
  h1: 'font.heading',
  h2: 'font.heading',
  h3: 'font.heading',
  paragraph: 'font.body',
  body: 'font.body',
  caption: 'font.body',
};

/** Map block level to the semantic size token ref. */
const LEVEL_SIZE_REF: Record<BlockLevel, string> = {
  display: 'size.display',
  h1: 'size.h1',
  h2: 'size.h2',
  h3: 'size.h3',
  paragraph: 'size.body',
  body: 'size.body',
  caption: 'size.caption',
};

/** Map block level to the semantic weight token ref. */
export const LEVEL_WEIGHT_REF: Record<BlockLevel, string> = {
  display: 'weight.display',
  h1: 'weight.heading',
  h2: 'weight.heading',
  h3: 'weight.heading',
  paragraph: 'weight.body',
  body: 'weight.body',
  caption: 'weight.body',
};

/**
 * The literal tracking a default carries, as the registry token that means the
 * same thing. A default that ships a raw `-0.03em` is a default nobody can
 * re-tune from one place: change the brand's tight tracking and four styles
 * still say the old number. Anything not in this table keeps its literal — the
 * map is deliberately exact rather than a nearest-match, because rounding
 * someone's type into a preset step is not a migration.
 */
const TRACKING_REF_BY_VALUE: Record<string, string> = {
  '-0.03em': 'tracking.tight',
  '-0.01em': 'tracking.snug',
  '0': 'tracking.normal',
  '0.05em': 'tracking.wide',
  '0.1em': 'tracking.wider',
};

export function getDefaultTextStyleFileShape(): TextStyleFileShape {
  const blockStyles: Record<string, BlockStylePreset> = {};
  for (const [id, preset] of Object.entries(DEFAULT_BLOCK_STYLES)) {
    const trackingRef = preset.tracking ? TRACKING_REF_BY_VALUE[preset.tracking] : undefined;
    blockStyles[id] = {
      ...preset,
      fontFamily: { ref: LEVEL_FONT_REF[preset.level] } as unknown as string,
      size: { ref: LEVEL_SIZE_REF[preset.level] } as unknown as string,
      weight: { ref: LEVEL_WEIGHT_REF[preset.level] } as unknown as string | number,
      ...(trackingRef ? { tracking: { ref: trackingRef } as unknown as string } : {}),
    };
  }
  return {
    $schema: 'text-styles/v1',
    blockStyles,
    spanStyles: { ...DEFAULT_SPAN_STYLES },
  };
}
