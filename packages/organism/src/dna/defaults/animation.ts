/**
 * Canonical default animation (anim/v1) presets and element-type defaults.
 * Single source of truth for .Syvon/Core/animation.json seeding and agent reference.
 */

export interface AnimPresetShape {
  target?: 'any' | 'text' | 'container' | 'media';
  label?: string;
  classNames?: string[];
  entrance?: { type?: string; duration?: number; ease?: string; stagger?: number; mode?: string; from?: number };
  exit?: { type?: string; duration?: number; ease?: string; to?: number; mode?: string; stagger?: number };
}

export interface AnimFileShape {
  $schema?: string;
  defaults?: Record<string, string>;
  presets?: Record<string, AnimPresetShape>;
  /** The brand's house tempo — what a new `.comp` beat grid starts at.
   *  A comp's own `tempo` always wins over this. */
  tempo?: { bpm: number; beatsPerBar?: number };
}

/**
 * Element-type → preset ID. Renderer uses this to auto-assign animation styles.
 *
 * TWO TEXT ANIMATIONS, ON PURPOSE (2026-08-02). Text is `wordFadeUp` for
 * headings and `wordFade` for body — the same effect with and without a 12px
 * lift, so the hierarchy comes from the type ramp and not from the motion.
 *
 * The previous scheme (`heading: charSlideUp`, `paragraph: wordSlideUp`) mixed
 * a per-CHARACTER reveal with a per-WORD bounce, which is two unrelated
 * treatments in one shot. Combined with a `textAnimCycle` that rotated four
 * presets, a single deck could show four motion languages and read as four
 * different brands. Variety in motion is not brand expression; it is the
 * absence of a decision.
 *
 * The other presets are NOT deleted — they stay available in the library for
 * deliberate use. This is the default, which is what the director follows when
 * nobody chose.
 */
export const DEFAULT_ANIM_DEFAULTS: Record<string, string> = {
  heading: 'wordFadeUp',
  paragraph: 'wordFade',
  image: 'fade',
  divider: 'fade',
  /**
   * CONTAINERS — `Layout` and `Frame`, under the key they have always mapped to.
   *
   * The key existed and nothing ever filled it, so every container resolved to
   * 'none' and a coloured card appeared fully formed while the words inside it
   * animated — the one element on the page that did not arrive.
   *
   * It reaches only containers that PAINT (`paintsSurface`); the scaffolding
   * layouts that hold a page together are not cards and stay still. `fade` for
   * the same reason the text pair is what it is: the entrance should be the
   * card ARRIVING, not a second motion language competing with the type.
   */
  card: 'fade',
};

/** Basic presets included in new animation.json so the dropdown has options immediately. */
export const DEFAULT_ANIM_PRESETS: Record<string, AnimPresetShape> = {
  fade: {
    target: 'any',
    label: 'Fade',
    classNames: ['animate-fade-in', 'animate-fade', 'fade-in', 'fade'],
    entrance: { type: 'fade', duration: 0.4, ease: 'power2.out' },
    exit: { type: 'fade', duration: 0.3, ease: 'power2.in' },
  },
  slideUp: {
    target: 'any',
    label: 'Slide up',
    classNames: ['animate-slide-up', 'slide-up', 'slideUp'],
    entrance: { type: 'slideUp', duration: 0.4, ease: 'power3.out' },
    exit: { type: 'slideUp', duration: 0.3, ease: 'power2.in' },
  },
  slideDown: {
    target: 'any',
    label: 'Slide down',
    classNames: ['animate-slide-down', 'slide-down', 'slideDown'],
    entrance: { type: 'slideDown', duration: 0.4, ease: 'power3.out' },
    exit: { type: 'slideDown', duration: 0.3, ease: 'power2.in' },
  },
  scale: {
    target: 'any',
    label: 'Scale',
    classNames: ['animate-scale', 'scale-in', 'scale'],
    entrance: { type: 'scale', from: 0.85, duration: 0.5, ease: 'power2.out' },
    exit: { type: 'scale', to: 0.9, duration: 0.3, ease: 'power2.in' },
  },
  blurIn: {
    target: 'any',
    label: 'Blur in',
    classNames: ['animate-blur-in', 'blur-in', 'blurIn'],
    entrance: { type: 'blurIn', duration: 0.5, ease: 'power2.out' },
    exit: { type: 'blurIn', duration: 0.3, ease: 'power2.in' },
  },
  scaleBlur: {
    target: 'any',
    label: 'Scale + blur',
    classNames: ['animate-scale-blur', 'scale-blur', 'scaleBlur'],
    entrance: { type: 'scaleBlur', duration: 0.6, ease: 'power3.out' },
    exit: { type: 'scaleBlur', duration: 0.35, ease: 'power2.in' },
  },
  elastic: {
    target: 'any',
    label: 'Elastic',
    classNames: ['animate-elastic', 'elastic'],
    entrance: { type: 'elastic', from: 0, duration: 1.0, ease: 'elastic.out(1,0.5)' },
    exit: { type: 'elastic', to: 0, duration: 0.3, ease: 'power3.in' },
  },
  bounceIn: {
    target: 'any',
    label: 'Bounce in',
    classNames: ['animate-bounce-in', 'bounce-in', 'bounceIn'],
    entrance: { type: 'bounceIn', duration: 0.7, ease: 'bounce.out' },
    exit: { type: 'bounceIn', duration: 0.3, ease: 'power2.in' },
  },
  flipIn: {
    target: 'any',
    label: 'Flip in',
    classNames: ['animate-flip-in', 'flip-in', 'flipIn'],
    entrance: { type: 'flipIn', duration: 0.6, ease: 'back.out(1.4)' },
    exit: { type: 'flipIn', duration: 0.35, ease: 'power3.in' },
  },
  rotateIn: {
    target: 'any',
    label: 'Rotate in',
    classNames: ['animate-rotate-in', 'rotate-in', 'rotateIn'],
    entrance: { type: 'rotateIn', duration: 0.5, ease: 'back.out(1.2)' },
    exit: { type: 'rotateIn', duration: 0.3, ease: 'power2.in' },
  },
  /*
   * A REAL TYPEWRITER: characters appear one at a time, in order.
   *
   * This used to be `type: 'typewriter'` — a clipPath wipe
   * (`inset(0 100% 0 0)`) with a stepped ease, which slides a mask across
   * finished text. It reads as a reveal, not as typing: a partially covered
   * character is visible mid-slice, and nothing ever "lands".
   *
   * The engine already splits text per character (`mode: 'character'`), so
   * typing is a preset, not a feature: each character gets its own tween,
   * started `stagger` apart.
   *
   * DURATION MUST BE FAR SMALLER THAN STAGGER. That ratio IS the effect —
   * a character has to finish appearing before the next begins, or the
   * reveals overlap and it reads as a shimmer (which is what `charFade`,
   * at 0.25s over a 0.015s stagger, deliberately is). 0.01s against a
   * 0.045s stagger means each character is simply THERE, ~22 per second,
   * about a fast human typist. `ease: 'none'` for the same reason: there is
   * no motion to shape.
   *
   * The old mask lives on as `typewriterWipe` below — it is a legitimate
   * look, it just is not typing, and the name now says which one you get.
   */
  typewriter: {
    target: 'text',
    label: 'Typewriter',
    classNames: ['animate-typewriter', 'typewriter'],
    entrance: { type: 'fade', duration: 0.01, ease: 'none', mode: 'character', stagger: 0.045 },
    exit: { type: 'fade', duration: 0.01, ease: 'none', mode: 'character', stagger: 0.02 },
  },
  typewriterWipe: {
    target: 'text',
    label: 'Typewriter (wipe)',
    classNames: ['animate-typewriter-wipe', 'typewriter-wipe', 'typewriterWipe'],
    entrance: { type: 'typewriter', duration: 0.8, ease: 'power1.out' },
    exit: { type: 'typewriter', duration: 0.3, ease: 'power2.in' },
  },
  textReveal: {
    target: 'text',
    label: 'Text reveal',
    classNames: ['animate-text-reveal', 'text-reveal', 'textReveal'],
    entrance: { type: 'textReveal', duration: 0.6, ease: 'power3.out' },
    exit: { type: 'textReveal', duration: 0.3, ease: 'power2.in' },
  },
  wordSlideUp: {
    target: 'text',
    label: 'Word slide up',
    classNames: ['animate-word-slide-up', 'word-slide-up', 'wordSlideUp'],
    entrance: { type: 'slideUp', duration: 0.4, ease: 'back.out(1.7)', mode: 'word', stagger: 0.05 },
    exit: { type: 'slideUp', duration: 0.3, ease: 'power2.in', mode: 'word', stagger: 0.04 },
  },
  wordFade: {
    target: 'text',
    label: 'Word fade',
    classNames: ['animate-word-fade', 'word-fade', 'wordFade'],
    entrance: { type: 'fade', duration: 0.35, ease: 'power2.out', mode: 'word', stagger: 0.06 },
    exit: { type: 'fade', duration: 0.3, ease: 'power2.in', mode: 'word', stagger: 0.05 },
  },
  /**
   * The house pair. `wordFadeUp` is deliberately `wordFade` with 12px of lift —
   * SAME duration, SAME stagger, SAME easing — so a deck that alternates the
   * two reads as one treatment with a little variation, not as two effects.
   *
   * That sameness is the point, and it is why `wordSlideUp` is not the second
   * animation: `back.out(1.7)` overshoots and lands each word with a bounce,
   * which at word stagger is a different treatment wearing a similar name.
   */
  wordFadeUp: {
    target: 'text',
    label: 'Word fade up',
    classNames: ['animate-word-fade-up', 'word-fade-up', 'wordFadeUp'],
    entrance: { type: 'fadeUp', duration: 0.35, ease: 'power2.out', mode: 'word', stagger: 0.06 },
    exit: { type: 'fadeUp', duration: 0.3, ease: 'power2.in', mode: 'word', stagger: 0.05 },
  },
  wordPop: {
    target: 'text',
    label: 'Word pop',
    classNames: ['animate-word-scale', 'word-pop', 'wordScale', 'wordPop'],
    entrance: { type: 'elastic', from: 0, duration: 0.6, ease: 'back.out(2)', mode: 'word', stagger: 0.05 },
    exit: { type: 'elastic', to: 0, duration: 0.3, ease: 'power2.in', mode: 'word', stagger: 0.04 },
  },
  wordFlip: {
    target: 'text',
    label: 'Word flip',
    classNames: ['animate-word-flip', 'word-flip', 'wordFlip'],
    entrance: { type: 'flipIn', duration: 0.5, ease: 'back.out(1.4)', mode: 'word', stagger: 0.06 },
    exit: { type: 'flipIn', duration: 0.3, ease: 'power2.in', mode: 'word', stagger: 0.05 },
  },
  wordBlur: {
    target: 'text',
    label: 'Word blur',
    classNames: ['animate-word-blur', 'word-blur', 'wordBlur'],
    entrance: { type: 'blurIn', duration: 0.4, ease: 'power3.out', mode: 'word', stagger: 0.05 },
    exit: { type: 'blurIn', duration: 0.3, ease: 'power2.in', mode: 'word', stagger: 0.04 },
  },
  wordRotate: {
    target: 'text',
    label: 'Word rotate',
    classNames: ['animate-word-rotate', 'word-rotate', 'wordRotate'],
    entrance: { type: 'rotateIn', duration: 0.45, ease: 'back.out(1.5)', mode: 'word', stagger: 0.05 },
    exit: { type: 'rotateIn', duration: 0.3, ease: 'power2.in', mode: 'word', stagger: 0.04 },
  },
  charSlideUp: {
    target: 'text',
    label: 'Char slide up',
    classNames: ['animate-char-reveal', 'char-reveal', 'charReveal', 'charSlideUp'],
    entrance: { type: 'slideUp', duration: 0.3, ease: 'back.out(1.7)', mode: 'character', stagger: 0.02 },
    exit: { type: 'slideUp', duration: 0.3, ease: 'power2.in', mode: 'character', stagger: 0.015 },
  },
  charFade: {
    target: 'text',
    label: 'Char fade',
    classNames: ['animate-char-fade', 'char-fade', 'charFade'],
    entrance: { type: 'fade', duration: 0.25, ease: 'power2.out', mode: 'character', stagger: 0.015 },
    exit: { type: 'fade', duration: 0.3, ease: 'power2.in', mode: 'character', stagger: 0.012 },
  },
  charPop: {
    target: 'text',
    label: 'Char pop',
    classNames: ['animate-char-scale', 'char-pop', 'charScale', 'charPop'],
    entrance: { type: 'elastic', from: 0, duration: 0.5, ease: 'elastic.out(1,0.4)', mode: 'character', stagger: 0.02 },
    exit: { type: 'elastic', to: 0, duration: 0.3, ease: 'power2.in', mode: 'character', stagger: 0.015 },
  },
  charFlip: {
    target: 'text',
    label: 'Char flip',
    classNames: ['animate-char-flip', 'char-flip', 'charFlip'],
    entrance: { type: 'flipIn', duration: 0.4, ease: 'back.out(1.4)', mode: 'character', stagger: 0.025 },
    exit: { type: 'flipIn', duration: 0.3, ease: 'power2.in', mode: 'character', stagger: 0.02 },
  },
  maskReveal: {
    target: 'container',
    label: 'Mask reveal',
    classNames: ['animate-mask-reveal', 'mask-reveal', 'maskReveal'],
    entrance: { type: 'maskReveal', duration: 0.6, ease: 'power3.out' },
    exit: { type: 'maskReveal', duration: 0.4, ease: 'power2.in' },
  },
  maskWipe: {
    target: 'container',
    label: 'Mask wipe',
    classNames: ['animate-mask-wipe', 'mask-wipe', 'maskWipe'],
    entrance: { type: 'maskWipe', duration: 0.6, ease: 'power3.out' },
    exit: { type: 'maskWipe', duration: 0.4, ease: 'power2.in' },
  },
};

/** Full default animation file shape for seeding .Syvon/Core/animation.json. */
export function getDefaultAnimationFileShape(): AnimFileShape {
  return {
    $schema: 'anim/v1',
    defaults: { ...DEFAULT_ANIM_DEFAULTS },
    presets: { ...DEFAULT_ANIM_PRESETS },
  };
}
