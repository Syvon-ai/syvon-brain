import { describe, it, expect } from 'vitest';
import {
  resolveRegistryForMode,
  resolveVariableForMode,
  listModes,
  hasColorModes,
  type ModeResolveWarning,
} from '../dna/design-tokens/design-tokens-modes';
import { mergeTokenChanges, parseTokenChangeKey, diffTokenRegistries, isTokenChange } from '../dna/design-tokens/design-tokens-merge';
import { deriveModeFromPalette, removeColorMode, renameColorMode } from '../dna/design-tokens/design-tokens-derive-mode';
import { isRegistryCustom, DEFAULT_V2_REGISTRY } from '../dna/design-tokens-defaults';
import { isModeValue, type DesignTokensV2 } from '../dna/design-tokens/design-tokens-v2-types';
import { parseColorMode, readCompColorMode, writeCompColorMode, readReactColorMode, writeReactColorMode } from '../dna/color-mode-declaration';

function reg(variables: DesignTokensV2['variables'], modes?: DesignTokensV2['modes']): DesignTokensV2 {
  return { $schema: 'design-tokens/v2', version: 2, ...(modes ? { modes } : {}), variables };
}

const base = () => reg({
  'color.text': { type: 'color', value: '#EDEDED', label: 'Text', aka: ['ink'] },
  'color.background': { type: 'color', value: '#111111' },
  'color.primary': { type: 'color', value: '#3B82F6' },
  'size.body': { type: 'size', value: '16px' },
  'cycle.brand': { type: 'cycle', value: '#FF0000', cycle: { stops: [{ ref: 'color.primary' }, { value: '#00FF00' }], duration: 4 } },
});

describe('resolveRegistryForMode', () => {
  it('returns the registry by identity for no mode, default, or no modes', () => {
    const dt = base();
    expect(resolveRegistryForMode(dt, null)).toBe(dt);
    expect(resolveRegistryForMode(dt, undefined)).toBe(dt);
    expect(resolveRegistryForMode(dt, 'default')).toBe(dt);
  });

  it('applies a literal and keeps variables with no entry', () => {
    const dt = base();
    dt.variables['color.text'].modes = { print: { value: '#000000' } };
    const out = resolveRegistryForMode(dt, 'print');
    expect(out.variables['color.text'].value).toBe('#000000');
    expect(out.variables['color.background']).toBe(dt.variables['color.background']);
    expect(out.resolvedMode).toBe('print');
  });

  it('strips modes but keeps label, aka and the rest', () => {
    const dt = base();
    dt.variables['color.text'].modes = { light: { value: '#111111' } };
    const v = resolveRegistryForMode(dt, 'light').variables['color.text'];
    expect(v).toEqual({ type: 'color', value: '#111111', label: 'Text', aka: ['ink'] });
  });

  it('swaps text and background through pinned default refs', () => {
    const dt = base();
    dt.variables['color.text'].modes = { light: { ref: 'color.background', mode: 'default' } };
    dt.variables['color.background'].modes = { light: { ref: 'color.text', mode: 'default' } };
    const out = resolveRegistryForMode(dt, 'light');
    expect(out.variables['color.text'].value).toBe('#111111');
    expect(out.variables['color.background'].value).toBe('#EDEDED');
  });

  it('resolves an unpinned ref in the same mode, through a chain', () => {
    const dt = base();
    dt.variables['color.background'].modes = { light: { value: '#FAFAFA' } };
    dt.variables['color.primary'].modes = { light: { ref: 'color.text' } };
    dt.variables['color.text'].modes = { light: { ref: 'color.background' } };
    const out = resolveRegistryForMode(dt, 'light');
    expect(out.variables['color.text'].value).toBe('#FAFAFA');
    expect(out.variables['color.primary'].value).toBe('#FAFAFA');
  });

  it('is idempotent: a resolved registry passes through a second resolution', () => {
    const dt = base();
    dt.variables['color.text'].modes = { light: { ref: 'color.background', mode: 'default' } };
    dt.variables['color.background'].modes = { light: { ref: 'color.text', mode: 'default' } };
    const once = resolveRegistryForMode(dt, 'light');
    expect(resolveRegistryForMode(once, 'light')).toBe(once);
    expect(resolveRegistryForMode(once, 'print')).toBe(once);
  });

  it('falls back to each variable\'s own default on a two-way cycle, with a warning each', () => {
    const dt = base();
    dt.variables['color.text'].modes = { light: { ref: 'color.background' } };
    dt.variables['color.background'].modes = { light: { ref: 'color.text' } };
    const warnings: ModeResolveWarning[] = [];
    const out = resolveRegistryForMode(dt, 'light', { warn: (w) => warnings.push(w) });
    expect(out.variables['color.text'].value).toBe('#EDEDED');
    expect(out.variables['color.background'].value).toBe('#111111');
    expect(warnings.filter((w) => w.reason === 'cycle')).toHaveLength(2);
  });

  it('treats an unpinned self-ref as a cycle but a pinned one as fine', () => {
    const dt = base();
    dt.variables['color.text'].modes = { light: { ref: 'color.text' }, dim: { ref: 'color.text', mode: 'default' } };
    const warnings: ModeResolveWarning[] = [];
    expect(resolveRegistryForMode(dt, 'light', { warn: (w) => warnings.push(w) }).variables['color.text'].value).toBe('#EDEDED');
    expect(warnings[0]?.reason).toBe('cycle');
    expect(resolveRegistryForMode(dt, 'dim').variables['color.text'].value).toBe('#EDEDED');
  });

  it('falls back on a missing ref, a wrong-type ref and a blank literal', () => {
    const dt = base();
    dt.variables['color.text'].modes = { a: { ref: 'color.nope' }, b: { ref: 'size.body' }, c: { value: '' } };
    const reasons: string[] = [];
    const warn = (w: ModeResolveWarning) => reasons.push(w.reason);
    expect(resolveRegistryForMode(dt, 'a', { warn }).variables['color.text'].value).toBe('#EDEDED');
    expect(resolveRegistryForMode(dt, 'b', { warn }).variables['color.text'].value).toBe('#EDEDED');
    expect(resolveRegistryForMode(dt, 'c', { warn }).variables['color.text'].value).toBe('#EDEDED');
    expect(reasons).toEqual(['missing-ref', 'ref-type', 'blank']);
  });

  it('lets a colour reference a cycle (its resting value)', () => {
    const dt = base();
    dt.variables['color.primary'].modes = { light: { ref: 'cycle.brand' } };
    expect(resolveRegistryForMode(dt, 'light').variables['color.primary'].value).toBe('#FF0000');
  });

  it('caps chain depth', () => {
    const variables: DesignTokensV2['variables'] = {};
    for (let i = 0; i < 12; i++) {
      variables[`color.c${i}`] = { type: 'color', value: `#00000${i % 10}`, modes: { x: i < 11 ? { ref: `color.c${i + 1}` } : { value: '#ABCDEF' } } };
    }
    const reasons: string[] = [];
    const out = resolveRegistryForMode(reg(variables), 'x', { warn: (w) => reasons.push(w.reason) });
    expect(out.variables['color.c0'].value).toBe('#000000');
    expect(out.variables['color.c10'].value).toBe('#ABCDEF');
    expect(reasons).toContain('depth');
  });

  it('resolves a mode used on a variable but never declared', () => {
    const dt = base();
    dt.variables['color.text'].modes = { ghost: { value: '#123456' } };
    expect(resolveVariableForMode(dt, 'color.text', 'ghost')).toBe('#123456');
  });
});

describe('listModes', () => {
  it('lists declared modes first, then used-only ones sorted', () => {
    const dt = reg({
      'color.a': { type: 'color', value: '#000', modes: { zeta: { value: '#111' }, light: { value: '#fff' } } },
      'color.b': { type: 'color', value: '#000', modes: { alpha: { value: '#222' } } },
    }, { print: { label: 'Print' }, light: {} });
    expect(listModes(dt)).toEqual(['print', 'light', 'alpha', 'zeta']);
    expect(hasColorModes(dt)).toBe(true);
    expect(hasColorModes(base())).toBe(false);
  });
});

describe('mergeTokenChanges with modes', () => {
  it('keeps modes when the base value changes', () => {
    const dt = base();
    dt.variables['color.text'].modes = { light: { value: '#000' } };
    const out = mergeTokenChanges(dt, { 'color.text': '#FFFFFF' });
    expect(out.variables['color.text']).toMatchObject({ value: '#FFFFFF', modes: { light: { value: '#000' } } });
  });

  it('writes a literal, a reference, and clears with null', () => {
    const dt = base();
    let out = mergeTokenChanges(dt, { 'color.text@light': '#111111', 'color.background@light': { ref: 'color.text', mode: 'default' } });
    expect(out.variables['color.text'].modes).toEqual({ light: { value: '#111111' } });
    expect(out.variables['color.background'].modes).toEqual({ light: { ref: 'color.text', mode: 'default' } });
    out = mergeTokenChanges(out, { 'color.text@light': null });
    expect(out.variables['color.text'].modes).toBeUndefined();
    expect(dt.variables['color.text'].modes).toBeUndefined();
  });

  it('treats @default as the bare key', () => {
    expect(parseTokenChangeKey('color.text@default')).toEqual({ name: 'color.text', mode: null });
    expect(mergeTokenChanges(base(), { 'color.text@default': '#010101' }).variables['color.text'].value).toBe('#010101');
  });

  it('refuses what it cannot apply', () => {
    expect(() => mergeTokenChanges(base(), { 'color.new@light': '#000' })).toThrow(/base value first/);
    expect(() => mergeTokenChanges(base(), { 'color.text': { ref: 'color.background' } })).toThrow(/literal/);
    expect(() => mergeTokenChanges(base(), { 'color.text': null })).toThrow();
    expect(() => mergeTokenChanges(base(), { 'color.text@Light': '#000' })).toThrow(/mode name/);
    const resolved = resolveRegistryForMode({ ...base(), variables: { ...base().variables, 'color.text': { type: 'color', value: '#1', modes: { l: { value: '#2' } } } } }, 'l');
    expect(() => mergeTokenChanges(resolved, { 'color.text': '#000' })).toThrow(/mode-resolved/);
  });

  it('still accepts a plain string diff for new variables', () => {
    expect(mergeTokenChanges(base(), { 'color.accent': '#FF6A00' }).variables['color.accent']).toEqual({ type: 'color', value: '#FF6A00' });
  });
});

describe('mode declarations and registry diffs', () => {
  it('declares and removes a mode through @ keys', () => {
    let out = mergeTokenChanges(base(), { '@light': { label: 'Light', scheme: 'light' } });
    expect(out.modes).toEqual({ light: { label: 'Light', scheme: 'light' } });
    out = mergeTokenChanges(out, { '@light': null });
    expect(out.modes).toBeUndefined();
    expect(() => mergeTokenChanges(base(), { '@light': { value: '#000' } })).toThrow(/declaration/);
    expect(() => mergeTokenChanges(base(), { '@default': {} })).toThrow();
  });

  it('round-trips a generated mode, a rename and a removal as diffs', () => {
    const before = base();
    const added = deriveModeFromPalette(before, { name: 'light' });
    const addDiff = diffTokenRegistries(before, added);
    expect(addDiff['@light']).toEqual(added.modes?.light);
    expect(mergeTokenChanges(before, addDiff)).toEqual(added);

    const renamed = renameColorMode(added, 'light', 'day');
    expect(mergeTokenChanges(added, diffTokenRegistries(added, renamed))).toEqual(renamed);

    const removed = removeColorMode(renamed, 'day');
    expect(mergeTokenChanges(renamed, diffTokenRegistries(renamed, removed))).toEqual(removed);
    expect(diffTokenRegistries(removed, removed)).toEqual({});
  });

  it('accepts only diff-shaped values', () => {
    expect(isTokenChange('#000')).toBe(true);
    expect(isTokenChange(null)).toBe(true);
    expect(isTokenChange({ ref: 'color.text' })).toBe(true);
    expect(isTokenChange({ label: 'Light' })).toBe(true);
    expect(isTokenChange(42)).toBe(false);
    expect(isTokenChange({ label: 1 })).toBe(false);
  });
});

describe('deriveModeFromPalette', () => {
  it('inverts the default registry with refs for the swap and literals between', () => {
    const out = deriveModeFromPalette(structuredClone(DEFAULT_V2_REGISTRY), { name: 'light' });
    expect(out.variables['color.text'].modes?.light).toEqual({ ref: 'color.background', mode: 'default' });
    expect(out.variables['color.background'].modes?.light).toEqual({ ref: 'color.text', mode: 'default' });
    expect(out.variables['color.canvas'].modes?.light).toEqual({ ref: 'color.text', mode: 'default' });
    expect(out.variables['color.primary'].modes).toBeUndefined();
    // No scheme unless asked for: a scheme opts a website into the OS setting.
    expect(out.modes?.light).toEqual({ label: 'Light' });
    expect(deriveModeFromPalette(structuredClone(DEFAULT_V2_REGISTRY), { name: 'light', scheme: 'light' }).modes?.light)
      .toEqual({ label: 'Light', scheme: 'light' });

    const flat = resolveRegistryForMode(out, 'light');
    expect(flat.variables['color.text'].value).toBe('#111111');
    expect(flat.variables['color.background'].value).toBe('#EDEDED');
    expect(flat.variables['color.surface'].value).toBe('#e4e4e4');
    expect(flat.variables['color.primary'].value).toBe('#3B82F6');
  });

  it('refuses an existing mode unless overwrite, and replaces cleanly when it is', () => {
    const once = deriveModeFromPalette(structuredClone(DEFAULT_V2_REGISTRY), { name: 'light' });
    expect(() => deriveModeFromPalette(once, { name: 'light' })).toThrow(/already exists/);
    const empty = deriveModeFromPalette(once, { name: 'light', strategy: 'empty', overwrite: true });
    expect(listModes(empty)).toEqual(['light']);
    expect(Object.values(empty.variables).some((v) => v.modes)).toBe(false);
  });

  it('rejects reserved and malformed names', () => {
    expect(() => deriveModeFromPalette(base(), { name: 'default' })).toThrow();
    expect(() => deriveModeFromPalette(base(), { name: 'Dark Mode' })).toThrow();
  });

  it('removes and renames a mode everywhere, pinned refs included', () => {
    const dt = deriveModeFromPalette(base(), { name: 'light' });
    dt.variables['color.primary'].modes = { dark: { ref: 'color.text', mode: 'light' } };
    const renamed = renameColorMode(dt, 'light', 'day');
    expect(listModes(renamed)).toEqual(['day', 'dark']);
    expect(renamed.variables['color.primary'].modes?.dark).toEqual({ ref: 'color.text', mode: 'day' });
    const removed = removeColorMode(renamed, 'day');
    expect(listModes(removed)).toEqual(['dark']);
    expect(removed.modes).toBeUndefined();
  });
});

describe('isRegistryCustom', () => {
  it('stays false for the defaults and true once any mode is authored', () => {
    expect(isRegistryCustom(structuredClone(DEFAULT_V2_REGISTRY))).toBe(false);
    expect(isRegistryCustom({ ...structuredClone(DEFAULT_V2_REGISTRY), modes: { light: {} } })).toBe(true);
    const withEntry = structuredClone(DEFAULT_V2_REGISTRY);
    withEntry.variables['color.text'].modes = { light: { value: '#000' } };
    expect(isRegistryCustom(withEntry)).toBe(true);
  });
});

describe('colour mode declarations', () => {
  it('parses names, keeping an explicit default and treating blank/malformed as none', () => {
    expect(parseColorMode('light')).toBe('light');
    expect(parseColorMode(' dark ')).toBe('dark');
    expect(parseColorMode('default')).toBe('default');
    expect(parseColorMode('')).toBeNull();
    expect(parseColorMode('Light')).toBeNull();
    expect(parseColorMode(3)).toBeNull();
  });

  it('reads and writes .comp and reads .react headers', () => {
    expect(readCompColorMode({ mode: 'sequence', colorMode: 'light' })).toBe('light');
    expect(writeCompColorMode({ a: 1 }, 'print')).toEqual({ a: 1, colorMode: 'print' });
    expect(writeCompColorMode({ a: 1, colorMode: 'x' }, null)).toEqual({ a: 1 });
    expect(readReactColorMode('/* @syvon {"mode":"animated","colorMode":"light"} */\nexport default 1')).toBe('light');
    expect(readReactColorMode('/* @syvon {not json} */')).toBeNull();
  });

  it('writes .react headers', () => {
    const withHeader = '/* @syvon {"mode":"animated"} */\nexport default 1';
    const lit = writeReactColorMode(withHeader, 'light');
    expect(readReactColorMode(lit)).toBe('light');
    expect(lit).toContain('"mode":"animated"');
    expect(readReactColorMode(writeReactColorMode(lit, null))).toBeNull();
    expect(writeReactColorMode(lit, null)).toContain('"mode":"animated"');
    const bare = writeReactColorMode('export default 1', 'print');
    expect(readReactColorMode(bare)).toBe('print');
    expect(bare.endsWith('export default 1')).toBe(true);
    expect(writeReactColorMode('export default 1', null)).toBe('export default 1');
    expect(writeReactColorMode('/* @syvon {not json} */x', 'light')).toBe('/* @syvon {not json} */x');
  });

  it('validates mode values', () => {
    expect(isModeValue({ value: '#000' })).toBe(true);
    expect(isModeValue({ ref: 'color.text', mode: 'default' })).toBe(true);
    expect(isModeValue({ ref: '' })).toBe(false);
    expect(isModeValue({ value: '#000', ref: 'x' })).toBe(false);
    expect(isModeValue('#000')).toBe(false);
  });
});
