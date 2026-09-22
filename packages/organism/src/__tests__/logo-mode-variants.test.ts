import { describe, expect, it } from 'vitest';
import { brandLogoSlotValues, logoModeVariantsFromFiles, slotValuesForLogoTreatment } from '../dna/logo-color-mode';

/** Companions for hosts that list a brand's logo files but never run `buildSlotMediaValues`. */
describe('logoModeVariantsFromFiles', () => {
  const keys = [
    'ws/brands/dark-studio/assets/logos/logo.svg',
    'ws/brands/dark-studio/assets/logos/logo-white.svg',
    'ws/brands/dark-studio/assets/logos/logo-black.png',
    'ws/brands/dark-studio/assets/logos/mark-light.svg',
  ];

  it('finds the light and dark marks of the base logo, classified by basename', () => {
    expect(logoModeVariantsFromFiles(keys, keys[0])).toEqual({ light: keys[1], dark: keys[2] });
  });

  it('matches a URL base to a key list by basename', () => {
    expect(logoModeVariantsFromFiles(keys, `/api/r2/${keys[0]}?v=2`)).toEqual({ light: keys[1], dark: keys[2] });
  });

  it('never borrows another variant', () => {
    const symbolOnly = ['logos/mark.svg', 'logos/logo-white.svg'];
    expect(logoModeVariantsFromFiles(symbolOnly, 'logos/mark.svg')).toEqual({});
  });

  it('keeps stacked with stacked', () => {
    const files = ['logo-stacked.svg', 'logo-stacked-white.svg', 'logo-white.svg'];
    expect(logoModeVariantsFromFiles(files, 'logo-stacked.svg')).toEqual({ light: 'logo-stacked-white.svg' });
  });

  it('is empty without a base or a match', () => {
    expect(logoModeVariantsFromFiles(keys, null)).toEqual({});
    expect(logoModeVariantsFromFiles(keys, 'data:image/svg+xml;base64,AAAA')).toEqual({});
    expect(logoModeVariantsFromFiles([], 'logo.svg')).toEqual({});
  });
});

describe('brandLogoSlotValues', () => {
  it('adds only distinct companions, and swaps in a mode', () => {
    const values = brandLogoSlotValues('/logo.svg', { light: '/logo-white.svg', dark: '/logo.svg' });
    expect(values).toEqual({ brand_logo: '/logo.svg', brand_logo_light: '/logo-white.svg' });
    expect(slotValuesForLogoTreatment(values, 'light')?.brand_logo).toBe('/logo-white.svg');
    expect(slotValuesForLogoTreatment(values, 'dark')?.brand_logo).toBe('/logo.svg');
  });

  it('is null without a logo', () => {
    expect(brandLogoSlotValues(null, { light: '/x.svg' })).toBeNull();
    expect(brandLogoSlotValues('/logo.svg')).toEqual({ brand_logo: '/logo.svg' });
  });
});
