import { describe, expect, it } from 'vitest';
import { conditionalLedger, LedgerConflict, type ConditionalStorage } from './conditional-ledger';
import { appendCard, readCards } from './card-codec';
import type { Card } from './card-types';

type Store = ConditionalStorage & {
  files: Map<string, { body: string; etag: string }>;
  /** Runs once, inside the next put, before it checks its condition — a racer. */
  beforePut?: () => Promise<void>;
};

/** An in-memory store with R2's compare-and-swap, and a hook to race it. */
function store(): Store {
  const files = new Map<string, { body: string; etag: string }>();
  let n = 0;
  const s: Store = {
    files,
    read: async (p) => {
      const f = files.get(p);
      return f ? { body: f.body, etag: f.etag } : { body: null, etag: null };
    },
    put: async (p, body, expected) => {
      const hook = s.beforePut;
      s.beforePut = undefined;
      if (hook) await hook();
      const cur = files.get(p);
      if (expected === null ? cur !== undefined : cur?.etag !== expected) return false;
      files.set(p, { body, etag: `e${++n}` });
      return true;
    },
  };
  return s;
}

const card = (id: string): Card => ({
  id,
  target: 'a.dsgn',
  kind: 'change',
  instruction: id,
  urgency: 3,
  status: 'open',
  at_iso: '2026-09-22T00:00:00.000Z',
  by: 'person',
});

const ids = async (s: Store) => (await readCards(conditionalLedger(s), '')).map((c) => c.id).sort();

describe('conditionalLedger', () => {
  it('keeps both lines when two appends race', async () => {
    const s = store();
    const a = conditionalLedger(s);
    const b = conditionalLedger(s);
    await appendCard(a, '', card('c_1'));
    /* B's write lands between A's read and A's put. */
    s.beforePut = () => appendCard(b, '', card('c_2'));
    await appendCard(a, '', card('c_3'));
    expect(await ids(s)).toEqual(['c_1', 'c_2', 'c_3']);
  });

  it('refuses a whole-file write based on a stale read', async () => {
    const s = store();
    const a = conditionalLedger(s);
    await s.put('meta/tasks.jsonl', 'x\n', null);
    await a.readFile('meta/tasks.jsonl');
    await s.put('meta/tasks.jsonl', 'x\ny\n', s.files.get('meta/tasks.jsonl')!.etag);
    await expect(a.writeFile('meta/tasks.jsonl', 'x\n')).rejects.toBeInstanceOf(LedgerConflict);
    expect(s.files.get('meta/tasks.jsonl')!.body).toBe('x\ny\n');
  });

  it('two first writes on a legacy ledger split once and keep every line', async () => {
    const s = store();
    await s.put('meta/cards.jsonl', `${JSON.stringify(card('c_old'))}\n`, null);
    const a = conditionalLedger(s);
    const b = conditionalLedger(s);
    s.beforePut = () => appendCard(b, '', card('c_b'));
    await appendCard(a, '', card('c_a'));
    expect(await ids(s)).toEqual(['c_a', 'c_b', 'c_old']);
  });
});
