/**
 * TASKS AND NOTES — the two records a person writes about their work.
 *
 *   TASK   an action. One thing to do to one target. It has a lifecycle
 *          (waiting → in hand → back to you → accepted), a worker takes it,
 *          and the person's rating at acceptance is the verdict. A task is
 *          the old card minus the note kind: the same shape, the same codec,
 *          the same event-sourced log, in `meta/tasks.jsonl`.
 *   NOTE   everything that informs the work — a reference ("like this
 *          video"), a standing instruction ("hard cuts only in this
 *          project"), feedback ("this colour feels off"), a fact. Attached to
 *          a thing (file, folder, project, or the workspace), with no
 *          lifecycle beyond current or retired, and never handed to a worker.
 *          `meta/notes.jsonl`.
 *
 * Only a person writes either. A worker reads notes and resolves its own task;
 * anything it notices goes in that task's resolution for the person to turn
 * into a note or a task.
 *
 * ── WHY TWO FILES, NOT ONE WITH A KIND ────────────────────────────────────
 * `meta/cards.jsonl` carried both, told apart by `kind: 'feedback'`, and every
 * reader had to remember to skip the notes: the line did (`routableCards`), the
 * board did not, and a note sat in the Waiting column looking like work nobody
 * would ever pick up. Two files make the difference structural. What reads
 * tasks cannot see a note, and what reads notes cannot hand one out.
 *
 * ── ONE VIEW OVER TWO FILES ───────────────────────────────────────────────
 * The card codec's `readCards` / `appendCard` stay the API every caller uses.
 * Underneath, `readLedgerLines` presents tasks and notes as one list of card
 * lines (a note reads as a `kind: 'feedback'` card) and `appendLedger` routes
 * a line to the file its kind belongs in. A caller that only wants tasks
 * filters `isTask`; one that wants notes reads `readNotes`.
 *
 * ── MIGRATE ON FIRST TOUCH, AND KEEP LISTENING TO THE OLD LOG ─────────────
 * The first WRITE in a workspace splits `cards.jsonl` into the two files and
 * marks `tasks.jsonl` with the newest line it split (`MigrationMark`). Reads
 * never migrate — before the first write the view simply is the legacy log. The
 * old log stays where it was, as the backup. A writer that has not been
 * redeployed — production Surface, an older Studio — keeps appending to it,
 * so every read also folds in legacy lines written AFTER the mark. Nothing
 * written anywhere is lost while the fleet catches up.
 */
import type { Card, CardAuthor, CardEvidence, CardKind } from '../cards/card-types';
import { CARDS_FILE, CARD_EVIDENCE_CAP, NOTE_KINDS, type NoteKind } from '../cards/card-types';
import { effectiveCards, parseCardsJsonl, targetWithin, type CardsContext } from '../cards/card-codec';

export const TASKS_FILE = 'meta/tasks.jsonl';
export const NOTES_FILE = 'meta/notes.jsonl';
/** The single log both used to live in. Read for migration and fallback only. */
export const LEGACY_LEDGER_FILE = CARDS_FILE;

/** A task is the action record: every card kind except the note. */
export type TaskKind = Exclude<CardKind, 'feedback'>;
export type Task = Card & { kind: TaskKind };

/* The kinds live with the card shape, since a note is read through it too. */
export { NOTE_KINDS, type NoteKind } from '../cards/card-types';

export interface Note {
  /** `n_…`, time-ordered like a task id. */
  id: string;
  /** Workspace-relative path of the thing it is about; '' is the whole workspace. */
  target: string;
  /** A slot inside the target, when the note is about one part of it. */
  at?: string;
  kind: NoteKind;
  /** What the person said. */
  text: string;
  /** Retired notes stay in the log and leave every reader. There is no other state. */
  state: 'current' | 'retired';
  at_iso: string;
  /** Always a person. A worker's findings are a task's resolution, never a note. */
  by: 'person';
  author?: CardAuthor;
  evidence?: CardEvidence;
  /** A score with no action attached — "this is a 4", nothing to do. */
  rating?: 1 | 2 | 3 | 4 | 5;
}

/**
 * THE FIRST LINE OF A MIGRATED `tasks.jsonl`. Not a card — `parseCardLine`
 * rejects it for having no id, so no reader of tasks ever sees it — and the
 * one fact the view needs: from when on the legacy log is news.
 */
export interface MigrationMark {
  migrated: typeof LEGACY_LEDGER_FILE;
  at_iso: string;
}

const root = (workspaceRoot: string) => workspaceRoot.replace(/[\\/]+$/, '');
/** Rooted like `cardsPath`: '' gives the bare relative path a tool context wants. */
export function tasksPath(workspaceRoot: string): string {
  const r = root(workspaceRoot);
  return r ? `${r}/${TASKS_FILE}` : TASKS_FILE;
}
export function notesPath(workspaceRoot: string): string {
  const r = root(workspaceRoot);
  return r ? `${r}/${NOTES_FILE}` : NOTES_FILE;
}
function legacyPath(workspaceRoot: string): string {
  const r = root(workspaceRoot);
  return r ? `${r}/${LEGACY_LEDGER_FILE}` : LEGACY_LEDGER_FILE;
}

export function isTask(card: Card): card is Task {
  return card.kind !== 'feedback';
}

/** A note id. Same time-ordered prefix as a card id, so a raw log reads chronologically. */
export function newNoteId(now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(2, 14);
  return `n_${stamp}_${Math.random().toString(36).slice(2, 8)}`;
}

const ISO = /^\d{4}-\d{2}-\d{2}T/;

/**
 * One line of `notes.jsonl`, or null. Like `parseCardLine`, a malformed field
 * is dropped rather than the whole line: the text a person wrote survives a
 * bad optional field, but a line with no id, text or valid kind is not a note.
 */
export function parseNoteLine(line: string): Note | null {
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id.trim()) return null;
  if (typeof r.text !== 'string' || !r.text.trim()) return null;
  if (typeof r.kind !== 'string' || !(NOTE_KINDS as readonly string[]).includes(r.kind)) return null;
  if (typeof r.at_iso !== 'string' || !ISO.test(r.at_iso)) return null;
  const note: Note = {
    id: r.id,
    target: typeof r.target === 'string' ? r.target : '',
    kind: r.kind as NoteKind,
    text: r.text,
    state: r.state === 'retired' ? 'retired' : 'current',
    at_iso: r.at_iso,
    by: 'person',
  };
  if (typeof r.at === 'string' && r.at.trim()) note.at = r.at;
  if (r.author && typeof r.author === 'object') note.author = r.author as CardAuthor;
  if (r.evidence && typeof r.evidence === 'object') {
    const e = r.evidence as CardEvidence;
    note.evidence = { ...e, ...(Array.isArray(e.files) ? { files: e.files.slice(0, CARD_EVIDENCE_CAP) } : {}) };
  }
  if (typeof r.rating === 'number' && Number.isInteger(r.rating) && r.rating >= 1 && r.rating <= 5) {
    note.rating = r.rating as Note['rating'];
  }
  return note;
}

export function parseNotesJsonl(text: string | null | undefined): Note[] {
  if (!text) return [];
  return text.split('\n').map((l) => l.trim()).filter(Boolean)
    .map(parseNoteLine).filter((n): n is Note => n !== null);
}

/** Latest line per id, in first-seen order — the notes' own `effectiveCards`. */
export function effectiveNotes(lines: Note[]): Note[] {
  const byId = new Map<string, Note>();
  for (const n of lines) byId.set(n.id, n);
  return [...byId.values()];
}

/**
 * THE NOTES THAT APPLY TO A TARGET — those on it and on everything above it:
 * a note on `projects/launch` informs every task on a file inside it, and a
 * note on '' informs the whole workspace. A slotted note applies only to a
 * task on the same target and slot, so a remark about one headline never
 * becomes a rule for the page.
 */
export function notesFor(notes: Note[], target: string, at?: string): Note[] {
  return notes.filter((n) => n.state === 'current'
    && targetWithin(target, n.target)
    && (!n.at || (n.target === target && n.at === at)));
}

/**
 * A note-card as a note. `feedback` was the only note kind the old log had, so
 * that is the kind it keeps; the person can reclassify it later. The id is the
 * card's own, so anything that pointed at the card still finds it. A dropped
 * card becomes a retired note — the line is how a person takes a note back.
 */
export function noteFromCard(card: Card): Note | null {
  if (card.kind !== 'feedback') return null;
  const text = card.instruction?.trim();
  if (!text) return null;
  return {
    id: card.id,
    target: card.target ?? '',
    ...(card.at ? { at: card.at } : {}),
    kind: card.noteKind ?? 'feedback',
    text,
    state: card.status === 'dropped' ? 'retired' : 'current',
    at_iso: card.at_iso,
    by: 'person',
    ...(card.author ? { author: card.author } : {}),
    ...(card.evidence ? { evidence: card.evidence } : {}),
    ...(card.rating ? { rating: card.rating } : {}),
  };
}

/**
 * A note as the card every existing reader understands: `kind: 'feedback'`,
 * open while current, dropped once retired. The note's own kind survives in
 * nothing a card can hold, which is fine — no card reader asks.
 */
export function cardFromNote(note: Note): Card {
  return {
    id: note.id,
    target: note.target,
    ...(note.at ? { at: note.at } : {}),
    kind: 'feedback',
    ...(note.kind !== 'feedback' ? { noteKind: note.kind } : {}),
    instruction: note.text,
    urgency: 3,
    status: note.state === 'retired' ? 'dropped' : 'open',
    at_iso: note.at_iso,
    by: 'person',
    ...(note.author ? { author: note.author } : {}),
    ...(note.evidence ? { evidence: note.evidence } : {}),
    ...(note.rating ? { rating: note.rating } : {}),
  };
}

/**
 * SPLIT THE OLD LOG. Task history is kept line for line — the log is the only
 * record of who held a task and when, and `task_activity` reads it. Notes are
 * migrated as their current state only: a note has no history worth keeping,
 * and its last line is what the person meant.
 */
export function splitLegacyLedger(text: string | null | undefined): { taskLines: string[]; notes: Note[] } {
  const lines = parseCardsJsonl(text);
  const noteIds = new Set(effectiveCards(lines).filter((c) => c.kind === 'feedback').map((c) => c.id));
  const taskLines = lines.filter((c) => !noteIds.has(c.id)).map((c) => JSON.stringify(c));
  const notes = effectiveCards(lines)
    .filter((c) => c.status !== 'dropped')
    .map(noteFromCard)
    .filter((n): n is Note => n !== null);
  return { taskLines, notes };
}

/** The mark on a migrated `tasks.jsonl`, or null when there is none. */
export function readMigrationMark(tasksText: string | null | undefined): MigrationMark | null {
  const first = (tasksText ?? '').split('\n', 1)[0]?.trim();
  if (!first) return null;
  try {
    const r = JSON.parse(first) as Partial<MigrationMark>;
    return r.migrated === LEGACY_LEDGER_FILE && typeof r.at_iso === 'string' ? (r as MigrationMark) : null;
  } catch {
    return null;
  }
}

/** Read a file, or null when it is not there. The IO the view needs and nothing else. */
export type LedgerRead = (path: string) => Promise<string | null>;

/**
 * EVERY LINE, AS CARDS — tasks, notes as feedback cards, and the legacy log's
 * lines that no migration has seen yet, in that order. Unmigrated, that is the
 * whole legacy log; migrated, only what was appended there after the mark.
 * History is kept for tasks (a line per event); notes contribute their lines
 * as they are. Callers collapse with `effectiveCards` as they always did.
 * Read-only: safe for the context mapper, which must never write.
 */
export async function readLedgerLines(read: LedgerRead, workspaceRoot: string): Promise<Card[]> {
  const [tasks, notes, legacy] = await Promise.all([
    read(tasksPath(workspaceRoot)),
    read(notesPath(workspaceRoot)),
    read(legacyPath(workspaceRoot)),
  ]);
  const legacyLines = parseCardsJsonl(legacy);
  if (tasks === null) {
    return [...legacyLines, ...parseNotesJsonl(notes).map(cardFromNote)];
  }
  /* No mark means `tasks.jsonl` was started fresh, with no legacy log to
     split at the time — so anything in the legacy log now was written after,
     by a writer that has not moved. All of it is late. */
  const mark = readMigrationMark(tasks);
  const late = mark ? legacyLines.filter((c) => c.at_iso > mark.at_iso) : legacyLines;
  return [...parseCardsJsonl(tasks), ...parseNotesJsonl(notes).map(cardFromNote), ...late];
}

/**
 * WRITE CARD LINES WHERE THEIR KIND BELONGS — a task line to `tasks.jsonl`, a
 * note-card to `notes.jsonl` as a note. Same append-first rule as
 * `appendCard`. The workspace must already be migrated: writing the first
 * task line of an unmigrated workspace would create `tasks.jsonl` — the
 * migration's own flag — without the legacy history in it.
 */
export async function appendLedger(ctx: CardsContext, workspaceRoot: string, cards: Card[]): Promise<void> {
  const tasks = cards.filter(isTask);
  const notes = cards.map(noteFromCard).filter((n): n is Note => n !== null);
  if (notes.length) await appendNote(ctx, workspaceRoot, notes);
  if (!tasks.length) return;
  const path = tasksPath(workspaceRoot);
  const added = tasks.map((c) => JSON.stringify(c));
  if (ctx.appendFile) {
    try {
      await ctx.appendFile(path, `${added.join('\n')}\n`);
      return;
    } catch {
      /* The host claimed an append it cannot do — see `appendCard`. */
    }
  }
  const existing = (await readOrNull(ctx, path)) ?? '';
  const lines = existing.split('\n').filter((l) => l.trim());
  await ctx.writeFile(path, `${[...lines, ...added].join('\n')}\n`);
}

async function readOrNull(ctx: CardsContext, path: string): Promise<string | null> {
  try {
    return await ctx.readFile(path);
  } catch {
    return null;
  }
}

const reader = (ctx: CardsContext): LedgerRead => (path) => readOrNull(ctx, path);

/** The live tasks, whichever file they are in. Read-only. */
export async function readTasks(ctx: CardsContext, workspaceRoot: string): Promise<Task[]> {
  return effectiveCards(await readLedgerLines(reader(ctx), workspaceRoot))
    .filter(isTask)
    .filter((t) => t.status !== 'dropped');
}

/** The current notes, whichever file they are in. Read-only. */
export async function readNotes(ctx: CardsContext, workspaceRoot: string): Promise<Note[]> {
  return effectiveCards(await readLedgerLines(reader(ctx), workspaceRoot))
    .filter((c) => c.kind === 'feedback' && c.status !== 'dropped')
    .map(noteFromCard)
    .filter((n): n is Note => n !== null);
}

/** Append notes. Same append-first, read-modify-write-fallback rule as `appendCard`. */
export async function appendNote(ctx: CardsContext, workspaceRoot: string, note: Note | Note[]): Promise<void> {
  const batch = Array.isArray(note) ? note : [note];
  if (!batch.length) return;
  const path = notesPath(workspaceRoot);
  const added = batch.map((n) => JSON.stringify(n));
  if (ctx.appendFile) {
    try {
      await ctx.appendFile(path, `${added.join('\n')}\n`);
      return;
    } catch {
      /* The host claimed an append it cannot do — see `appendCard`. */
    }
  }
  const existing = (await readOrNull(ctx, path)) ?? '';
  const lines = existing.split('\n').filter((l) => l.trim());
  await ctx.writeFile(path, `${[...lines, ...added].join('\n')}\n`);
}

export type MigrateResult =
  | { migrated: true; tasks: number; notes: number }
  | { migrated: false; reason: 'already' | 'empty' };

/**
 * MOVE ONE WORKSPACE FROM `cards.jsonl` TO `tasks.jsonl` + `notes.jsonl`.
 *
 * Idempotent: a workspace with a `tasks.jsonl` is already migrated and is left
 * alone. The legacy log is NOT deleted or rewritten — it stays as the backup,
 * and nothing reads it once `tasks.jsonl` exists. Notes are appended, so a
 * note written by the new code before the first task was is kept.
 *
 * Not safe while an old writer can still append to `cards.jsonl`: a line
 * written there after this runs is invisible to every new reader. That is why
 * nothing calls it until every writer has moved in the same change.
 */
export async function migrateLedger(ctx: CardsContext, workspaceRoot: string): Promise<MigrateResult> {
  if ((await readOrNull(ctx, tasksPath(workspaceRoot))) !== null) return { migrated: false, reason: 'already' };
  const legacy = await readOrNull(ctx, legacyPath(workspaceRoot));
  if (!legacy?.trim()) return { migrated: false, reason: 'empty' };
  const { taskLines, notes } = splitLegacyLedger(legacy);
  if (notes.length) await appendNote(ctx, workspaceRoot, notes);
  /* Tasks last: `tasks.jsonl` existing is the "migrated" flag, so it is only
     written once the notes are safe. A crash between the two re-runs cleanly —
     the notes appended twice collapse to one per id. The mark is the newest
     line the split saw, not the wall clock: a legacy line is late exactly when
     the split did not include it. */
  const newest = parseCardsJsonl(legacy).reduce((m, c) => (c.at_iso > m ? c.at_iso : m), '');
  const mark: MigrationMark = { migrated: LEGACY_LEDGER_FILE, at_iso: newest || new Date(0).toISOString() };
  await ctx.writeFile(tasksPath(workspaceRoot), `${[JSON.stringify(mark), ...taskLines].join('\n')}\n`);
  const liveTasks = new Set(taskLines.map((l) => (JSON.parse(l) as Card).id)).size;
  return { migrated: true, tasks: liveTasks, notes: notes.length };
}
