import { describe, expect, it } from 'vitest';
import { isRenderOutput, posterPathFor, posterPathsFor, recapTiles, type RecapCandidate } from './render-recap';

/**
 * The selection rules every workspace card depends on. These are the reason
 * a card shows four pictures instead of four broken squares.
 */

function c(path: string, at = '2026-08-20T10:00:00.000Z'): RecapCandidate {
  return { path, at };
}
const noPosters = () => false;
const allPosters = () => true;

describe('isRenderOutput', () => {
  it('accepts a project output path, at any depth', () => {
    expect(isRenderOutput('projects/saturn/output/a.png')).toBe(true);
    expect(isRenderOutput('projects/saturn/sub/output/a.png')).toBe(true);
  });

  it('rejects everything outside output/', () => {
    expect(isRenderOutput('projects/saturn/a.png')).toBe(false);
    expect(isRenderOutput('assets/imagery/a.png')).toBe(false);
    expect(isRenderOutput('feed/workflows/x/a.png')).toBe(false);
  });
});

describe('recapTiles', () => {
  it('takes stills as they are', () => {
    const tiles = recapTiles([c('projects/s/output/a.png'), c('projects/s/output/b.jpg')], noPosters);
    expect(tiles.map((t) => t.path)).toEqual(['projects/s/output/a.png', 'projects/s/output/b.jpg']);
  });

  it('shows a video only through its baked poster', () => {
    const withPoster = recapTiles([c('projects/s/output/reel.mp4')], allPosters);
    // WebP wins when both spellings are present — it is the codec posters bake in.
    expect(withPoster.map((t) => t.path)).toEqual(['projects/s/output/reel.mp4.poster.webp']);
    // No poster baked -> dropped, NOT shown broken. This is the 404 fix.
    expect(recapTiles([c('projects/s/output/reel.mp4')], noPosters)).toEqual([]);
  });

  it('never shows one render twice - the poster is its videos face', () => {
    const tiles = recapTiles(
      [c('projects/s/output/reel.mp4'), c('projects/s/output/reel.mp4.poster.jpg')],
      allPosters,
    );
    expect(tiles).toHaveLength(1);
    expect(tiles[0].path).toBe('projects/s/output/reel.mp4.poster.webp');
  });

  it('keeps an orphan poster - it is still a picture of a render', () => {
    // Versioned comp posters arrive with no sibling video at all.
    const tiles = recapTiles([c('projects/s/output/post.comp.poster.cbbba474.jpg')], noPosters);
    expect(tiles.map((t) => t.path)).toEqual(['projects/s/output/post.comp.poster.cbbba474.jpg']);
  });

  it('drops rollover preview clips', () => {
    expect(recapTiles([c('projects/s/output/a.comp.preview.mp4')], allPosters)).toEqual([]);
    expect(recapTiles([c('projects/s/output/a.comp.preview.v2.mp4')], allPosters)).toEqual([]);
  });

  it('ignores anything outside a project output folder', () => {
    expect(recapTiles([c('assets/imagery/logo.png'), c('projects/s/draft.png')], allPosters)).toEqual([]);
  });

  it('sorts newest first and caps at the limit', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      c(`projects/s/output/n-${i}.png`, `2026-08-${String(i + 1).padStart(2, '0')}T09:00:00.000Z`),
    );
    const tiles = recapTiles(many, noPosters, 4);
    expect(tiles.map((t) => t.path)).toEqual([
      'projects/s/output/n-19.png',
      'projects/s/output/n-18.png',
      'projects/s/output/n-17.png',
      'projects/s/output/n-16.png',
    ]);
  });
});

describe('posterPathFor', () => {
  it('follows the pipelines bake convention', () => {
    expect(posterPathFor('projects/s/output/reel.mp4')).toBe('projects/s/output/reel.mp4.poster.webp');
  });

  it('offers the JPEG spelling too, for anything rendered before the codec switch', () => {
    expect(posterPathsFor('projects/s/output/reel.mp4')).toEqual([
      'projects/s/output/reel.mp4.poster.webp',
      'projects/s/output/reel.mp4.poster.jpg',
    ]);
  });
});

describe('one tile per source', () => {
  it('collapses a comps unversioned and DNA-versioned posters into one', () => {
    // A .comp accumulates a poster per brand revision. All of them picture
    // the same design, so a card showing both is two of its four tiles spent
    // on one render.
    const tiles = recapTiles(
      [
        c('projects/s/output/post.comp.poster.jpg', '2026-08-01T00:00:00.000Z'),
        c('projects/s/output/post.comp.poster.cbbba474.jpg', '2026-08-02T00:00:00.000Z'),
      ],
      noPosters,
    );
    expect(tiles).toHaveLength(1);
    // The newest bake wins.
    expect(tiles[0].path).toBe('projects/s/output/post.comp.poster.cbbba474.jpg');
  });

  it('keeps posters of DIFFERENT sources apart', () => {
    const tiles = recapTiles(
      [c('projects/s/output/a.comp.poster.jpg'), c('projects/s/output/b.comp.poster.jpg')],
      noPosters,
    );
    expect(tiles).toHaveLength(2);
  });
});
