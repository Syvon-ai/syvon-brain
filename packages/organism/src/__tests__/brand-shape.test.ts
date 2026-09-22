import { describe, it, expect } from 'vitest';
import { DEFAULT_BRAND, DEFAULT_BRAND_INSTANCE } from '../dna/defaults/brand';
import { migrateDnaObjects } from '../dna/dna-io';

/**
 * THE CANONICAL SHAPE, and why removing a field from an editor is not enough.
 *
 * `migrateDnaObjects` backfills every key of `DEFAULT_BRAND` into every
 * brand.json it heals. While `voice`, `visual` and `examples` were listed
 * there, they were written back into every file it touched, for ever — which
 * is how a brand that had been cleaned kept coming back with an empty voice
 * and a visual style nobody authored, and why the local files kept diverging
 * from the ones the cloud regenerated.
 *
 * A brand's voice is `meta/voice.md`; its imagery is `assets/world/world.md`.
 */
describe('DEFAULT_BRAND', () => {
  it('seeds identity and settings, not voice, visual or examples', () => {
    expect(Object.keys(DEFAULT_BRAND).sort()).toEqual(['elevenlabs', 'identity']);
    expect(DEFAULT_BRAND_INSTANCE).not.toHaveProperty('voice');
    expect(DEFAULT_BRAND_INSTANCE).not.toHaveProperty('visual');
    expect(DEFAULT_BRAND_INSTANCE).not.toHaveProperty('examples');
    // `wrap.uiFont` went the same way: written by the old Brand tab, read by
    // nothing, and Studio's UI font is a local setting.
    expect(DEFAULT_BRAND).not.toHaveProperty('wrap');
  });

  it('still carries what brand.json owns', () => {
    expect(DEFAULT_BRAND.identity).toMatchObject({ industry: '', role: '' });
    expect(DEFAULT_BRAND.elevenlabs.voiceId).toBeTruthy();
  });
});

describe('migrateDnaObjects — healing a brand', () => {
  const heal = (brand: Record<string, unknown>) =>
    migrateDnaObjects({ brand, designTokens: null, animation: null, textStyles: null } as never);

  it('does not resurrect the fields that were removed', () => {
    const { brand } = heal({ identity: { role: 'studio' } });
    expect(brand).not.toHaveProperty('voice');
    expect(brand).not.toHaveProperty('visual');
    expect(brand).not.toHaveProperty('examples');
  });

  it("leaves a legacy brand's own fields exactly as it found them", () => {
    // Nothing DELETES them either — an existing file keeps every word it has.
    const legacy = {
      identity: { role: 'studio' },
      voice: { tone: 'warm', vocabulary: 'plain', patterns: ['short'], avoids: [] },
      visual: { onBrand: true, active: 'Default', styles: [{ name: 'Default', mood: 'calm' }] },
      examples: { liked: ['Stripe'], disliked: [] },
    };
    const { brand } = heal(structuredClone(legacy));
    expect(brand).toMatchObject(legacy);
  });

  it('does not fill a visual style with the ten empty keys of a default', () => {
    // The backfill that made an unauthored style look authored.
    const { brand } = heal({
      identity: {},
      visual: { onBrand: true, active: 'Default', styles: [{ name: 'Default', mood: 'calm' }] },
    });
    const style = ((brand as Record<string, unknown>).visual as { styles: Record<string, string>[] }).styles[0]!;
    expect(Object.keys(style).sort()).toEqual(['mood', 'name']);
  });

  it('still backfills what the default DOES carry', () => {
    const { brand } = heal({ voice: { tone: 'warm' } });
    expect(brand).toHaveProperty('identity');
    expect(brand).toHaveProperty('elevenlabs');
  });
});
