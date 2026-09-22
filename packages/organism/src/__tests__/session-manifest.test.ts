import { describe, it, expect } from 'vitest';
import {
  SESSION_MANIFEST_VERSION,
  parseSessionManifest,
  isSessionManifestV2,
  sessionProjects,
  projectScope,
  scopeProjectSlug,
  withActiveProject,
  withActiveSkill,
  withSessionContext,
  withPinnedPath,
  withoutPinnedPath,
  withHiddenPath,
  withoutHiddenPath,
  withCanvasOrder,
  MAX_SESSION_PINS,
} from '../dna/session-manifest';

const CTX = { id: 's-abc', primaryProjectSlug: 'reel' };

describe('parseSessionManifest — v1 upgrade', () => {
  // v1 carried no project field: the owning slug WAS the key path, so the
  // caller has to supply it from wherever it resolved the folder.
  it('takes the project slug from the caller when the manifest has none', () => {
    const m = parseSessionManifest({ id: 's-abc', name: 'Spring reel' }, CTX);
    expect(m.v).toBe(SESSION_MANIFEST_VERSION);
    expect(m.primaryProjectSlug).toBe('reel');
    expect(m.name).toBe('Spring reel');
    expect(m.context).toEqual({ projects: [], paths: [], canvas: { hidden: [], order: [] } });
  });

  it('carries the v1 counters across', () => {
    const m = parseSessionManifest(
      { id: 's-abc', name: 'x', createdAt: '2026-01-01T00:00:00Z', lastAnswerAt: '2026-01-02T00:00:00Z', answerCount: 4 },
      CTX,
    );
    expect(m.createdAt).toBe('2026-01-01T00:00:00Z');
    expect(m.lastAnswerAt).toBe('2026-01-02T00:00:00Z');
    expect(m.answerCount).toBe(4);
  });

  it('defaults origin to agent, and honours an explicit one', () => {
    expect(parseSessionManifest({}, CTX).origin).toBe('agent');
    expect(parseSessionManifest({}, { ...CTX, origin: 'connector-claude' }).origin).toBe('connector-claude');
    expect(parseSessionManifest({ origin: 'studio' }, CTX).origin).toBe('studio');
  });

  it('rejects an unknown origin rather than trusting the file', () => {
    expect(parseSessionManifest({ origin: 'wat' }, CTX).origin).toBe('agent');
  });
});

describe('parseSessionManifest — unknown keys', () => {
  // THE regression this guards: `session.json#settings` is the conversation's
  // generation prefs, the manifest is rewritten on every answer, and a parser
  // that dropped unmodelled keys would silently reset the user's settings once
  // per turn. See apps/agent/src/lib/server/make/generation-prefs.ts.
  it('preserves settings across a parse -> write round trip', () => {
    const settings = { model: 'veo3', duration: 8 };
    const m = parseSessionManifest({ id: 's-abc', settings }, CTX);
    expect(m.settings).toEqual(settings);
    expect(JSON.parse(JSON.stringify(m)).settings).toEqual(settings);
  });

  it('preserves any other unmodelled key', () => {
    const m = parseSessionManifest({ verdictsSeen: 3, somethingNew: { a: 1 } }, CTX);
    expect(m.verdictsSeen).toBe(3);
    expect(m.somethingNew).toEqual({ a: 1 });
  });
});

describe('activeSkill', () => {
  it('round-trips through the parser', () => {
    const m = parseSessionManifest({ id: 's-abc', activeSkill: '__builtin__/syvon-world' }, CTX);
    expect(m.activeSkill).toBe('__builtin__/syvon-world');
    expect(JSON.parse(JSON.stringify(m)).activeSkill).toBe('__builtin__/syvon-world');
  });

  it('drops an empty or non-string value rather than carrying junk', () => {
    expect('activeSkill' in parseSessionManifest({ activeSkill: '' }, CTX)).toBe(false);
    expect('activeSkill' in parseSessionManifest({ activeSkill: '  ' }, CTX)).toBe(false);
    expect('activeSkill' in parseSessionManifest({ activeSkill: 42 }, CTX)).toBe(false);
  });

  it('is absent — not undefined-present — on a manifest that predates the field', () => {
    expect('activeSkill' in parseSessionManifest({ id: 's-abc', name: 'x' }, CTX)).toBe(false);
  });

  it('withActiveSkill sets, overwrites, and is an identity no-op when unchanged', () => {
    const base = parseSessionManifest({}, CTX);
    const set = withActiveSkill(base, '__builtin__/syvon-world');
    expect(set.activeSkill).toBe('__builtin__/syvon-world');
    expect(withActiveSkill(set, '__builtin__/syvon-world')).toBe(set);
    const swapped = withActiveSkill(set, '__builtin__/syvon-maker');
    expect(swapped.activeSkill).toBe('__builtin__/syvon-maker');
  });

  it('withActiveSkill clears with null or empty, removing the key entirely', () => {
    const set = withActiveSkill(parseSessionManifest({}, CTX), '__builtin__/syvon-world');
    const cleared = withActiveSkill(set, null);
    expect('activeSkill' in cleared).toBe(false);
    expect(withActiveSkill(cleared, '')).toBe(cleared);
  });
});

describe('parseSessionManifest — tolerance', () => {
  // Losing a manifest must never make its transcript unreadable.
  it('degrades a null / corrupt / non-object manifest to a well-formed default', () => {
    for (const raw of [null, undefined, 'nonsense', 42, []]) {
      const m = parseSessionManifest(raw, CTX);
      expect(m.id).toBe('s-abc');
      expect(m.name).toBe('s-abc');
      expect(m.primaryProjectSlug).toBe('reel');
      expect(m.answerCount).toBe(0);
      expect(m.createdAt).toBeNull();
    }
  });

  it('clamps a junk answerCount', () => {
    expect(parseSessionManifest({ answerCount: -3 }, CTX).answerCount).toBe(0);
    expect(parseSessionManifest({ answerCount: 'four' }, CTX).answerCount).toBe(0);
    expect(parseSessionManifest({ answerCount: 2.7 }, CTX).answerCount).toBe(2);
  });

  it('ignores junk inside context instead of throwing', () => {
    const m = parseSessionManifest({ context: { projects: ['a', '', 'a', 7], paths: 'nope' } }, CTX);
    expect(m.context.projects).toEqual(['a']);
    expect(m.context.paths).toEqual([]);
  });
});

describe('context — the primary is implicit', () => {
  it('strips the primary slug if a writer listed it in context.projects', () => {
    const m = parseSessionManifest({ context: { projects: ['reel', 'promo'] } }, CTX);
    expect(m.context.projects).toEqual(['promo']);
  });

  it('sessionProjects returns the union, primary first', () => {
    const m = parseSessionManifest({ context: { projects: ['promo', 'teaser'] } }, CTX);
    expect(sessionProjects(m)).toEqual(['reel', 'promo', 'teaser']);
  });

  it('withSessionContext records a new project and is idempotent', () => {
    const m = parseSessionManifest({}, CTX);
    const once = withSessionContext(m, { project: 'promo' });
    expect(once.context.projects).toEqual(['promo']);
    // Same input returns the SAME object, so a caller can skip the write.
    expect(withSessionContext(once, { project: 'promo' })).toBe(once);
  });

  it('withSessionContext never records the primary as an extra', () => {
    const m = parseSessionManifest({}, CTX);
    expect(withSessionContext(m, { project: 'reel' })).toBe(m);
  });

  it('withSessionContext records paths', () => {
    const m = parseSessionManifest({}, CTX);
    expect(withSessionContext(m, { path: 'projects/reel/a.comp' }).context.paths).toEqual([
      'projects/reel/a.comp',
    ]);
  });
});

describe('switching the active project', () => {
  // One conversation, several linked projects, exactly one active. The half
  // that is easy to lose is the DEMOTION — overwrite the primary alone and
  // every project worked in before this one disappears.
  it('demotes the outgoing project into context instead of dropping it', () => {
    const m = parseSessionManifest({}, CTX); // primary = reel
    const moved = withActiveProject(m, 'promo');
    expect(moved.primaryProjectSlug).toBe('promo');
    expect(moved.context.projects).toEqual(['reel']);
    expect(sessionProjects(moved)).toEqual(['promo', 'reel']);
  });

  it('accumulates across several switches, never losing one', () => {
    let m = parseSessionManifest({}, CTX); // reel
    m = withActiveProject(m, 'promo');
    m = withActiveProject(m, 'teaser');
    expect(m.primaryProjectSlug).toBe('teaser');
    expect(m.context.projects.sort()).toEqual(['promo', 'reel']);
  });

  it('promoting a previously-linked project back does not duplicate it', () => {
    let m = parseSessionManifest({}, CTX); // reel
    m = withActiveProject(m, 'promo'); // reel linked
    m = withActiveProject(m, 'reel'); // back to reel, promo linked
    expect(m.primaryProjectSlug).toBe('reel');
    expect(m.context.projects).toEqual(['promo']);
  });

  // Safe to call on every turn.
  it('is a no-op when the slug is already active', () => {
    const m = parseSessionManifest({}, CTX);
    expect(withActiveProject(m, 'reel')).toBe(m);
    expect(withActiveProject(m, '  ')).toBe(m);
  });

  it('has nothing to demote when the session never had a primary', () => {
    const m = parseSessionManifest({}, { id: 's-abc', primaryProjectSlug: '' });
    const moved = withActiveProject(m, 'promo');
    expect(moved.primaryProjectSlug).toBe('promo');
    expect(moved.context.projects).toEqual([]);
  });
});

describe('pinned files — the working set', () => {
  // Pins are DELIBERATE. What a turn merely touched is in the card ledger;
  // mirroring that here would grow without bound and make every prompt worse.
  it('pins a path, newest last', () => {
    let m = parseSessionManifest({}, CTX);
    m = withPinnedPath(m, 'projects/reel/a.comp');
    m = withPinnedPath(m, 'assets/logo.svg');
    expect(m.context.paths).toEqual(['projects/reel/a.comp', 'assets/logo.svg']);
  });

  it('pinning the same path twice returns the SAME manifest, so no write happens', () => {
    const m = withPinnedPath(parseSessionManifest({}, CTX), 'a.comp');
    expect(withPinnedPath(m, 'a.comp')).toBe(m);
  });

  it('normalises a leading slash so one file cannot be pinned twice', () => {
    const m = withPinnedPath(parseSessionManifest({}, CTX), 'a.comp');
    expect(withPinnedPath(m, '/a.comp')).toBe(m);
  });

  it('ignores an empty path', () => {
    const m = parseSessionManifest({}, CTX);
    expect(withPinnedPath(m, '   ')).toBe(m);
  });

  // The cap is a prompt-cost guard: pins are re-sent on EVERY turn.
  it('caps the list, dropping the OLDEST so a new pin still succeeds', () => {
    let m = parseSessionManifest({}, CTX);
    for (let i = 0; i < MAX_SESSION_PINS + 5; i++) m = withPinnedPath(m, `f${i}.comp`);
    expect(m.context.paths).toHaveLength(MAX_SESSION_PINS);
    expect(m.context.paths[0]).toBe('f5.comp');
    expect(m.context.paths.at(-1)).toBe(`f${MAX_SESSION_PINS + 4}.comp`);
  });

  it('unpins', () => {
    let m = withPinnedPath(parseSessionManifest({}, CTX), 'a.comp');
    m = withPinnedPath(m, 'b.comp');
    expect(withoutPinnedPath(m, 'a.comp').context.paths).toEqual(['b.comp']);
  });

  it('unpinning something that was never pinned changes nothing', () => {
    const m = withPinnedPath(parseSessionManifest({}, CTX), 'a.comp');
    expect(withoutPinnedPath(m, 'nope.comp')).toBe(m);
  });

  it('pins survive a parse round trip', () => {
    const m = withPinnedPath(parseSessionManifest({}, CTX), 'a.comp');
    const reparsed = parseSessionManifest(JSON.parse(JSON.stringify(m)), CTX);
    expect(reparsed.context.paths).toEqual(['a.comp']);
  });
});

describe('isSessionManifestV2', () => {
  it('tells a v2 manifest from a v1 one', () => {
    expect(isSessionManifestV2({ v: 2 })).toBe(true);
    expect(isSessionManifestV2({ id: 's-abc', name: 'x' })).toBe(false);
    expect(isSessionManifestV2(null)).toBe(false);
  });

  it('accepts what the parser produces', () => {
    expect(isSessionManifestV2(parseSessionManifest({}, CTX))).toBe(true);
  });
});

/**
 * The canvas overlay — the user's edit of a view derived from an append-only
 * ledger. Everything here turns on one rule: hiding is not deleting, so nothing
 * in this file may reach past `context.canvas`.
 */
describe('canvas arrangement', () => {
  const base = () => parseSessionManifest({ id: 's-abc' }, CTX);

  it('starts empty and survives a round trip through the parser', () => {
    const hidden = withHiddenPath(base(), 'projects/reel/a.dsgn');
    const reparsed = parseSessionManifest(JSON.parse(JSON.stringify(hidden)), CTX);
    expect(reparsed.context.canvas).toEqual({ hidden: ['projects/reel/a.dsgn'], order: [] });
  });

  it('hides, unhides, and no-ops on both when nothing changes', () => {
    const m = base();
    const hid = withHiddenPath(m, 'a.dsgn');
    expect(hid.context.canvas.hidden).toEqual(['a.dsgn']);
    expect(withHiddenPath(hid, 'a.dsgn')).toBe(hid);
    const back = withoutHiddenPath(hid, 'a.dsgn');
    expect(back.context.canvas.hidden).toEqual([]);
    expect(withoutHiddenPath(back, 'a.dsgn')).toBe(back);
  });

  /** A hidden tile has no position — leaving one would make unhide restore a
   *  slot rather than the ledger's answer. */
  it('drops a hidden path out of the order', () => {
    const m = withCanvasOrder(base(), ['a.dsgn', 'b.dsgn']);
    const hid = withHiddenPath(m, 'a.dsgn');
    expect(hid.context.canvas.order).toEqual(['b.dsgn']);
  });

  it('refuses to order a hidden path back into a slot', () => {
    const hid = withHiddenPath(base(), 'a.dsgn');
    expect(withCanvasOrder(hid, ['a.dsgn', 'b.dsgn']).context.canvas.order).toEqual(['b.dsgn']);
  });

  it('dedupes an order and returns the same manifest when it is unchanged', () => {
    const m = withCanvasOrder(base(), ['a.dsgn', 'a.dsgn', 'b.dsgn']);
    expect(m.context.canvas.order).toEqual(['a.dsgn', 'b.dsgn']);
    expect(withCanvasOrder(m, ['a.dsgn', 'b.dsgn'])).toBe(m);
  });

  /**
   * `withSessionContext` runs on EVERY turn. It used to rebuild `context` from
   * two fields, which would wipe the arrangement once per message.
   */
  it('survives the per-turn context write', () => {
    const arranged = withHiddenPath(withCanvasOrder(base(), ['b.dsgn']), 'a.dsgn');
    const after = withSessionContext(arranged, { project: 'other', path: 'c.dsgn' });
    expect(after.context.canvas).toEqual({ hidden: ['a.dsgn'], order: ['b.dsgn'] });
  });

  it('survives a project switch and a pin', () => {
    const arranged = withHiddenPath(base(), 'a.dsgn');
    expect(withActiveProject(arranged, 'other').context.canvas.hidden).toEqual(['a.dsgn']);
    expect(withPinnedPath(arranged, 'b.dsgn').context.canvas.hidden).toEqual(['a.dsgn']);
    expect(withoutPinnedPath(withPinnedPath(arranged, 'b.dsgn'), 'b.dsgn').context.canvas.hidden).toEqual([
      'a.dsgn',
    ]);
  });
});

/**
 * SCOPE — where a conversation lives.
 *
 * The field that stops one session being the whole app. Its contract is small
 * and every clause below is load-bearing, because the alternative to each is a
 * conversation that silently opens in the wrong place.
 */
describe('scope', () => {
  it('spells a project scope with a prefix, and reads it back', () => {
    expect(projectScope('q3-deck')).toBe('project:q3-deck');
    expect(scopeProjectSlug('project:q3-deck')).toBe('q3-deck');
  });

  it('does not confuse a section with a project of the same name', () => {
    // The reason for the prefix at all: a deck legitimately called `brand`
    // would otherwise be homed to the Brand SCREEN, and only that one user
    // would ever see it.
    expect(scopeProjectSlug('brand')).toBeNull();
    expect(scopeProjectSlug('assets')).toBeNull();
    expect(scopeProjectSlug('')).toBeNull();
    expect(projectScope('brand')).toBe('project:brand');
    expect(scopeProjectSlug(projectScope('brand'))).toBe('brand');
  });

  it('is empty for a scope that names nothing', () => {
    expect(projectScope('')).toBe('');
    expect(projectScope('   ')).toBe('');
    expect(scopeProjectSlug('project:')).toBeNull();
  });

  it('DERIVES a home for every session written before the field existed', () => {
    // The whole migration story: nothing is backfilled because
    // `primaryProjectSlug` already says where these conversations lived.
    const legacy = parseSessionManifest(
      { v: 2, id: 's-old', primaryProjectSlug: 'reel' },
      { id: 's-old', primaryProjectSlug: 'reel' },
    );
    expect(legacy.scope).toBe('project:reel');
  });

  it('leaves a session with no project unscoped rather than guessing', () => {
    const connector = parseSessionManifest({ v: 2, id: 's-c' }, { id: 's-c', primaryProjectSlug: '' });
    expect(connector.scope).toBe('');
  });

  it('prefers what was stored over what the caller supposes', () => {
    // Written once, at the start. A later turn taken somewhere else passes its
    // own scope, and must NOT move the conversation's home.
    const m = parseSessionManifest(
      { v: 2, id: 's-1', scope: 'brand', primaryProjectSlug: 'reel' },
      { id: 's-1', primaryProjectSlug: 'reel', scope: 'project:other' },
    );
    expect(m.scope).toBe('brand');
  });

  it('takes the caller’s scope only when nothing is stored', () => {
    const m = parseSessionManifest(
      { v: 2, id: 's-1' },
      { id: 's-1', primaryProjectSlug: 'reel', scope: 'brand' },
    );
    expect(m.scope).toBe('brand');
  });

  /**
   * The divergence is the POINT — see the field's docblock. Output follows you;
   * the home does not.
   */
  it('does not move when the active project does', () => {
    const m = parseSessionManifest(
      { v: 2, id: 's-1', scope: 'project:reel', primaryProjectSlug: 'reel' },
      { id: 's-1', primaryProjectSlug: 'reel' },
    );
    const moved = withActiveProject(m, 'other');
    expect(moved.primaryProjectSlug).toBe('other');
    expect(moved.scope).toBe('project:reel');
    expect(moved.context.projects).toContain('reel');
  });

  it('round-trips through a write and re-read', () => {
    const first = parseSessionManifest({}, { id: 's-1', primaryProjectSlug: '', scope: 'assets' });
    const reread = parseSessionManifest(JSON.parse(JSON.stringify(first)), {
      id: 's-1',
      primaryProjectSlug: '',
    });
    expect(reread.scope).toBe('assets');
  });
});
