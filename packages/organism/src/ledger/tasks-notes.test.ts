import { describe, expect, it } from 'vitest';
import type { Card } from '../cards/card-types';
import type { CardsContext } from '../cards/card-codec';
import {
  TASKS_FILE,
  NOTES_FILE,
  LEGACY_LEDGER_FILE,
  appendNote,
  migrateLedger,
  newNoteId,
  notesFor,
  parseNoteLine,
  readNotes,
  readTasks,
  splitLegacyLedger,
  type Note,
} from './tasks-notes';

const card = (over: Partial<Card> & Pick<Card, 'id'>): Card => ({
  target: 'projects/launch/deck.comp',
  kind: 'change',
  instruction: over.id,
  urgency: 3,
  status: 'open',
  at_iso: '2026-09-22T10:00:00.000Z',
  by: 'person',
  ...over,
});
const jsonl = (rows: object[]) => `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`;

function memory(files: Record<string, string> = {}, append = true) {
  const store = new Map(Object.entries(files));
  const ctx: CardsContext = {
    readFile: async (p) => {
      const v = store.get(p);
      if (v === undefined) throw new Error('missing');
      return v;
    },
    writeFile: async (p, c) => { store.set(p, c); },
    ...(append ? { appendFile: async (p: string, c: string) => { store.set(p, (store.get(p) ?? '') + c); } } : {}),
  };
  return { ctx, store };
}

const legacy = jsonl([
  card({ id: 'c_1', status: 'open' }),
  card({ id: 'c_1', status: 'working', agent: 'lane-1', by: 'agent' }),
  card({ id: 'c_2', kind: 'feedback', target: 'projects/launch', instruction: 'Hard cuts only.', status: 'open', rating: 4 }),
  card({ id: 'c_3', kind: 'feedback', instruction: 'gone', status: 'open' }),
  card({ id: 'c_3', kind: 'feedback', instruction: 'gone', status: 'dropped' }),
  card({ id: 'c_4', status: 'dropped' }),
]);

describe('splitLegacyLedger', () => {
  it('keeps every line of task history and moves note-cards to notes by their current state', () => {
    const { taskLines, notes } = splitLegacyLedger(legacy);
    expect(taskLines.map((l) => JSON.parse(l).id)).toEqual(['c_1', 'c_1', 'c_4']);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ id: 'c_2', target: 'projects/launch', kind: 'feedback', text: 'Hard cuts only.',
      state: 'current', by: 'person', rating: 4 });
  });
});

describe('readTasks / readNotes before migration', () => {
  it('read the legacy log and never show a note as a task or a task as a note', async () => {
    const { ctx } = memory({ [LEGACY_LEDGER_FILE]: legacy });
    expect((await readTasks(ctx, '')).map((t) => [t.id, t.status])).toEqual([['c_1', 'working']]);
    expect((await readNotes(ctx, '')).map((n) => n.text)).toEqual(['Hard cuts only.']);
  });

  it('an empty workspace has neither', async () => {
    const { ctx } = memory();
    expect(await readTasks(ctx, '')).toEqual([]);
    expect(await readNotes(ctx, '')).toEqual([]);
  });
});

describe('migrateLedger', () => {
  it('writes tasks and notes, keeps the legacy log untouched, and is idempotent', async () => {
    const { ctx, store } = memory({ [LEGACY_LEDGER_FILE]: legacy });
    expect(await migrateLedger(ctx, '')).toEqual({ migrated: true, tasks: 2, notes: 1 });
    expect(store.get(LEGACY_LEDGER_FILE)).toBe(legacy);
    // The mark, then every task line with its history.
    expect(store.get(TASKS_FILE)!.trim().split('\n')).toHaveLength(4);
    expect(await migrateLedger(ctx, '')).toEqual({ migrated: false, reason: 'already' });
    expect((await readTasks(ctx, '')).map((t) => t.id)).toEqual(['c_1']);
    expect((await readNotes(ctx, '')).map((n) => n.id)).toEqual(['c_2']);
  });

  it('after migration, still hears the legacy log — but only what was written after the mark', async () => {
    const { ctx, store } = memory({ [LEGACY_LEDGER_FILE]: legacy });
    await migrateLedger(ctx, '');
    store.set(LEGACY_LEDGER_FILE, legacy + jsonl([
      card({ id: 'c_late', at_iso: '2026-09-22T11:00:00.000Z' }),
      card({ id: 'c_stale', at_iso: '2026-09-22T09:00:00.000Z' }),
    ]));
    expect((await readTasks(ctx, '')).map((t) => t.id)).toEqual(['c_1', 'c_late']);
  });

  it('a tasks log started fresh, with no mark, hears every legacy line', async () => {
    const { ctx } = memory({
      [TASKS_FILE]: jsonl([card({ id: 'c_new' })]),
      [LEGACY_LEDGER_FILE]: jsonl([card({ id: 'c_unmoved' })]),
    });
    expect((await readTasks(ctx, '')).map((t) => t.id)).toEqual(['c_new', 'c_unmoved']);
  });

  it('keeps a note written by new code before the first migration', async () => {
    const { ctx } = memory({ [LEGACY_LEDGER_FILE]: legacy });
    const early: Note = { id: 'n_early', target: '', kind: 'instruction', text: 'Brand voice: plain.',
      state: 'current', at_iso: '2026-09-22T09:00:00.000Z', by: 'person' };
    await appendNote(ctx, '', early);
    await migrateLedger(ctx, '');
    expect((await readNotes(ctx, '')).map((n) => n.id).sort()).toEqual(['c_2', 'n_early']);
  });

  it('does nothing on a workspace with no ledger', async () => {
    const { ctx, store } = memory();
    expect(await migrateLedger(ctx, '')).toEqual({ migrated: false, reason: 'empty' });
    expect(store.size).toBe(0);
  });

  it('roots paths like cardsPath', async () => {
    const { ctx, store } = memory({ [`D:/ws/${LEGACY_LEDGER_FILE}`]: legacy });
    await migrateLedger(ctx, 'D:/ws/');
    expect(store.has(`D:/ws/${TASKS_FILE}`)).toBe(true);
    expect(store.has(`D:/ws/${NOTES_FILE}`)).toBe(true);
  });
});

describe('notes', () => {
  const note = (over: Partial<Note>): Note => ({ id: newNoteId(), target: '', kind: 'instruction', text: 'x',
    state: 'current', at_iso: '2026-09-22T10:00:00.000Z', by: 'person', ...over });

  it('apply to the target and everything under it, and a slotted note only to its slot', () => {
    const all = [
      note({ id: 'ws', target: '' }),
      note({ id: 'proj', target: 'projects/launch' }),
      note({ id: 'other', target: 'projects/other' }),
      note({ id: 'slot', target: 'projects/launch/deck.comp', at: 'page-2/headline' }),
      note({ id: 'old', target: 'projects/launch', state: 'retired' }),
    ];
    expect(notesFor(all, 'projects/launch/deck.comp').map((n) => n.id)).toEqual(['ws', 'proj']);
    expect(notesFor(all, 'projects/launch/deck.comp', 'page-2/headline').map((n) => n.id)).toEqual(['ws', 'proj', 'slot']);
  });

  it('parse leniently but refuse a line with no text, id or known kind', () => {
    expect(parseNoteLine('not json')).toBeNull();
    expect(parseNoteLine(JSON.stringify(note({ text: '' })))).toBeNull();
    expect(parseNoteLine(JSON.stringify({ ...note({}), kind: 'task' }))).toBeNull();
    expect(parseNoteLine(JSON.stringify({ ...note({ id: 'n' }), rating: 9, by: 'agent' }))).toMatchObject({ id: 'n', by: 'person' });
    expect(parseNoteLine(JSON.stringify({ ...note({ id: 'n' }), rating: 9 }))).not.toHaveProperty('rating');
  });

  it('append without a host append primitive', async () => {
    const { ctx, store } = memory({}, false);
    await appendNote(ctx, '', [note({ id: 'a' }), note({ id: 'b' })]);
    await appendNote(ctx, '', note({ id: 'a', state: 'retired' }));
    expect(store.get(NOTES_FILE)!.trim().split('\n')).toHaveLength(3);
    expect((await readNotes(ctx, '')).map((n) => n.id)).toEqual(['b']);
  });

  it('ids are time-ordered and prefixed', () => {
    expect(newNoteId(new Date('2026-09-22T10:11:12.000Z'))).toMatch(/^n_260922101112_[a-z0-9]+$/);
  });
});

describe('note kinds', () => {
  it('survive the round trip through the notes file and the card view', async () => {
    const { ctx, store } = memory();
    const { appendCard, readCards } = await import('../cards/card-codec');
    await appendCard(ctx, '', card({ id: 'c_ref', kind: 'feedback', noteKind: 'reference', instruction: 'Like this video.' }));
    expect(JSON.parse(store.get(NOTES_FILE)!.trim())).toMatchObject({ id: 'c_ref', kind: 'reference', text: 'Like this video.' });
    expect((await readCards(ctx, '')).map((c) => [c.id, c.kind, c.noteKind])).toEqual([['c_ref', 'feedback', 'reference']]);
    expect((await readNotes(ctx, '')).map((n) => n.kind)).toEqual(['reference']);
  });

  it('are kept only on a note, and only when known', async () => {
    const { parseCardLine } = await import('../cards/card-codec');
    expect(parseCardLine(JSON.stringify(card({ id: 'a', kind: 'feedback', noteKind: 'instruction' })))?.noteKind).toBe('instruction');
    expect(parseCardLine(JSON.stringify({ ...card({ id: 'b', kind: 'feedback' }), noteKind: 'nonsense' }))).not.toHaveProperty('noteKind');
    expect(parseCardLine(JSON.stringify({ ...card({ id: 'c' }), noteKind: 'reference' }))).not.toHaveProperty('noteKind');
  });
});
