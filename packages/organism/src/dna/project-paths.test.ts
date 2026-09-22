import { describe, it, expect } from 'vitest';
import {
  getProjectItemPath,
  getProjectItemKey,
  toProjectItemObjectKey,
} from './project-paths';

/**
 * Regression guard for the duplicate-`ProjectItem` bug.
 *
 * Three writers put rows in `ProjectItem`, and they used to disagree about the
 * shape of `r2Key`: the agent's `make/persist.ts` stored `projects/{slug}/…`
 * while `workspace-sync`'s R2 reconcile stored `workspaces/{ws}/projects/{slug}/…`.
 * The table is unique on `(projectId, r2Key)`, so the two shapes are two keys
 * for ONE object — the constraint never fires, the row silently doubles, and the
 * project grid shows two identical cards. One workspace reached 671 rows for 485
 * real files that way.
 *
 * These tests pin the contract the writers now share. If one of them starts
 * producing a different shape, this fails instead of the grid quietly doubling.
 */
describe('project item keys', () => {
  const WS = 'cmpob4w3900hd4yvbv7kck9kg';
  const PREFIX = `workspaces/${WS}`;

  it('getProjectItemPath stays ws-RELATIVE (what a .comp stores for its siblings)', () => {
    expect(getProjectItemPath('ig-proof-run', 'voice/vo-abc.mp3')).toBe(
      'projects/ig-proof-run/voice/vo-abc.mp3',
    );
  });

  it('getProjectItemKey is bucket-ABSOLUTE (what the database stores)', () => {
    const rel = getProjectItemPath('ig-proof-run', 'comp-1.comp');
    expect(getProjectItemKey(PREFIX, rel)).toBe(
      `workspaces/${WS}/projects/ig-proof-run/comp-1.comp`,
    );
  });

  it('tolerates a trailing slash on the prefix and a leading slash on the path', () => {
    expect(getProjectItemKey(`${PREFIX}/`, '/projects/p/a.comp')).toBe(
      `workspaces/${WS}/projects/p/a.comp`,
    );
  });

  it('an empty prefix yields the relative path rather than a leading slash', () => {
    expect(getProjectItemKey('', 'projects/p/a.comp')).toBe('projects/p/a.comp');
  });

  it('BOTH historic shapes collapse to the same object identity', () => {
    const absolute = `workspaces/${WS}/projects/p/voice/vo-abc.mp3`;
    const relative = 'projects/p/voice/vo-abc.mp3';
    expect(toProjectItemObjectKey(absolute)).toBe(toProjectItemObjectKey(relative));
  });

  it('normalizing an already-canonical key is a no-op (re-running the repair is safe)', () => {
    const canonical = `workspaces/${WS}/projects/p/a.comp`;
    expect(getProjectItemKey(PREFIX, toProjectItemObjectKey(canonical))).toBe(canonical);
  });

  it('a relative key normalizes INTO the canonical one — the two writers now agree', () => {
    const fromAgent = getProjectItemPath('p', 'a.comp'); // make/persist.ts
    const fromReconcile = `workspaces/${WS}/projects/p/a.comp`; // R2 listing key
    expect(getProjectItemKey(PREFIX, toProjectItemObjectKey(fromAgent))).toBe(fromReconcile);
  });

  it('does not mistake a project folder literally named "workspaces" for a prefix', () => {
    expect(toProjectItemObjectKey('projects/workspaces/a.comp')).toBe(
      'projects/workspaces/a.comp',
    );
  });
});
