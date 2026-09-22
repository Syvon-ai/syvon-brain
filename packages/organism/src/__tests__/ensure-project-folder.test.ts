/**
 * `ensureProjectFolder` — characterization tests.
 *
 * WHY THIS FILE EXISTS. The helper had no coverage, and a multi-turn agent eval
 * showed every edit turn failing its first attempt with "The specified key does
 * not exist" before recovering via find_files. The cause is the bare-filename
 * branch below: a path with no folder segment does not fail, it silently
 * resolves into DEFAULT_PROJECT_FOLDER ('projects/My First Project') — a folder
 * unrelated to whatever project the agent is actually working in.
 *
 * On a READ that surfaces as a missing key. On a WRITE — and write_file,
 * create_sequence, hydrate_template and hydrate_format all run paths through
 * here — it succeeds silently into the wrong project.
 *
 * These tests pin TODAY's behaviour, bug included, so a fix has something to
 * move against. The bare-filename case is marked so it is not mistaken for
 * intended design.
 */
import { describe, it, expect } from 'vitest';
import { ensureProjectFolder, DEFAULT_PROJECT_FOLDER, WS_WORK } from '../workspace-config';

describe('ensureProjectFolder — paths that already name a project', () => {
  it('keeps a full projects/<project>/<file> path unchanged', () => {
    expect(ensureProjectFolder('projects/surface-eval-multiturn/deck.comp')).toBe(
      'projects/surface-eval-multiturn/deck.comp',
    );
  });

  it('adds the projects/ prefix to a bare <project>/<file> path', () => {
    expect(ensureProjectFolder('surface-eval-multiturn/deck.comp')).toBe(
      'projects/surface-eval-multiturn/deck.comp',
    );
  });

  it('normalizes backslashes and leading slashes', () => {
    expect(ensureProjectFolder('\\projects\\my-deck\\cover.dsgn')).toBe('projects/my-deck/cover.dsgn');
  });

  it('strips the legacy shots/ sequences/ designs/ segments', () => {
    expect(ensureProjectFolder('projects/my-deck/sequences/reel.comp')).toBe(
      'projects/my-deck/sequences/reel.comp',
    );
    expect(ensureProjectFolder('sequences/reel.comp')).toBe(`${WS_WORK}/${'reel.comp'}`.replace(
      `${WS_WORK}/`,
      `${DEFAULT_PROJECT_FOLDER}/`,
    ));
  });
});

describe('ensureProjectFolder — a bare filename resolves against the active project', () => {
  /**
   * The regression this file was written for. A bare name used to resolve into
   * DEFAULT_PROJECT_FOLDER no matter which project the caller was in, so every
   * edit turn failed its first attempt on a missing key and every bare write
   * silently landed in "My First Project".
   */
  it('uses the active project when one is given', () => {
    const resolved = ensureProjectFolder('deck.comp', 'surface-eval-multiturn');

    expect(resolved).toBe('projects/surface-eval-multiturn/deck.comp');
    expect(resolved).not.toContain('My First Project');
  });

  it('accepts an active project that already carries the projects/ prefix', () => {
    expect(ensureProjectFolder('deck.comp', 'projects/surface-eval-multiturn')).toBe(
      'projects/surface-eval-multiturn/deck.comp',
    );
  });

  it('tolerates stray slashes and backslashes around the active project', () => {
    expect(ensureProjectFolder('deck.comp', '/my-deck/')).toBe('projects/my-deck/deck.comp');
    expect(ensureProjectFolder('deck.comp', '\\my-deck')).toBe('projects/my-deck/deck.comp');
  });

  it('applies to every extension the agent tools write', () => {
    for (const name of ['cover.dsgn', 'reel.comp', 'notes.md', 'scene.react']) {
      expect(ensureProjectFolder(name, 'my-deck')).toBe(`projects/my-deck/${name}`);
    }
  });

  it('never overrides a path that already names its own project', () => {
    expect(ensureProjectFolder('projects/other-deck/reel.comp', 'my-deck')).toBe(
      'projects/other-deck/reel.comp',
    );
  });
});

describe('ensureProjectFolder — no active project (unchanged legacy behaviour)', () => {
  it('still falls back to DEFAULT_PROJECT_FOLDER for a bare name', () => {
    expect(ensureProjectFolder('deck.comp')).toBe(`${DEFAULT_PROJECT_FOLDER}/deck.comp`);
  });

  it('treats an empty active project as absent', () => {
    expect(ensureProjectFolder('deck.comp', '')).toBe(`${DEFAULT_PROJECT_FOLDER}/deck.comp`);
  });

  it('falls back to untitled.comp when the path is empty', () => {
    expect(ensureProjectFolder('')).toBe(`${DEFAULT_PROJECT_FOLDER}/untitled.comp`);
  });
});
