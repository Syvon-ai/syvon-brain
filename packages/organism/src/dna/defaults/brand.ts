/**
 * Canonical default brand and signals (empty-but-valid).
 * Single source of truth for .syvon/core/brand.json and .syvon/memory/signals.json seeding.
 */

/**
 * WHAT A NEW BRAND STARTS WITH.
 *
 * `voice`, `visual` and `examples` are NOT here any more, and their absence is
 * load-bearing: `healDna` backfills every key of this object into every
 * brand.json it touches, so while they were listed here they were written back
 * into every file, for ever, no matter how many times they were removed.
 *
 * The brand's voice is `meta/voice.md` and its imagery is
 * `assets/world/world.md` — prose the agent writes and every prompt reads
 * whole. `visual.styles` was a keyword bag applied by a resolver no runtime
 * injected; it reached no image. Existing files keep all three (nothing
 * deletes them, and `Brand` still types them as optional) — they are simply
 * not seeded, not healed back, and not read.
 */
export const DEFAULT_BRAND = {
  identity: {
    type: '',
    industry: '',
    role: '',
    audience: { primary: '' },
    offerings: [],
    differentiator: '',
  },
  elevenlabs: {
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    voiceLabel: 'Rachel',
    modelId: 'eleven_multilingual_v2',
    stability: 0.5,
    similarityBoost: 0.75,
  },
};

export const DEFAULT_SIGNALS = {
  totalInteractions: 0,
  approvalRate: 0,
  patterns: [],
  pivots: [],
};

export const DEFAULT_FIGMA_TOKENS = {
  tokens: {} as Record<string, unknown>,
};

/**
 * The starter shape for a `From scratch` Brand created in the UI.
 *
 * Same canonical fields as `DEFAULT_BRAND` (the org-level singleton) but
 * reserved for new workspace Brand rows so we can evolve the two independently
 * later — e.g. we may want to leave `visual.active` unset on a fresh UI brand
 * once the palette/font editors are live, or drop `wrap.uiFont` (workspace-wide,
 * not brand-scoped) when that part of the model moves.
 */
export const DEFAULT_BRAND_INSTANCE: typeof DEFAULT_BRAND = {
  ...DEFAULT_BRAND,
  // Override as the spec evolves; identical to DEFAULT_BRAND for now.
};
