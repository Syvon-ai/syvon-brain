/**
 * REVISIONS — which files a card produced, and which change of that file it is.
 *
 * ── The question neither existing record answers ──────────────────────────
 * A card says what a PERSON asked for and, on `done`, one sentence about what
 * happened. A file's sidecar said what was done TO ONE FILE
 * (`FileMeta.history`). Put them side by side and the join is missing in both
 * directions: a card names no file, a file names no card, and nothing in this
 * system carries an ordinal — there was no record anywhere that could say
 * "this is the third change to this file".
 *
 * A join between two things is its own relation. NOT a field on the card line,
 * which is re-appended whole on every status change and whose parser copies
 * field-by-field and drops keys it does not know — so one un-upgraded writer
 * would erase the file list from disk permanently, because collapse keeps the
 * latest line. NOT a field on the sidecar, which is a whole-object replace
 * capped at twenty.
 *
 * ── Why it is central ─────────────────────────────────────────────────────
 * The same decision, and the same reason, as `meta/cards.jsonl`: the three
 * questions this log exists to answer — what did card X produce, what is the
 * history of file Y, what version is Y at — are each ONE pass over ONE file.
 * Sharded per object, the first becomes a walk of the whole tree.
 *
 * ── What it is NOT ────────────────────────────────────────────────────────
 * It is not bytes and it cannot restore anything. `@syvon/file-versions` is the
 * byte log — content-addressed blobs, diff, restore, retention — and it is
 * DB-backed, fed only by R2 write paths. This is the INDEX: which change, of
 * which file, for which query. `sha256` is the deliberate seam between the two,
 * computed the same way, so a workspace that later syncs joins a revision to
 * the blob that change produced with no change to this format.
 *
 * ── Who may write ─────────────────────────────────────────────────────────
 * An agent, freely. That breaks no fence: a revision is a RECORD of what was
 * done, the same class as `Card.resolution`, which an agent already writes. The
 * fence is around JUDGEMENT — rating, urgency, `reviewed`, the existence of a
 * card — and none of it is here.
 *
 * What is NEVER taken from the caller is `version`, `id` and `at_iso`: a
 * version an agent could choose is a version an agent could re-use, and the
 * ordinal is the only thing in this file that has to be true. Same rule, and
 * the same reason, as `append_file_history`'s `at` and `by`.
 */

/**
 * What happened to the file.
 *
 *   created   the file did not exist before this change.
 *   changed   it did. The default, and the honest word when we cannot tell.
 *   deleted   it no longer exists. The row stays; the file does not.
 *   renamed   it is now at `path`, and `from` says where it was.
 *
 * `created` is a CLAIM, and `appendRevision` checks it: a caller claiming
 * `created` for a path the log has already seen is written as `changed` and
 * told so — named, never silent, the same treatment `resolve_card` gives a
 * refused field. A `v1` whose `op` is `changed` therefore means "first RECORDED
 * change", not "new file", and a reader must say so: a version number that
 * pretends to be the file's true age is worse than no version number.
 */
export type RevisionOp = 'created' | 'changed' | 'deleted' | 'renamed';

export const REVISION_OPS: readonly RevisionOp[] = [
  'created',
  'changed',
  'deleted',
  'renamed',
] as const;

export interface Revision {
  /**
   * This line's identity. NOT a collapse key — a revision has no state, it is
   * an event that happened, so nothing here collapses. It exists so compaction
   * can stub a row by reference and so a duplicate append is detectable.
   */
  id: string;
  /**
   * The file, workspace-relative with forward slashes — the same spelling and
   * the same normaliser (`toCardTarget`) `Card.target` uses, so a card on
   * `projects/catalog/cover.dsgn` and a revision of it compare with
   * `sameTarget` and nest with `targetWithin` without a second opinion about
   * what a path is.
   */
  path: string;
  /**
   * WHICH CHANGE OF THIS FILE THIS IS. 1-based, per path, assigned by
   * `appendRevision` inside the read the append already has to do — the only
   * place in the system that has seen every prior line for this path.
   *
   * It counts RECORDED changes, not writes. A file that existed before this log
   * begins at v1 on its first recorded touch, and `op` says whether that v1 is
   * a creation or merely the first one anyone wrote down.
   *
   * Stored, not derived from position, and that is load-bearing: compaction
   * rolls overflow to a numbered file, after which position is a lie and this
   * is not. A stored ordinal is immutable per line, which is what a version has
   * to be to be worth naming.
   */
  version: number;
  op: RevisionOp;
  /** Where the file was, on a rename. `revisionsForPath` follows it backwards
   *  so a move does not reset the file to v1 and orphan every card link. */
  from?: string;
  /**
   * The card this change answers, when there was one.
   *
   * Absent is a FACT, not a gap: a change made off the rework queue — a person
   * editing, an agent tidying — genuinely has no query behind it, and writing a
   * fake one to fill the column would make the join useless.
   */
  cardId?: string;
  /**
   * The part of the file touched — `video/shot-2`, `page-3/headline`. The same
   * vocabulary as `Card.at`. Note it is what was TOUCHED, not what was ASKED: a
   * card on `video/shot-2` whose fix needed `video/shot-3` says so here, and
   * the drift is visible rather than hidden.
   */
  at?: string;
  /**
   * What was done, in the worker's words.
   *
   * THE ONE HOME FOR THIS SENTENCE. Two copies of one fact is the construction
   * `FileMeta.history`'s own docblock refuses ("a second copy of them would
   * drift"), and a precedence rule in the UI to pick between them is drift
   * management, not a design.
   *
   * Optional because it is the half that ages out — see `REVISIONS_PROSE_KEEP`.
   */
  summary?: string;
  /** The lane that did it — `Card.agent`, so a revision traces back to the
   *  worker whose context folder produced it. */
  agent?: string;
  by: 'agent' | 'person';
  /** ISO timestamp of this line. Set by the codec, never by the caller. */
  at_iso: string;
  /**
   * sha256 of the file's UTF-8 content at the moment of the append, lowercase
   * hex, and `bytes` its length. Both absent for anything binary or too large
   * to hash: hashing a JPEG read as UTF-8 produces a confident wrong hash,
   * which is worse than none. Absent on `deleted`.
   *
   * Nothing local reads them yet. They are here because they are free at write
   * time, impossible to reconstruct afterwards, and are the exact join key the
   * byte log already uses.
   */
  sha256?: string;
  bytes?: number;
}

/** What a caller supplies. `id`, `version` and `at_iso` are the codec's. */
export type RevisionDraft = Omit<Revision, 'id' | 'version' | 'at_iso'>;

/** `meta/revisions.jsonl`, relative to the workspace root — beside the cards. */
export const REVISIONS_FILE = 'meta/revisions.jsonl';

/**
 * How many rows per path keep their `summary`.
 *
 * Twenty, matching `FILE_HISTORY_CAP` exactly, because that is the depth at
 * which this repo already decided prose stops being worth carrying — and
 * matching it means the record a person reads is the same depth as the one they
 * read before.
 *
 * Past it a row is STUBBED, never dropped: it keeps everything except the
 * sentence. The link between a query and a file, and the ordinal chain, are
 * cheap to keep and impossible to reconstruct; the sentence explaining them is
 * worth reading for about as long as the card it belongs to is open.
 */
export const REVISIONS_PROSE_KEEP = 20;

/**
 * How many lines the live file may hold before overflow rolls to
 * `meta/revisions.{stamp}.jsonl`.
 *
 * Read cost, the same question `CARDS_LOG_CAP` answers: this log is read
 * whenever a version is drawn. Rolling rather than trimming is the house answer
 * for a NON-COLLAPSING log, and it is why v47 can never sit above a hole.
 */
export const REVISIONS_LOG_CAP = 4000;
