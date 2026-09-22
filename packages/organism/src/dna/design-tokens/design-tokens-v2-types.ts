/**
 * Design Tokens v2 — Global Variable Registry.
 *
 * Replaces the v1 structured DesignTokens shape with a flat registry of
 * named variables. Each variable has a type, a concrete value, and an
 * optional human label.
 *
 * Text-style / anim presets reference registry variables via TokenValue refs.
 */

/* ── Token value (used by presets to reference registry variables) ── */

/** A preset field value — either a registry reference, a literal, or absent (factory fallback). */
export type TokenValue = { ref: string } | { value: string };

/* ── Variable types ── */

/**
 * `gradient` holds a complete CSS gradient function as its `value` —
 * `linear-gradient(135deg, #111, #FFF)` — rather than a colour and a
 * separate list of stops.
 *
 * ONE STRING, DELIBERATELY. A structured shape (stops[], angle, type) would
 * be the tidier model, but every consumer of a registry variable already
 * treats `value` as something it can hand straight to CSS, and the renderer
 * composes `fills[]` from its own structured layers anyway (see
 * format-kit/visual.ts). Splitting the representation here would mean two
 * gradient models in one system, and the migration would have to guess which
 * one an existing token meant.
 */
export type VariableType = 'color' | 'font' | 'weight' | 'size' | 'stretch' | 'gradient' | 'cycle';

/* ── Cycle (an animated colour) ── */

/**
 * One stop on a cycle's ramp — a reference to another registry variable, or a
 * literal colour.
 *
 * PREFER THE REFERENCE. This is the same rule `gradientCssVars` learned the
 * hard way (see its comment in `format-kit/dna.ts`): a stop written as the
 * RESOLVED hex is a snapshot of the palette at the moment it was authored, and
 * the day the brand's primary changes the cycle keeps ramping through the old
 * one. `{ ref: 'color.primary' }` survives that.
 *
 * A literal is still allowed, because a cycle is also the natural place to
 * reach for a shade the palette does not have — but a literal here is a token
 * gap, and the honest fix is usually to add the token and reference it.
 */
export type CycleStop = { ref: string } | { value: string };

/** How the ramp behaves once it reaches the end. */
export type CycleMode = 'loop' | 'pingpong' | 'once';

/**
 * An animated colour: a ramp through N stops, driven by the host's playhead.
 *
 * Lives on a `type: 'cycle'` variable, whose `value` is the RESTING colour —
 * what every lane with no clock (PDF, PPTX, the wrapper stylesheet, an email)
 * bakes. That split is the whole reason a cycle is safe to add: it degrades to
 * a plain colour everywhere that cannot animate, with no call-site changes.
 */
export interface CycleSpec {
  /** Two or more. One stop is a constant, and a constant is a `color` token. */
  stops: CycleStop[];
  /** Seconds for one full pass through the ramp. */
  duration: number;
  /** An `EaseName` from `format-kit/motion.ts` — applied per segment. */
  ease?: string;
  mode?: CycleMode;
  /**
   * Interpolation space. `oklch` by default and on purpose: an sRGB lerp
   * between two saturated brand colours drags through a desaturated middle
   * (blue → orange passes through grey), which reads as a dip in the brand
   * rather than a transition.
   */
  space?: 'oklch' | 'srgb';
  /**
   * Snap the period so a whole number of cycles fills the piece, making the
   * last frame land back on the first. See `fitPeriod` in `format-kit/cycle.ts`.
   */
  fit?: boolean;
}

/* ── Colour modes ── */

/**
 * The name of the base `value`. Reserved: never a key of a `modes` map, but
 * accepted as `ModeValue.mode` to pin a reference to the base palette.
 */
export const DEFAULT_COLOR_MODE = 'default';

/** A mode name — a lowercase slug, `default` excluded. */
export const COLOR_MODE_NAME_RE = /^(?!default$)[a-z][a-z0-9-]{0,31}$/;

/**
 * A variable's value in one colour mode — a literal, or a reference to another
 * variable.
 *
 * `ref` without `mode` resolves the target IN THE SAME MODE being resolved:
 * `color.surface` in `light` pointing at `color.background` gets the light
 * background. `mode` pins the source instead — `{ ref: 'color.background',
 * mode: 'default' }` on `color.text` is how an inverted mode says "my text is
 * the base palette's background" without copying the hex, so the day the
 * brand's background changes, the inverted text follows it.
 */
export type ModeValue = { value: string } | { ref: string; mode?: string };

/** What a brand says about a mode it declares. */
export interface ModeMeta {
  label?: string;
  /**
   * Whether the mode reads as light or dark. Informational for now — the lane
   * that will bind a mode to `prefers-color-scheme` (the website) reads it.
   * Renders never switch on it.
   */
  scheme?: 'light' | 'dark';
}

export function isModeValue(v: unknown): v is ModeValue {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  if ('value' in o) return typeof o.value === 'string' && !('ref' in o);
  if ('ref' in o) {
    return typeof o.ref === 'string' && o.ref.length > 0
      && (o.mode === undefined || typeof o.mode === 'string');
  }
  return false;
}

export interface RegistryVariable {
  type: VariableType;
  /**
   * Display value. For `type='font'`, this is the canonical family name
   * (e.g. `"Sequel Sans Body"`) used by the DNA CSS stack. The resolver
   * loads the actual binary via `id`, not `value`.
   */
  value: string;
  /**
   * Canonical font registry id (e.g. `"font:syvon-sequel-sans-body"`).
   * Set ONLY for `type='font'` variables that have been bound to the font
   * registry. Unset on legacy tokens (pre-registry) and on entries whose
   * family name didn't match any registry font — those fall back to system
   * fonts at render time.
   *
   * Set via `bindFontTokensToRegistry` (in `@syvon/design-engine/font-registry`)
   * when the workspace's tokens are loaded.
   */
  id?: string;
  label?: string;
  /**
   * Optional role nicknames for this variable — what it MEANS in this brand,
   * as opposed to what it is called.
   *
   * The key (`color.quaternary`) is structural and load-bearing: it appears in
   * every `.dsgn` as `var(--color-quaternary)`, so it cannot be renamed to
   * something meaningful without a sweeping edit. `label` is only a prettified
   * form of that key ("Quaternary"). Neither answers "which token is the hero
   * colour?", so an instruction phrased in role terms has nothing to resolve
   * against, and gets answered by patching one element instead of the system.
   *
   * `aka` closes that gap without touching the key: `aka: ["hero", "alert"]`.
   * An array because one colour can legitimately serve several roles.
   *
   * IMPORTANT — this is a LOOKUP mechanism, not a SCOPING one. Nicknaming a
   * token does not narrow what it paints. If `color.text` is nicknamed "hero"
   * while 34 elements also use it for body copy, then "make the hero red" turns
   * all of them red. A role nickname only behaves like a role when the token's
   * blast radius already matches it — which usually means giving the role its
   * own token rather than aliasing a shared one.
   */
  aka?: string[];
  /**
   * Set ONLY on `type: 'cycle'` variables. Absent everywhere else.
   *
   * Kept as a sibling of `value` rather than encoded into it (the way a
   * gradient token packs a whole CSS function into `value`) because a cycle
   * has no CSS form to pack it into — no browser primitive animates a custom
   * property on a seeked timeline — so it is sampled in JS instead, and the
   * sampler needs the parts, not a string it would have to re-parse.
   */
  cycle?: CycleSpec;
  /**
   * This variable's value in each colour mode the brand has. `value` stays the
   * DEFAULT mode's literal, which is what keeps every existing file valid and
   * every lane that knows nothing about modes correct: a mode with no entry
   * here keeps `value`.
   *
   * Authored on `type: 'color'` today (the editors only offer it there); the
   * resolver itself is type-agnostic.
   */
  modes?: Record<string, ModeValue>;
}

/* ── V2 shape (stored in design-tokens.json) ── */

export interface DesignTokensV2 {
  $schema?: string;
  version: 2;
  /**
   * The colour modes this brand declares, with their metadata. A mode used on
   * a variable but not declared here still resolves — declaring is for the
   * label and the scheme, not a gate.
   */
  modes?: Record<string, ModeMeta>;
  variables: Record<string, RegistryVariable>;
  /**
   * RUNTIME MARKER — never on disk. Set only by `resolveRegistryForMode` on the
   * flat registry it returns, so a second resolution is a no-op and a write
   * path can refuse to save a resolved copy over the authored file.
   */
  resolvedMode?: string;
}

/* ── Type guard ── */

export function isV2(data: unknown): data is DesignTokensV2 {
  if (!data || typeof data !== 'object') return false;
  return (data as Record<string, unknown>).version === 2;
}
