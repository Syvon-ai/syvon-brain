import { describe, it, expect } from 'vitest';
import {
  projectSlugFromPath,
  isSessionScopedPath,
  resolveProjectOutputPath,
  resolveRenderOutputPath,
  PREVIEWS_PROJECT_SLUG,
} from '../dna/output-paths';

/**
 * G2 guard. The feed is a projection of `projects/{slug}/output/`; a session
 * holds drafts. These helpers are the single rule that turns "where the source
 * sits" into "where its export belongs", so the renderers stop defaulting to
 * `export/` (sync:false — invisible to the feed) whenever a project owns the
 * source.
 */
describe('projectSlugFromPath', () => {
  it('resolves the slug at any depth under projects/', () => {
    expect(projectSlugFromPath('projects/reel/reel.comp')).toBe('reel');
    expect(projectSlugFromPath('projects/reel/output/reel.mp4')).toBe('reel');
    expect(projectSlugFromPath('projects/reel/sessions/s-1/output/reel.comp')).toBe('reel');
    expect(projectSlugFromPath('projects/reel/shots/abc123/01.dsgn')).toBe('reel');
  });

  it('tolerates backslashes, duplicate and leading slashes', () => {
    expect(projectSlugFromPath('projects\\reel\\output\\reel.mp4')).toBe('reel');
    expect(projectSlugFromPath('/projects//reel/reel.comp')).toBe('reel');
  });

  it('is case-insensitive on the projects/ segment but preserves slug case', () => {
    expect(projectSlugFromPath('Projects/My-Reel/reel.comp')).toBe('My-Reel');
  });

  it('returns null off the projects/ spine', () => {
    expect(projectSlugFromPath('brands/fortys/assets/logos/mark.svg')).toBeNull();
    expect(projectSlugFromPath('workflows/basic-motion/system.md')).toBeNull();
    expect(projectSlugFromPath('export/reel.mp4')).toBeNull();
    expect(projectSlugFromPath('projects')).toBeNull();
    expect(projectSlugFromPath('')).toBeNull();
  });
});

describe('isSessionScopedPath', () => {
  it('is true only inside a project session folder', () => {
    expect(isSessionScopedPath('projects/reel/sessions/s-1/output/reel.comp')).toBe(true);
    expect(isSessionScopedPath('projects/reel/sessions/s-1/chat.jsonl')).toBe(true);
  });

  it('is false at project root and off-spine', () => {
    expect(isSessionScopedPath('projects/reel/output/reel.mp4')).toBe(false);
    expect(isSessionScopedPath('projects/reel/reel.comp')).toBe(false);
    expect(isSessionScopedPath('brands/fortys/assets/video/b-roll.mp4')).toBe(false);
  });
});

describe('resolveProjectOutputPath', () => {
  it('flattens a session draft to the project-root output the feed reads', () => {
    expect(
      resolveProjectOutputPath('projects/reel/sessions/s-1/output/reel.comp', 'reel.mp4'),
    ).toBe('projects/reel/output/reel.mp4');
  });

  it('keeps a project-root source at project root', () => {
    expect(resolveProjectOutputPath('projects/reel/reel.comp', 'reel.mp4')).toBe(
      'projects/reel/output/reel.mp4',
    );
  });

  it('strips any directory the caller put on the filename', () => {
    expect(
      resolveProjectOutputPath('projects/reel/sessions/s-1/output/reel.comp', 'export/reel.png'),
    ).toBe('projects/reel/output/reel.png');
  });

  it('returns null off-spine so the caller keeps its own fallback', () => {
    expect(resolveProjectOutputPath('templates/hero.dsgn', 'hero.png')).toBeNull();
    expect(resolveProjectOutputPath('brands/fortys/assets/react/orb.react', 'orb.mp4')).toBeNull();
  });

  it('returns null on an empty filename rather than a directory path', () => {
    expect(resolveProjectOutputPath('projects/reel/reel.comp', '')).toBeNull();
  });
});

describe('resolveRenderOutputPath', () => {
  it('sends a project-owned source to its own project output', () => {
    expect(resolveRenderOutputPath('projects/reel/sessions/s-1/output/reel.comp', 'reel.mp4')).toBe(
      'projects/reel/output/reel.mp4',
    );
  });

  it('sends an OFF-SPINE source to the previews project, never to export/', () => {
    // `export/` is sync:false and read by nothing — a preview left there is
    // stranded on whichever machine produced it.
    for (const src of [
      'templates/hero.dsgn',
      'workflows/basic-motion/exemplar.dsgn',
      'brands/fortys/assets/react/orb.react',
    ]) {
      const out = resolveRenderOutputPath(src, 'x.png');
      expect(out).toBe(`projects/${PREVIEWS_PROJECT_SLUG}/output/x.png`);
      expect(out.startsWith('export/')).toBe(false);
    }
  });

  it('never returns null — that is the whole point over resolveProjectOutputPath', () => {
    expect(typeof resolveRenderOutputPath('nowhere.dsgn', 'a.png')).toBe('string');
  });
});
