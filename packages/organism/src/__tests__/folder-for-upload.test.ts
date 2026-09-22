import { describe, it, expect } from 'vitest';
import { folderForUpload, brandIdentityKind } from '../dna/brand-folder-paths';
import { kindFromFilename } from '../dna/defaults/structure-v7';

const route = (name: string) => folderForUpload(kindFromFilename(name), name);

describe('folderForUpload', () => {
  it('keeps primary identity binaries at the assets root', () => {
    expect(route('logo.svg')).toBe('');
    expect(route('mark.svg')).toBe('');
    expect(route('wordmark.svg')).toBe('');
  });
  it('routes non-primary svgs with logo/mark in the name to logos', () => {
    expect(route('PwC_2025_Logo.svg')).toBe('logos');
  });
  it('routes other svgs to graphics', () => {
    expect(route('icon-arrow.svg')).toBe('graphics');
  });
  it('routes raster images to imagery', () => {
    expect(route('hero.png')).toBe('imagery');
    expect(route('shot.jpg')).toBe('imagery');
  });
  it('routes video to video and audio to audio', () => {
    expect(route('clip.mp4')).toBe('video');
    expect(route('sting.mp3')).toBe('audio');
  });
  it('routes docs to knowledge', () => {
    expect(route('brief.pdf')).toBe('knowledge');
    expect(route('notes.md')).toBe('knowledge');
  });
  it('falls back to uploads for fonts and unknowns', () => {
    expect(route('Helvetica.otf')).toBe('uploads');
    expect(route('data.bin')).toBe('uploads');
  });

  /**
   * A raster mark used to fall through to imagery/, and a raster `logo.png`
   * used to be parked at the assets ROOT — which is read svg-only, so it was
   * invisible to every logo reader. Both are the "uploaded my logo and nothing
   * happened" bug.
   */
  it('routes raster identity marks to logos, not imagery or the root', () => {
    expect(route('logo.png')).toBe('logos');
    expect(route('logo-white.png')).toBe('logos');
    expect(route('wordmark.jpg')).toBe('logos');
    expect(route('symbol-dark.webp')).toBe('logos');
  });
  it('still keeps only the SVG forms at the assets root', () => {
    expect(route('mark.png')).toBe('logos');
    expect(route('mark.svg')).toBe('');
  });
  it('does not mistake a photo for a mark on a substring', () => {
    expect(route('market-stall.jpg')).toBe('imagery');
    expect(route('iconic-shot.png')).toBe('imagery');
    expect(route('denmark.png')).toBe('imagery');
  });
});

describe('brandIdentityKind', () => {
  it('recognises the canonical marks in any image format', () => {
    expect(brandIdentityKind('logo.svg')).toBe('logo');
    expect(brandIdentityKind('logo.png')).toBe('logo');
    expect(brandIdentityKind('wordmark.webp')).toBe('wordmark');
    expect(brandIdentityKind('mark.jpg')).toBe('mark');
  });
  it('reads the variant from the stem inside assets/logos/', () => {
    expect(brandIdentityKind('assets/logos/logo-light.png')).toBe('logo');
    expect(brandIdentityKind('assets/logos/logo-wordmark.png')).toBe('wordmark');
    expect(brandIdentityKind('assets/logos/logo-symbol.png')).toBe('mark');
  });
  it('is null for ordinary media, so the caller keeps its own kind', () => {
    expect(brandIdentityKind('assets/imagery/hero.png')).toBeNull();
    expect(brandIdentityKind('assets/imagery/market-stall.jpg')).toBeNull();
    expect(brandIdentityKind('assets/logos/notes.txt')).toBeNull();
  });
});
