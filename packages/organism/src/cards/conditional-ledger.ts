/**
 * A LEDGER ON STORAGE WITH NO APPEND — without losing a line.
 *
 * `appendCard` asks its host for `appendFile`, and on disk that is a real
 * append. On R2 it is not: there is no append, so the hosts read the file,
 * concatenated the new line and put the whole thing back. Two writes at the
 * same moment — two tabs, two people, production still writing beside a new
 * deploy — both read the same copy, and the second put erased the first line.
 * The one-time split had the same hole: two first writes both saw no
 * `tasks.jsonl`, both split, and the second overwrote a line the first had
 * already appended.
 *
 * Storage that CAN compare-and-swap closes both. Every read here remembers the
 * object's tag; every whole-file write is conditional on the tag it was based
 * on (or on the file still being absent, when it read nothing), and fails
 * rather than overwriting when someone else got there first. Append is a
 * read-and-conditional-put loop that re-reads on a lost race, so a concurrent
 * line is kept rather than clobbered.
 *
 * A lost whole-file write throws `LedgerConflict`. The codec already treats
 * both callers of `writeFile` that way: a failed split leaves the append going
 * to whoever did split, and a failed compaction leaves the log long, not
 * broken.
 *
 * Imports nothing, like the rest of this folder: the host hands in its own
 * storage calls.
 */

import type { CardsContext } from './card-codec';

export interface ConditionalStorage {
  /** The object's text and tag; `{ body: null, etag: null }` when it is absent. */
  read(path: string): Promise<{ body: string | null; etag: string | null }>;
  /**
   * Put `body` only if the object still has tag `expected`, or — when
   * `expected` is null — only if it does not exist. False on a lost race;
   * throw on any other failure.
   */
  put(path: string, body: string, expected: string | null): Promise<boolean>;
}

/** Another writer changed the file between this read and this write. */
export class LedgerConflict extends Error {
  constructor(path: string) {
    super(`ledger conflict on ${path}`);
    this.name = 'LedgerConflict';
  }
}

/** How many times an append re-reads after losing a race before giving up. */
const APPEND_ATTEMPTS = 8;

const pause = (attempt: number) =>
  new Promise<void>((r) => setTimeout(r, 20 * (attempt + 1) + Math.floor(Math.random() * 30)));

export function conditionalLedger(storage: ConditionalStorage): CardsContext {
  /* The tag each path had when THIS context last read it. A write based on an
     older read must not win over a newer write it never saw. */
  const seen = new Map<string, string | null>();

  return {
    readFile: async (path) => {
      const { body, etag } = await storage.read(path);
      seen.set(path, body === null ? null : etag);
      if (body === null) throw new Error('missing');
      return body;
    },
    writeFile: async (path, content) => {
      const expected = seen.has(path) ? (seen.get(path) ?? null) : (await storage.read(path)).etag;
      if (!(await storage.put(path, content, expected))) throw new LedgerConflict(path);
      seen.delete(path);
    },
    appendFile: async (path, content) => {
      for (let attempt = 0; attempt < APPEND_ATTEMPTS; attempt++) {
        const { body, etag } = await storage.read(path);
        const prev = body ?? '';
        const joined = prev && !prev.endsWith('\n') ? `${prev}\n` : prev;
        if (await storage.put(path, joined + content, body === null ? null : etag)) {
          seen.delete(path);
          return;
        }
        await pause(attempt);
      }
      throw new LedgerConflict(path);
    },
  };
}
