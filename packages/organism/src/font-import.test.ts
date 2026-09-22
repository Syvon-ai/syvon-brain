import { describe, it, expect } from 'vitest';
import {
  isValidFontBuffer,
  fontExtFromBuffer,
  buildFontFileName,
  googleFontsCss2Url,
  parseFontFacesFromCss,
} from './font-import';

describe('font-import pure helpers', () => {
  it('accepts a woff2 magic-byte buffer and rejects an HTML page', () => {
    const woff2 = new Uint8Array([0x77, 0x4f, 0x46, 0x32, 0, 0, 0, 0]); // wOF2
    const html = new Uint8Array([0x3c, 0x21, 0x44, 0x4f]); // "<!DO"
    expect(isValidFontBuffer(woff2)).toBe(true);
    expect(isValidFontBuffer(html)).toBe(false);
    expect(fontExtFromBuffer(woff2)).toBe('woff2');
    expect(fontExtFromBuffer(html)).toBeNull();
  });

  it('builds a fonts.json-style filename', () => {
    expect(buildFontFileName('PT Serif', 700, 'italic', 'woff2')).toBe('PT-Serif-700-italic.woff2');
    expect(buildFontFileName('Inter', 400, 'normal', 'ttf')).toBe('Inter-400-normal.ttf');
  });

  it('builds a css2 URL — wght axis for normal, ital,wght matrix for italics', () => {
    expect(googleFontsCss2Url('PT Serif', [700, 400], ['normal'])).toBe(
      'https://fonts.googleapis.com/css2?family=PT+Serif:wght@400;700&display=swap',
    );
    expect(googleFontsCss2Url('Inter', [400], ['normal', 'italic'])).toBe(
      'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;1,400&display=swap',
    );
  });

  it('parses @font-face faces out of a stylesheet', () => {
    const css = `
      @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 400;
        src: url(https://fonts.gstatic.com/s/inter/v1/inter-400.woff2) format('woff2');
      }`;
    const faces = parseFontFacesFromCss(css);
    expect(faces).toHaveLength(1);
    expect(faces[0]).toMatchObject({
      family: 'Inter',
      weight: 400,
      style: 'normal',
      url: 'https://fonts.gstatic.com/s/inter/v1/inter-400.woff2',
    });
  });
});
