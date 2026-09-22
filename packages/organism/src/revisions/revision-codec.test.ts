import { describe, expect, it } from 'vitest';
import {
  appendRevision,
  compactRevisionsLog,
  indexRevisions,
  latestVersion,
  newRevisionId,
  parseRevisionsJsonl,
  revisionsForCard,
  revisionsForPath,
  revisionsPath,
  revisionsWithin,
} from './revision-codec';
import { REVISIONS_LOG_CAP, REVISIONS_PROSE_KEEP, type Revision } from './revision-types';

function rev(over: Partial<Revision> = {}): Revision {
  return {
    id: 'r_1',
    path: 'projects/catalog/cover.dsgn',
    version: 1,
    op: 'changed',
    by: 'agent',
    at_iso: '2026-09-04T10:00:00.000Z',
    ...over,
  };
}

/** An in-memory `RevisionsContext`, the same fixture shape the cards use. */
function memory(seed: Record<string, string> = {}) {
  const files = { ...seed };
  return {
    files,
    ctx: {
      async readFile(path: string) {
        if (!(path in files)) throw new Error(`ENOENT ${path}`);
        return files[path];
      },
      async writeFile(path: string, content: string) {
        files[path] = content;
      },
    },
  };
}

describe('revisionsPath', () => {
  it('is bare and relative for a tool context, absolute under a root', () => {
    expect(revisionsPath('')).toBe('meta/revisions.jsonl');
    expect(revisionsPath('D:/ws/alto/')).toBe('D:/ws/alto/meta/revisions.jsonl');
  });
});

describe('parseRevisionsJsonl', () => {
  it('skips a malformed line rather than making every version unreadable', () => {
    const text = [JSON.stringify(rev({ id: 'a' })), '{ not json', '', JSON.stringify(rev({ id: 'b' }))].join('\n');
    expect(parseRevisionsJsonl(text).map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('drops a line missing an id, a path, a version or a known op', () => {
    const { id: _i, ...noId } = rev();
    const { path: _p, ...noPath } = rev();
    expect(parseRevisionsJsonl(JSON.stringify(noId))).toEqual([]);
    expect(parseRevisionsJsonl(JSON.stringify(noPath))).toEqual([]);
    expect(parseRevisionsJsonl(JSON.stringify(rev({ version: 0 })))).toEqual([]);
    expect(parseRevisionsJsonl(JSON.stringify({ ...rev(), op: 'invented' }))).toEqual([]);
  });

  it('keeps the optional fields it recognises', () => {
    const r = rev({ cardId: 'c_1', at: 'page-3/headline', summary: 'did it', agent: 'lane_7', sha256: 'ab', bytes: 12 });
    expect(parseRevisionsJsonl(JSON.stringify(r))[0]).toMatchObject({
      cardId: 'c_1',
      at: 'page-3/headline',
      summary: 'did it',
      agent: 'lane_7',
      sha256: 'ab',
      bytes: 12,
    });
  });

  it('does not collapse — a revision is an event, so every line stands', () => {
    const lines = [rev({ id: 'a', version: 1 }), rev({ id: 'b', version: 2 })].map((r) => JSON.stringify(r));
    expect(parseRevisionsJsonl(lines.join('\n'))).toHaveLength(2);
  });
});

describe('the three questions', () => {
  const revs = [
    rev({ id: '1', path: 'projects/catalog/cover.dsgn', version: 1, cardId: 'c_1' }),
    rev({ id: '2', path: 'projects/catalog/alt.dsgn', version: 1, op: 'created', cardId: 'c_1' }),
    rev({ id: '3', path: 'projects/catalog/cover.dsgn', version: 2 }),
    rev({ id: '4', path: 'assets/logo.svg', version: 1, cardId: 'c_2' }),
  ];

  it('answers what a card produced', () => {
    expect(revisionsForCard(revs, 'c_1').map((r) => r.id)).toEqual(['1', '2']);
    expect(revisionsForCard(revs, 'nope')).toEqual([]);
  });

  it('answers the history of a file', () => {
    expect(revisionsForPath(revs, 'projects/catalog/cover.dsgn').map((r) => r.id)).toEqual(['1', '3']);
  });

  it('answers a folder, segment-aware', () => {
    expect(revisionsWithin(revs, 'projects/catalog').map((r) => r.id)).toEqual(['1', '2', '3']);
    expect(revisionsWithin(revs, 'projects/cat')).toEqual([]);
  });

  it('is a MAX, not a count — a gap is legible, a duplicate is corrupt', () => {
    const gappy = [rev({ id: 'a', version: 1 }), rev({ id: 'b', version: 3 })];
    expect(latestVersion(gappy, 'projects/catalog/cover.dsgn')).toBe(3);
    expect(latestVersion(revs, 'nothing/here')).toBe(0);
  });
});

describe('revisionsForPath follows a rename backwards', () => {
  const revs = [
    rev({ id: '1', path: 'a.dsgn', version: 1, op: 'created' }),
    rev({ id: '2', path: 'a.dsgn', version: 2 }),
    rev({ id: '3', path: 'b.dsgn', version: 3, op: 'renamed', from: 'a.dsgn' }),
    rev({ id: '4', path: 'b.dsgn', version: 4 }),
  ];

  it('returns the whole chain under the new name', () => {
    expect(revisionsForPath(revs, 'b.dsgn').map((r) => r.id)).toEqual(['1', '2', '3', '4']);
  });

  it('so a move does not reset the file to v1', () => {
    expect(latestVersion(revs, 'b.dsgn')).toBe(4);
  });

  it('survives a cyclic `from` written by a broken caller', () => {
    const cyclic = [
      rev({ id: '1', path: 'x', version: 1, op: 'renamed', from: 'y' }),
      rev({ id: '2', path: 'y', version: 2, op: 'renamed', from: 'x' }),
    ];
    expect(() => revisionsForPath(cyclic, 'x')).not.toThrow();
  });
});

describe('indexRevisions', () => {
  it('is one pass for a surface that asks about many objects', () => {
    const revs = [
      rev({ id: '1', path: 'a.dsgn', version: 1, cardId: 'c_1' }),
      rev({ id: '2', path: 'a.dsgn', version: 2, cardId: 'c_1' }),
      rev({ id: '3', path: 'b.dsgn', version: 1 }),
    ];
    const ix = indexRevisions(revs);
    expect(ix.byPath.get('a.dsgn')).toHaveLength(2);
    expect(ix.byCard.get('c_1')).toHaveLength(2);
    expect(ix.version.get('a.dsgn')).toBe(2);
    expect(ix.version.get('b.dsgn')).toBe(1);
  });
});

describe('appendRevision', () => {
  it('numbers a file from one and counts up', async () => {
    const { ctx, files } = memory();
    const a = await appendRevision(ctx, '', { path: 'a.dsgn', op: 'created', by: 'agent' });
    const b = await appendRevision(ctx, '', { path: 'a.dsgn', op: 'changed', by: 'agent' });
    expect([a.version, b.version]).toEqual([1, 2]);
    expect(files['meta/revisions.jsonl'].trim().split('\n')).toHaveLength(2);
  });

  it('sets id and at_iso itself — a version a caller could choose is one it could re-use', async () => {
    const { ctx } = memory();
    const r = await appendRevision(
      ctx,
      '',
      { path: 'a.dsgn', op: 'changed', by: 'agent' } as never,
      new Date('2026-09-04T14:21:07.412Z'),
    );
    expect(r.id).toMatch(/^r_/);
    expect(r.at_iso).toBe('2026-09-04T14:21:07.412Z');
  });

  it('downgrades a "created" claim the log can disprove', async () => {
    const { ctx } = memory();
    await appendRevision(ctx, '', { path: 'a.dsgn', op: 'changed', by: 'agent' });
    const second = await appendRevision(ctx, '', { path: 'a.dsgn', op: 'created', by: 'agent' });
    expect(second.op).toBe('changed');
    expect(second.version).toBe(2);
  });

  it('keeps "created" when the log really has not seen the path', async () => {
    const { ctx } = memory();
    const r = await appendRevision(ctx, '', { path: 'fresh.dsgn', op: 'created', by: 'agent' });
    expect(r.op).toBe('created');
    expect(r.version).toBe(1);
  });

  it('continues the ordinal through a rename rather than restarting it', async () => {
    const { ctx } = memory();
    await appendRevision(ctx, '', { path: 'a.dsgn', op: 'created', by: 'agent' });
    await appendRevision(ctx, '', { path: 'a.dsgn', op: 'changed', by: 'agent' });
    const moved = await appendRevision(ctx, '', { path: 'b.dsgn', op: 'renamed', from: 'a.dsgn', by: 'agent' });
    expect(moved.version).toBe(3);
    const after = await appendRevision(ctx, '', { path: 'b.dsgn', op: 'changed', by: 'agent' });
    expect(after.version).toBe(4);
  });

  it('reads an empty history when no workspace has ever had a revision', async () => {
    const { ctx } = memory();
    const r = await appendRevision(ctx, '', { path: 'a.dsgn', op: 'changed', by: 'agent' });
    expect(r.version).toBe(1);
  });
});

describe('compactRevisionsLog', () => {
  it('stubs prose past the keep depth and keeps every ordinal', async () => {
    const { ctx } = memory();
    const lines: string[] = [];
    for (let i = 1; i <= REVISIONS_PROSE_KEEP + 5; i += 1) {
      lines.push(JSON.stringify(rev({ id: `r${i}`, path: 'a.dsgn', version: i, summary: `did ${i}` })));
    }
    const out = await compactRevisionsLog(ctx, '', lines);
    const revs = parseRevisionsJsonl(out.join('\n'));
    expect(revs).toHaveLength(REVISIONS_PROSE_KEEP + 5);
    // Every ordinal survives.
    expect(revs.map((r) => r.version)).toEqual(lines.map((_, i) => i + 1));
    // The oldest five lost their sentence; the newest twenty kept theirs.
    expect(revs.slice(0, 5).every((r) => r.summary === undefined)).toBe(true);
    expect(revs.slice(-REVISIONS_PROSE_KEEP).every((r) => !!r.summary)).toBe(true);
  });

  it('rolls overflow to a numbered file and keeps the tail live', async () => {
    const { ctx, files } = memory();
    const lines: string[] = [];
    for (let i = 1; i <= REVISIONS_LOG_CAP + 3; i += 1) {
      lines.push(JSON.stringify(rev({ id: `r${i}`, path: `f${i}.dsgn`, version: 1 })));
    }
    const out = await compactRevisionsLog(ctx, '', lines, new Date('2026-09-04T14:21:07.412Z'));
    expect(out).toHaveLength(REVISIONS_LOG_CAP);
    const rolledName = Object.keys(files).find((f) => /^meta\/revisions\.[a-z0-9]+\.jsonl$/.test(f));
    expect(rolledName).toBeTruthy();
    expect(parseRevisionsJsonl(files[rolledName as string])).toHaveLength(3);
  });

  it('keeps overflow live rather than losing it when the roll cannot be written', async () => {
    const ctx = {
      async readFile() {
        throw new Error('ENOENT');
      },
      async writeFile() {
        throw new Error('disk full');
      },
    };
    const lines: string[] = [];
    for (let i = 1; i <= REVISIONS_LOG_CAP + 3; i += 1) {
      lines.push(JSON.stringify(rev({ id: `r${i}`, path: `f${i}.dsgn`, version: 1 })));
    }
    const out = await compactRevisionsLog(ctx, '', lines);
    expect(out).toHaveLength(REVISIONS_LOG_CAP + 3);
  });
});

describe('newRevisionId', () => {
  it('is time-ordered, so a raw log reads chronologically', () => {
    const early = newRevisionId(new Date('2026-01-02T03:04:05Z'));
    const late = newRevisionId(new Date('2026-09-04T03:04:05Z'));
    expect(early < late).toBe(true);
    expect(early.startsWith('r_')).toBe(true);
  });
});
