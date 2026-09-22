/**
 * TypeScript interfaces for organism DNA files stored under .Syvon/Core/ and .Syvon/Memory/.
 * These map 1:1 to the JSON schemas defined in organism-plan.md.
 */

/** Identity fields — consolidated into Brand.identity (no standalone file). */
export interface BrandIdentity {
  type?: 'business' | 'personal' | 'individual';
  industry?: string;
  role?: string;
  audience?: { primary: string; secondary?: string };
  offerings?: string[];
  differentiator?: string;
}

/** A single AI-generated tone dimension with user-set value (0–100). */
export interface ToneDimension {
  min: string;   // e.g. "Underground"
  max: string;   // e.g. "Mainstream"
  value: number; // 0–100
}

/** Typography roles: structured mapping from role to font family. */
export interface TypographyRoles {
  display?: string;    // largest sizes, headlines (e.g. "Sequel Sans")
  editorial?: string;  // secondary/alt serif styles (e.g. "Plantin MT Pro")
  text?: string;       // body text (when different from display)
  ui?: string;         // UI labels, buttons (e.g. "Inter")
  code?: string;       // monospace/code (e.g. "MD IO 0.5")
}

/** A named visual style preset for image generation. Open-ended key-value pairs. */
export interface VisualStyle {
  name: string;
  [key: string]: string;
}

/** .syvon/core/brand.json */
export interface Brand {
  /**
   * LEGACY, and optional because of it. A brand's voice is `meta/voice.md`,
   * its imagery is `assets/world/world.md`, and both are read into the prompt
   * whole rather than digested into these fields. Files written before that
   * still carry them and still parse; nothing writes them any more.
   *
   * @deprecated Read `meta/voice.md`.
   */
  voice?: {
    tone?: string;
    vocabulary?: string;
    patterns?: string[];
    avoids?: string[];
    /** AI-generated tone dimensions with user-set values (0–100). */
    tone_dimensions?: ToneDimension[];
  };
  /** @deprecated Read `assets/world/world.md` and `world.json`. */
  visual?: {
    /** Whether image gen applies the active style. */
    onBrand?: boolean;
    /** Name of the active style preset. */
    active?: string;
    /** Named style presets for image generation. */
    styles?: VisualStyle[];
    /** @deprecated Use styles[].mood instead. */
    style?: string;
    /** @deprecated */
    styleVector?: { x: number; y: number };
  };
  /** @deprecated Collected by the brand editors, read by nothing. */
  examples?: {
    liked?: string[];
    disliked?: string[];
  };
  /** Logo asset reference. svgAssetPath is workspace-relative (v6: "brands/{slug}/assets/logo.svg"; legacy: "library/brand/logo.svg"). */
  logo?: { svgAssetPath?: string; dataUrl?: string };
  /** Identity context — consolidated from former identity.json. */
  identity?: BrandIdentity;
  /** ElevenLabs voice config — the single source of truth for an agent's
   *  narration voice (voice is a brand identity, never a workflow setting). */
  elevenlabs?: {
    voiceId: string;
    voiceLabel: string;
    modelId: string;
    stability: number;
    similarityBoost: number;
    /** Playback speed (ElevenLabs voice_settings.speed, ~0.7–1.2). */
    speed?: number;
  };
}

/** .Syvon/Memory/signals.json */
export interface Signals {
  totalInteractions: number;
  approvalRate: number;
  patterns: Array<{ context: string; signal: string; count: number }>;
  pivots: Array<{ from: string; to: string; date: string }>;
}

/** A single signal event to be collected. */
export interface Signal {
  type: 'approve' | 'reject' | 'edit' | 'router-decision';
  context: string;
  timestamp: string;
  detail?: string;
}
