import { describe, expect, it } from 'vitest';
import {
  isModeableLogoSlot,
  logoTreatmentForColorMode,
  slotValuesForLogoTreatment,
} from '../dna/logo-color-mode';
import { buildSlotMediaValues } from '../dna/slot-roles';
import type { DesignTokensV2 } from '../dna/design-tokens/design-tokens-v2-types';

const lightBrand: DesignTokensV2 = {
  version: 2,
  modes: { dark: { label: 'Dark' }, print: { scheme: 'light' }, night: { scheme: 'dark' } },
  variables: {
    'color.text': { type: 'color', value: '#111111', modes: { dark: { ref: 'color.background', mode: 'default' } } },
    'color.background': { type: 'color', value: '#fafafa', modes: { dark: { ref: 'color.text', mode: 'default' } } },
  },
};

describe('logoTreatmentForColorMode', () => {
  it('asks for the reversed mark in a mode whose ground is dark on a light brand', () => {
    expect(logoTreatmentForColorMode(lightBrand, 'dark')).toBe('light'); // inferred from the resolved background
    expect(logoTreatmentForColorMode(lightBrand, 'night')).toBe('light'); // declared scheme
  });

  it('has no opinion when the ground matches the base, or there is no mode', () => {
    expect(logoTreatmentForColorMode(lightBrand, 'print')).toBeNull();
    expect(logoTreatmentForColorMode(lightBrand, 'default')).toBeNull();
    expect(logoTreatmentForColorMode(lightBrand, null)).toBeNull();
    expect(logoTreatmentForColorMode(lightBrand, 'unknown')).toBeNull();
  });

  it('asks for the mono mark in a light mode of a dark brand', () => {
    const dark: DesignTokensV2 = {
      version: 2,
      modes: { light: { scheme: 'light' } },
      variables: { 'color.background': { type: 'color', value: '#0a0a0a' } },
    };
    expect(logoTreatmentForColorMode(dark, 'light')).toBe('dark');
  });
});

describe('slotValuesForLogoTreatment', () => {
  const slots = {
    brand_logo: 'logo.svg',
    brand_logo_light: 'logo-light.svg',
    brand_symbol_dark: 'symbol-dark.svg',
    brand_symbol: 'symbol.svg',
    media_bg: 'bg.jpg',
  };

  it('swaps each unqualified logo slot for its companion', () => {
    expect(slotValuesForLogoTreatment(slots, 'light')).toEqual({ ...slots, brand_logo: 'logo-light.svg' });
    expect(slotValuesForLogoTreatment(slots, 'dark')).toEqual({ ...slots, brand_symbol: 'symbol-dark.svg' });
  });

  it('returns the input by identity when nothing changes', () => {
    expect(slotValuesForLogoTreatment(slots, null)).toBe(slots);
    const plain = { brand_logo: 'logo.svg' };
    expect(slotValuesForLogoTreatment(plain, 'light')).toBe(plain);
  });

  it('never re-points a slot that names its treatment', () => {
    expect(isModeableLogoSlot('brand_logo_light')).toBe(false);
    expect(isModeableLogoSlot('brand_logo')).toBe(true);
    expect(isModeableLogoSlot('media_bg')).toBe(false);
  });
});

describe('buildSlotMediaValues — treatment companions', () => {
  it('fills a companion only when the brand has a distinct file for it', () => {
    const files: Record<string, string> = { brand_logo: 'logo.svg', brand_logo_light: 'logo-light.svg', brand_logo_dark: 'logo.svg' };
    const values = buildSlotMediaValues(['brand_logo', 'media_bg'], {
      all: [],
      byFolder: {},
      resolveLogo: (name) => files[name] ?? null,
    });
    expect(values).toEqual({ brand_logo: 'logo.svg', brand_logo_light: 'logo-light.svg' });
  });
});
