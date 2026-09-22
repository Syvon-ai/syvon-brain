/**
 * Canonical DNA defaults — single source of truth for workspace seeding and agent reference.
 * All .syvon/core/*.json seeds and builtin-skill examples derive from here.
 */

export { APP_DEFAULTS, DEFAULT_V2_REGISTRY, DEFAULT_COLORS, DEFAULT_FONTS } from './design-tokens';
export { DEFAULT_BRAND, DEFAULT_SIGNALS, DEFAULT_FIGMA_TOKENS } from './brand';
export {
  DEFAULT_ANIM_DEFAULTS,
  DEFAULT_ANIM_PRESETS,
  getDefaultAnimationFileShape,
  type AnimPresetShape,
  type AnimFileShape,
} from './animation';
export {
  DEFAULT_BLOCK_STYLES,
  DEFAULT_SPAN_STYLES,
  getDefaultTextStyleFileShape,
  type BlockLevel,
  type BlockStylePreset,
  type SpanStylePreset,
  type TextStyleFileShape,
} from './text-styles';
export { WIDTH_CLASS_MAP, DEFAULT_FONT_STRETCH, type FontStretchKeyword } from './font-stretch';
