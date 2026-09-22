import { describe, expect, it } from 'vitest';
import { checkColorModeDeclarations, findColorModeDeclarations } from '../dna/color-mode-check';
import type { DesignTokensV2 } from '../dna/design-tokens/design-tokens-v2-types';

const tokens: DesignTokensV2 = {
  version: 2,
  modes: { light: { label: 'Light' } },
  variables: {
    'color.text': { type: 'color', value: '#eee', modes: { print: { value: '#000' } } },
    'color.background': { type: 'color', value: '#111' },
  },
};

describe('findColorModeDeclarations', () => {
  it('reads every attribute of a .dsgn with its element and line', () => {
    const src = [
      '<FormatCanvas colorMode="light">',
      '  <Frame colorMode={\'print\'}>',
      '    <Group colorMode={mode}>',
      '  </Frame>',
      '</FormatCanvas>',
    ].join('\n');
    expect(findColorModeDeclarations('a.dsgn', src)).toEqual([
      { raw: 'light', where: '<FormatCanvas> line 1' },
      { raw: 'print', where: '<Frame> line 2' },
    ]);
  });

  it('reads a .react header', () => {
    const src = '/* @syvon {"mode":"animated","colorMode":"light"} */\nexport default () => null';
    expect(findColorModeDeclarations('x.react', src)).toEqual([{ raw: 'light', where: 'header' }]);
  });

  it('reads every place a .comp can declare one', () => {
    const doc = {
      colorMode: 'light',
      items: [{ src: 'a.dsgn', colorMode: 'print' }, { inlineShot: { colorMode: 'dark' } }],
      tracks: [{ id: 't', type: 'video', items: [{ colorMode: 'default' }] }],
      nodes: {
        intro: { kind: 'screen', source: 'a.dsgn', colorMode: 'light' },
        body: { kind: 'sequence', tracks: [{ items: [{ colorMode: 'sepia' }] }] },
      },
    };
    expect(findColorModeDeclarations('x.comp', JSON.stringify(doc)).map((s) => `${s.where}=${s.raw}`)).toEqual([
      'colorMode=light',
      'items[0]=print',
      'items[1].inlineShot=dark',
      'tracks[0].items[0]=default',
      'nodes.intro=light',
      'nodes.body.tracks[0].items[0]=sepia',
    ]);
  });

  it('declares nothing for unparseable or undeclaring files', () => {
    expect(findColorModeDeclarations('x.comp', '{nope')).toEqual([]);
    expect(findColorModeDeclarations('x.react', 'export default 1')).toEqual([]);
    expect(findColorModeDeclarations('x.json', '{"colorMode":"x"}')).toEqual([]);
  });
});

describe('checkColorModeDeclarations', () => {
  it('accepts default, declared and used-only modes', () => {
    const src = JSON.stringify({ colorMode: 'default', items: [{ colorMode: 'light' }, { colorMode: 'print' }] });
    expect(checkColorModeDeclarations('x.comp', src, tokens)).toEqual([]);
  });

  it('reports an unknown mode with the modes the brand has', () => {
    const [issue, ...rest] = checkColorModeDeclarations('a.dsgn', '<FormatCanvas colorMode="ligth">', tokens);
    expect(rest).toEqual([]);
    expect(issue).toMatchObject({ code: 'color_mode_unknown', raw: 'ligth', where: '<FormatCanvas> line 1' });
    expect(issue.message).toContain('`default`, `light`, `print`');
  });

  it('reports a malformed value even without tokens, and nothing unknown', () => {
    const src = '<Frame colorMode="Light Mode"><Frame colorMode="sepia">';
    expect(checkColorModeDeclarations('a.dsgn', src, null).map((i) => i.code)).toEqual(['color_mode_malformed']);
  });

  it('says the brand has no modes when it has none', () => {
    const plain: DesignTokensV2 = { version: 2, variables: { 'color.text': { type: 'color', value: '#000' } } };
    const [issue] = checkColorModeDeclarations('x.react', '/* @syvon {"colorMode":"light"} */', plain);
    expect(issue.code).toBe('color_mode_unknown');
    expect(issue.message).toContain('declares no colour modes');
  });
});
