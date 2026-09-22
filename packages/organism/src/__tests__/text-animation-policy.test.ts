/**
 * The house text-animation policy, asserted rather than described.
 *
 * The rule is two animations — `wordFade` and `wordFadeUp` — and it exists
 * because the previous scheme spread three families (charSlideUp / wordSlideUp
 * / slideUp) over ten block styles, plus a four-preset `textAnimCycle`, and a
 * single generated deck showed four motion languages.
 *
 * A comment could not hold that line. Each of the presets it forbids is a
 * perfectly reasonable one-off choice, so re-adding one always looks like an
 * improvement in isolation — which is exactly how the zoo grew the first time.
 * These tests make widening the policy a deliberate act with a diff, not a
 * drive-by.
 */
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ANIM_DEFAULTS,
  DEFAULT_ANIM_PRESETS,
} from '../dna/defaults/animation';
import { DEFAULT_BLOCK_STYLES } from '../dna/defaults/text-styles';

/** The whole permitted set for TEXT. Widen here, on purpose, or not at all. */
const TEXT_POLICY = ['wordFade', 'wordFadeUp'] as const;

describe('text animation policy', () => {
  it('offers both presets, and offers them for text', () => {
    for (const key of TEXT_POLICY) {
      const p = DEFAULT_ANIM_PRESETS[key];
      expect(p, `${key} must exist — every block style points at it`).toBeDefined();
      expect(p.target).toBe('text');
      expect(p.entrance?.mode).toBe('word');
    }
  });

  it('makes the two SIBLINGS — only the lift differs', () => {
    // This is the substance of the rule. Two presets with the same name shape
    // but different timing would still read as two effects, which is the thing
    // being fixed; so duration, stagger and easing must match exactly and the
    // entrance TYPE must be the only difference.
    const a = DEFAULT_ANIM_PRESETS.wordFade.entrance!;
    const b = DEFAULT_ANIM_PRESETS.wordFadeUp.entrance!;
    expect(b.duration).toBe(a.duration);
    expect(b.stagger).toBe(a.stagger);
    expect(b.ease).toBe(a.ease);
    expect(a.type).toBe('fade');
    expect(b.type).toBe('fadeUp');
  });

  it('never lands a word on an overshoot ease', () => {
    // `back.out(…)` / `elastic.out(…)` bounce past the resting position. Per
    // word that is a bounce per word, which is what made `wordSlideUp` and
    // `wordPop` unusable as house defaults.
    for (const key of TEXT_POLICY) {
      const e = DEFAULT_ANIM_PRESETS[key].entrance!;
      expect(e.ease, `${key} entrance ease`).not.toMatch(/back\.|elastic/);
    }
  });

  it('binds every default block style to the policy', () => {
    const offenders = Object.entries(DEFAULT_BLOCK_STYLES)
      .filter(([, s]) => s.animPreset && !TEXT_POLICY.includes(s.animPreset as never))
      .map(([name, s]) => `${name}=${s.animPreset}`);
    expect(offenders, 'block styles outside the two-animation policy').toEqual([]);
  });

  it('binds the type-driven defaults to the policy, headings lifted', () => {
    expect(DEFAULT_ANIM_DEFAULTS.heading).toBe('wordFadeUp');
    expect(DEFAULT_ANIM_DEFAULTS.paragraph).toBe('wordFade');
    // Media is deliberately NOT text and keeps the plain fade.
    expect(DEFAULT_ANIM_DEFAULTS.image).toBe('fade');
  });

  it('keeps the rest of the library available for deliberate one-off use', () => {
    // The policy narrows the DEFAULTS, it does not delete the presets. A
    // designer reaching for `typewriter` on one element is fine; the director
    // reaching for it unprompted is not.
    for (const key of ['charSlideUp', 'wordPop', 'typewriter', 'wordSlideUp']) {
      expect(DEFAULT_ANIM_PRESETS[key], `${key} should still exist`).toBeDefined();
    }
  });
});
