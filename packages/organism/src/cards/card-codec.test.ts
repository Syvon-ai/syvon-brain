import { describe, it, expect } from 'vitest';
import {
  appendCard,
  cardsPath,
  compactCardsLog,
  effectiveCards,
  filterCards,
  newCardId,
  parseCardsJsonl,
  readCards,
  sameTarget,
  sortForQueue,
  targetWithin,
  toCardTarget,
} from './card-codec';
import type { Card } from './card-types';
import { CARDS_LOG_CAP, CARD_EVIDENCE_CAP, cardActError } from './card-types';

function card(over: Partial<Card> = {}): Card {
  return {
    id: 'c_1',
    target: 'projects/catalog-layout',
    kind: 'correction',
    instruction: 'Tighten the grid',
    urgency: 3,
    status: 'open',
    at_iso: '2026-09-04T10:00:00.000Z',
    by: 'person',
    ...over,
  };
}

/** An in-memory `CardsContext`. */
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

describe('cardsPath', () => {
  it('is bare and relative for a tool context, absolute under a root', () => {
    expect(cardsPath('')).toBe('meta/cards.jsonl');
    expect(cardsPath('D:/ws/altomare')).toBe('D:/ws/altomare/meta/cards.jsonl');
    expect(cardsPath('D:/ws/altomare/')).toBe('D:/ws/altomare/meta/cards.jsonl');
  });
});

describe('toCardTarget', () => {
  it('makes an absolute path relative to the workspace, keeping case', () => {
    expect(toCardTarget('D:\\ws\\Alto', 'D:\\ws\\Alto\\projects\\Catalog Layout')).toBe(
      'projects/Catalog Layout',
    );
  });

  it('matches the root case-insensitively, because Windows does', () => {
    expect(toCardTarget('D:/ws/Alto', 'd:/WS/alto/projects/x')).toBe('projects/x');
  });

  it('passes an already-relative path through', () => {
    expect(toCardTarget('D:/ws/Alto', 'projects/x/')).toBe('projects/x');
  });
});

describe('targetWithin', () => {
  it('matches the object itself and anything under it', () => {
    expect(targetWithin('projects/cat', 'projects/cat')).toBe(true);
    expect(targetWithin('projects/cat/cover.comp', 'projects/cat')).toBe(true);
    expect(targetWithin('projects/cat', '')).toBe(true);
  });

  it('is segment-aware — a name prefix is not containment', () => {
    expect(targetWithin('projects/catalog-2', 'projects/catalog')).toBe(false);
  });

  it('agrees with sameTarget on separators and case', () => {
    expect(sameTarget('projects\\Cat', 'projects/cat/')).toBe(true);
  });
});

describe('parseCardsJsonl', () => {
  it('skips a malformed line rather than failing the whole queue', () => {
    const text = [
      JSON.stringify(card({ id: 'a' })),
      '{ this is not json',
      '',
      JSON.stringify(card({ id: 'b' })),
    ].join('\n');
    expect(parseCardsJsonl(text).map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('drops a line missing a required field', () => {
    const bad = JSON.stringify({ ...card(), urgency: 9 });
    expect(parseCardsJsonl(bad)).toEqual([]);
  });

  it('keeps the optional fields it recognises', () => {
    const c = card({ at: 'video/shot-2', rating: 2, agent: 'lane_7', resolution: 'done it' });
    expect(parseCardsJsonl(JSON.stringify(c))[0]).toMatchObject({
      at: 'video/shot-2',
      rating: 2,
      agent: 'lane_7',
      resolution: 'done it',
    });
  });
});

describe('effectiveCards', () => {
  it('takes the latest line per id, in first-seen order', () => {
    const lines = [
      card({ id: 'a', status: 'open' }),
      card({ id: 'b', status: 'open' }),
      card({ id: 'a', status: 'done', resolution: 'reworked' }),
    ];
    const out = effectiveCards(lines);
    expect(out.map((c) => c.id)).toEqual(['a', 'b']);
    expect(out[0].status).toBe('done');
    expect(out[0].resolution).toBe('reworked');
  });
});

describe('sortForQueue', () => {
  it('puts the most urgent first', () => {
    const out = sortForQueue([card({ id: 'lo', urgency: 1 }), card({ id: 'hi', urgency: 5 })]);
    expect(out.map((c) => c.id)).toEqual(['hi', 'lo']);
  });

  it('breaks a tie with the worse rating — it needs the attention more', () => {
    const out = sortForQueue([
      card({ id: 'good', urgency: 3, rating: 4 }),
      card({ id: 'bad', urgency: 3, rating: 2 }),
    ]);
    expect(out.map((c) => c.id)).toEqual(['bad', 'good']);
  });

  it('sorts an unrated card as a 3 — neither jumping the queue nor sinking', () => {
    const out = sortForQueue([
      card({ id: 'two', urgency: 3, rating: 2 }),
      card({ id: 'none', urgency: 3 }),
      card({ id: 'four', urgency: 3, rating: 4 }),
    ]);
    expect(out.map((c) => c.id)).toEqual(['two', 'none', 'four']);
  });
});

describe('filterCards', () => {
  const all = [
    card({ id: 'proj', target: 'projects/cat', status: 'open' }),
    card({ id: 'file', target: 'projects/cat/cover.comp', status: 'queued', agent: 'lane_7' }),
    card({ id: 'other', target: 'projects/deck', status: 'queued', agent: 'lane_9' }),
  ];

  it('returns an object AND everything under it', () => {
    expect(filterCards(all, { target: 'projects/cat' }).map((c) => c.id)).toEqual(['proj', 'file']);
  });

  it('answers "my queue" from status + agent', () => {
    expect(filterCards(all, { status: 'queued', agent: 'lane_7' }).map((c) => c.id)).toEqual(['file']);
  });
});

describe('readCards / appendCard', () => {
  it('reads an empty queue when no workspace has ever had a card', async () => {
    const { ctx } = memory();
    await expect(readCards(ctx, 'D:/ws/alto')).resolves.toEqual([]);
  });

  it('round-trips an append through a read, latest line winning', async () => {
    const { ctx, files } = memory();
    await appendCard(ctx, '', card({ id: 'a', status: 'open' }));
    await appendCard(ctx, '', card({ id: 'a', status: 'done', resolution: 'reworked' }));

    // Two lines on disk — the log is append-only, nothing was rewritten.
    expect(files['meta/cards.jsonl'].trim().split('\n')).toHaveLength(2);

    const out = await readCards(ctx, '');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 'a', status: 'done', resolution: 'reworked' });
  });

  it('compacts once the log passes its cap, losing nothing reachable', async () => {
    const lines: string[] = [];
    for (let i = 0; i < CARDS_LOG_CAP; i++) {
      lines.push(JSON.stringify(card({ id: 'churn', status: 'working', at_iso: `2026-09-04T10:00:${String(i % 60).padStart(2, '0')}.000Z` })));
    }
    lines.push(JSON.stringify(card({ id: 'keep', status: 'open' })));
    const { ctx, files } = memory({ 'meta/cards.jsonl': `${lines.join('\n')}\n` });

    await appendCard(ctx, '', card({ id: 'churn', status: 'done', resolution: 'finally' }));

    const after = files['meta/cards.jsonl'].trim().split('\n');
    expect(after).toHaveLength(2);
    const out = await readCards(ctx, '');
    expect(out.map((c) => c.id).sort()).toEqual(['churn', 'keep']);
    expect(out.find((c) => c.id === 'churn')?.resolution).toBe('finally');
  });
});

describe('compactCardsLog', () => {
  it('collapses to one line per card', () => {
    const lines = [
      JSON.stringify(card({ id: 'a', status: 'open' })),
      JSON.stringify(card({ id: 'a', status: 'working' })),
      JSON.stringify(card({ id: 'b', status: 'open' })),
    ];
    expect(compactCardsLog(lines)).toHaveLength(2);
  });
});

describe('newCardId', () => {
  it('is time-ordered, so a raw log reads chronologically', () => {
    const early = newCardId(new Date('2026-01-02T03:04:05Z'));
    const late = newCardId(new Date('2026-09-04T03:04:05Z'));
    expect(early < late).toBe(true);
    expect(early.startsWith('c_')).toBe(true);
  });
});

describe('a card on the workspace itself', () => {
  it('survives a round trip — an empty target is the workspace, not a missing field', () => {
    const root = JSON.stringify(card({ id: 'root', target: '' }));
    expect(parseCardsJsonl(root).map((c) => c.id)).toEqual(['root']);
  });

  it('still refuses a line with no target at all', () => {
    const { target: _drop, ...rest } = card();
    expect(parseCardsJsonl(JSON.stringify(rest))).toEqual([]);
  });

  it('contains every card, which is what a card on the workspace means', () => {
    const all = [card({ id: 'root', target: '' }), card({ id: 'deep', target: 'projects/x/a.dsgn' })];
    expect(filterCards(all, { target: '' }).map((c) => c.id)).toEqual(['root', 'deep']);
  });
});

describe('the act: a review is about a node, a ticket is addressed to a hand', () => {
  it('reads an absent act as a review — every line written before the field was one', () => {
    const [c] = parseCardsJsonl(JSON.stringify(card()));
    expect(c?.act).toBeUndefined();
    expect(cardActError({ ...c!, act: undefined })).toBeNull();
  });

  it('round-trips a ticket', () => {
    const [c] = parseCardsJsonl(JSON.stringify({ ...card(), act: 'ticket' }));
    expect(c?.act).toBe('ticket');
  });

  it('drops an act it does not understand rather than carrying it unvalidated', () => {
    const [c] = parseCardsJsonl(JSON.stringify({ ...card(), act: 'wish' }));
    expect(c?.act).toBeUndefined();
  });

  it('refuses a ticket with no agent — that is a wish, not a ticket', () => {
    expect(cardActError({ act: 'ticket', target: 'a.dsgn' })).toMatch(/addressed to an agent/);
    expect(cardActError({ act: 'ticket', target: 'a.dsgn', agent: 'lane-1' })).toBeNull();
  });

  it('refuses a rating on a ticket — nothing has been made yet to judge', () => {
    expect(cardActError({ act: 'ticket', target: 'a.dsgn', agent: 'lane-1', rating: 4 })).toMatch(/no rating/);
  });

  it('refuses a review with no target field at all', () => {
    expect(cardActError({ act: 'review' } as never)).toMatch(/needs a target/);
  });

  it('accepts a review on the workspace itself — an empty target is a target', () => {
    expect(cardActError({ act: 'review', target: '' })).toBeNull();
  });

  it('lets a review carry a rating and no agent, which is the ordinary case', () => {
    expect(cardActError({ act: 'review', target: 'a.dsgn', rating: 5 })).toBeNull();
  });
  it('round-trips the evidence block — the picture, the files, the nodes and the tokens', () => {
    const written = card({
      evidence: {
        origin: 'D:/syvon/Dev/beta-v3',
        route: '/flow',
        shot: 'meta/cards/c_1.png',
        files: ['apps/studio/src/features/flow/FlowApp.tsx:86'],
        nodes: ['FlowField', 'FlowApp'],
        tokens: ['--color-secondary'],
      },
    });
    const [c] = parseCardsJsonl(JSON.stringify(written));
    expect(c?.evidence).toEqual(written.evidence);
  });

  it('drops evidence fields that are not the shape they claim, and keeps the card', () => {
    const [c] = parseCardsJsonl(
      JSON.stringify({ ...card(), evidence: { shot: 7, files: ['a.tsx:1', 3, ''], nodes: 'Field' } }),
    );
    expect(c?.instruction).toBe('Tighten the grid');
    expect(c?.evidence).toEqual({ files: ['a.tsx:1'] });
  });

  it('reads no evidence at all as no evidence, not as an empty block', () => {
    const [c] = parseCardsJsonl(JSON.stringify({ ...card(), evidence: {} }));
    expect(c?.evidence).toBeUndefined();
  });

  it('caps each evidence list — a pick can name a long chain, none of it about anything', () => {
    const many = Array.from({ length: CARD_EVIDENCE_CAP + 10 }, (_, i) => `Node${i}`);
    const [c] = parseCardsJsonl(JSON.stringify({ ...card(), evidence: { nodes: many } }));
    expect(c?.evidence?.nodes).toHaveLength(CARD_EVIDENCE_CAP);
  });

  it('round-trips the author — `by` says which kind of hand, this says whose', () => {
    const written = card({ author: { id: 'u_1', name: 'Renaud', email: 'r@example.com' } });
    const [c] = parseCardsJsonl(JSON.stringify(written));
    expect(c?.author).toEqual(written.author);
    expect(c?.by).toBe('person');
  });

  it('keeps the evidence and the author through a compaction', () => {
    const first = card({ evidence: { origin: 'D:/ws', shot: 'meta/cards/c_1.png' }, author: { name: 'Renaud' } });
    const later = { ...first, status: 'queued' as const, at_iso: '2026-09-04T11:00:00.000Z' };
    const [c] = parseCardsJsonl(compactCardsLog([JSON.stringify(first), JSON.stringify(later)]).join('\n'));
    expect(c?.status).toBe('queued');
    expect(c?.evidence?.shot).toBe('meta/cards/c_1.png');
    expect(c?.author?.name).toBe('Renaud');
  });
});

describe('the checkout and the blockers', () => {
  it('round-trips the checkout beside the origin — the workspace it was filed from is not where the source lives', () => {
    const written = card({
      evidence: {
        origin: 'D:/ws/altomare',
        checkout: 'D:/syvon/Dev/beta-v3',
        files: ['packages/studio-editor/src/react-host.ts:212'],
      },
    });
    const [c] = parseCardsJsonl(JSON.stringify(written));
    expect(c?.evidence).toEqual(written.evidence);
  });

  it('drops a checkout that is not a string, and keeps the origin', () => {
    const [c] = parseCardsJsonl(
      JSON.stringify({ ...card(), evidence: { origin: 'D:/ws/altomare', checkout: 7 } }),
    );
    expect(c?.evidence).toEqual({ origin: 'D:/ws/altomare' });
  });

  it('round-trips after — the ids this card waits on', () => {
    const [c] = parseCardsJsonl(JSON.stringify(card({ after: ['c_a', 'c_b'] })));
    expect(c?.after).toEqual(['c_a', 'c_b']);
  });

  it('drops an after that is not an array, and keeps the card', () => {
    const [c] = parseCardsJsonl(JSON.stringify({ ...card(), after: 'c_a' }));
    expect(c?.instruction).toBe('Tighten the grid');
    expect(c?.after).toBeUndefined();
  });

  it('drops the entries of after that are not strings', () => {
    const [c] = parseCardsJsonl(JSON.stringify({ ...card(), after: ['c_a', 7, '', null, 'c_b'] }));
    expect(c?.after).toEqual(['c_a', 'c_b']);
  });

  it('caps after at the evidence cap — the same judgement about the same kind of list', () => {
    const many = Array.from({ length: CARD_EVIDENCE_CAP + 10 }, (_, i) => `c_${i}`);
    const [c] = parseCardsJsonl(JSON.stringify({ ...card(), after: many }));
    expect(c?.after).toHaveLength(CARD_EVIDENCE_CAP);
  });

  it('keeps the checkout and the blockers through a compaction', () => {
    const first = card({
      after: ['c_a'],
      evidence: { origin: 'D:/ws/altomare', checkout: 'D:/syvon/Dev/beta-v3' },
    });
    const later = { ...first, status: 'queued' as const, at_iso: '2026-09-04T11:00:00.000Z' };
    const [c] = parseCardsJsonl(compactCardsLog([JSON.stringify(first), JSON.stringify(later)]).join('\n'));
    expect(c?.status).toBe('queued');
    expect(c?.after).toEqual(['c_a']);
    expect(c?.evidence?.checkout).toBe('D:/syvon/Dev/beta-v3');
  });
});
