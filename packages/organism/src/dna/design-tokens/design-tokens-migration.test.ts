import { describe, expect, it } from 'vitest';
import { migrateV1ToV2 } from './design-tokens-migration';

/**
 * The shape of a real v1 file that the Brand token editor migrated on first
 * open — and, before the fix, rewrote with a derived muted text, a derived
 * border and no icon font.
 */
const V1 = {
  colors: {
    primary: '#A6E856',
    secondary: '#6FA8DC',
    tertiary: '#C6E94B',
    quaternary: '#CBA8E8',
    background: '#FCFCFA',
    surface: '#EFEFEA',
    text: '#191922',
    textMuted: '#191922b3',
    border: '#DCDCD6',
    canvas: '#F3F4F6',
  },
  fonts: { heading: 'Georgia', body: 'Inter', icons: 'Material Symbols Outlined' },
};

describe('migrateV1ToV2', () => {
  const v = migrateV1ToV2(V1 as never).variables;

  it('keeps an explicit textMuted and border instead of deriving them', () => {
    expect(v['color.textMuted'].value).toBe('#191922b3');
    expect(v['color.border'].value).toBe('#DCDCD6');
  });

  it('keeps every colour the file wrote', () => {
    for (const [key, value] of Object.entries(V1.colors)) expect(v[`color.${key}`].value).toBe(value);
  });

  it('carries font roles the registry has no slot for', () => {
    expect(v['font.icons'].value).toBe('Material Symbols Outlined');
    expect(v['font.heading'].value).toBe('Georgia');
  });

  it('still derives muted and border when the file is silent', () => {
    const { textMuted, border, ...rest } = V1.colors;
    const d = migrateV1ToV2({ colors: rest } as never).variables;
    expect(d['color.textMuted'].value).toMatch(/^#[0-9a-f]{6}$/i);
    expect(d['color.textMuted'].value).not.toBe(textMuted);
    expect(d['color.border'].value).not.toBe(border);
  });

  it('does not invent keys the file never had', () => {
    expect(migrateV1ToV2({ colors: { primary: '#000000' } } as never).variables['color.neutral']).toBeUndefined();
  });
});
