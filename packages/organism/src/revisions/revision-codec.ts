/**
 * The revisions log — parse, index, append.
 *
 * Event-sourced JSONL, the same shape as `cards.jsonl` and for the same
 * reason: two processes write it with no lock, and an append cannot lose a
 * concurrent write the way a read-modify-write of a JSON array can.
 *
 * ── The one departure: NOTHING COLLAPSES ──────────────────────────────────
 * A card has one state, so its log collapses to the latest line per id. A
 * revision has NO state — it is an event — so every line stands and there is
 * no `effectiveRevisions`. That is why `version` is stored on the line rather
 * than derived from position: after a roll, position is a lie and `version` is
 * not. It is also why compaction here STUBS and ROLLS rather than folding.
 */

import { sameTarget, targetWithin } from '../cards/card-codec';
import {
  REVISIONS_FILE,
  REVISIONS_LOG_CAP,
  REVISIONS_PROSE_KEEP,
  REVISION_OPS,
  type Revision,
  type RevisionDraft,
  type RevisionOp,
} from './revision-types';

/** IO this module needs. Structurally identical to `CardsContext`, so a host
 *  that already built one for the cards passes the same object with no
 *  adapter — Studio's `ctxFor()` is reusable verbatim. */
export interface RevisionsContext {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
}

/** `meta/revisions.jsonl` under a workspace root. An EMPTY root returns the
 *  bare relative path — the agent's ToolContext IO is already rooted, Studio's
 *  `filesApi` is not. Same contract as `cardsPath`. */
export function revisionsPath(workspaceRoot: string): string {
  const root = workspaceRoot.replace(/[\\/]+$/, '');
  return root ? `${root}/${REVISIONS_FILE}` : REVISIONS_FILE;
}

function isOp(v: unknown): v is RevisionOp {
  return typeof v === 'string' && (REVISION_OPS as readonly string[]).includes(v);
}

/** One line, or null. A malformed line is SKIPPED rather than thrown: one
 *  truncated line from a crash mid-write must not make every version in the
 *  workspace unreadable. Same rule as `parseCardLine`. */
export function parseRevisionLine(line: string): Revision | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let v: Record<string, unknown>;
  try {
    v = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!v || typeof v !== 'object') return null;
  if (typeof v.id !== 'string' || !v.id) return null;
  if (typeof v.path !== 'string' || !v.path) return null;
  if (typeof v.version !== 'number' || !Number.isFinite(v.version) || v.version < 1) return null;
  if (!isOp(v.op)) return null;

  const rev: Revision = {
    id: v.id,
    path: v.path,
    version: Math.floor(v.version),
    op: v.op,
    by: v.by === 'person' ? 'person' : 'agent',
    at_iso: typeof v.at_iso === 'string' ? v.at_iso : new Date(0).toISOString(),
  };
  if (typeof v.from === 'string' && v.from) rev.from = v.from;
  if (typeof v.cardId === 'string' && v.cardId) rev.cardId = v.cardId;
  if (typeof v.at === 'string' && v.at) rev.at = v.at;
  if (typeof v.summary === 'string' && v.summary) rev.summary = v.summary;
  if (typeof v.agent === 'string' && v.agent) rev.agent = v.agent;
  if (typeof v.sha256 === 'string' && v.sha256) rev.sha256 = v.sha256;
  if (typeof v.bytes === 'number' && Number.isFinite(v.bytes)) rev.bytes = v.bytes;
  return rev;
}

export function parseRevisionsJsonl(text: string | null | undefined): Revision[] {
  if (!text) return [];
  const out: Revision[] = [];
  for (const line of text.split('\n')) {
    const rev = parseRevisionLine(line);
    if (rev) out.push(rev);
  }
  return out;
}

/* ── the three questions ──────────────────────────────────────────────────── */

/** WHAT DID CARD X PRODUCE — in the order it produced them. */
export function revisionsForCard(revs: Revision[], cardId: string): Revision[] {
  if (!cardId) return [];
  return revs.filter((r) => r.cardId === cardId);
}

/**
 * THE HISTORY OF FILE Y, following renames backwards.
 *
 * A path is the key, and paths move; without this a rename would restart the
 * file at v1 and orphan every card link — question two answered FALSELY rather
 * than not at all. Walks `renamed` rows from `path` back through `from`,
 * collecting each prior name, then filters on the whole chain.
 */
export function revisionsForPath(revs: Revision[], path: string): Revision[] {
  const chain: string[] = [path];
  /* Bounded by the number of rows: a `from` cycle written by a broken caller
     must not spin here. */
  for (let guard = 0; guard < revs.length + 1; guard += 1) {
    const head = chain[chain.length - 1];
    const rename = revs.find((r) => r.op === 'renamed' && r.from && sameTarget(r.path, head));
    if (!rename?.from) break;
    if (chain.some((p) => sameTarget(p, rename.from as string))) break;
    chain.push(rename.from);
  }
  return revs.filter((r) => chain.some((p) => sameTarget(r.path, p)));
}

/** Everything under a folder, by the same segment-aware containment
 *  `list_cards` uses. This is the only history a folder has ever had:
 *  `FolderMeta` carries none and no `append_folder_history` exists. */
export function revisionsWithin(revs: Revision[], prefix: string): Revision[] {
  return revs.filter((r) => targetWithin(r.path, prefix));
}

/**
 * WHAT VERSION IS Y AT — the max, deliberately, not a count.
 *
 * `appendRevision` is a read-then-append with no lock, so a max only ever
 * SKIPS a number when a line is lost. A gap is a legible fact; a duplicate is a
 * corrupted one.
 */
export function latestVersion(revs: Revision[], path: string): number {
  let max = 0;
  for (const r of revisionsForPath(revs, path)) if (r.version > max) max = r.version;
  return max;
}

/**
 * One pass, three maps — for a surface that asks about many objects at once.
 *
 * The folder inspector draws a version per child and the field draws a badge
 * per ball; `revisionsForPath` per component is one full scan of the array
 * each, so a folder of eighty files is eighty scans. A store builds this once
 * per load, exactly as the card store holds one array for every ball.
 *
 * Note `byPath` is keyed by the path AS WRITTEN and does not follow renames —
 * that is `revisionsForPath`'s job, and doing it here would make an index built
 * for speed quadratic.
 */
export function indexRevisions(revs: Revision[]): {
  byPath: Map<string, Revision[]>;
  byCard: Map<string, Revision[]>;
  version: Map<string, number>;
} {
  const byPath = new Map<string, Revision[]>();
  const byCard = new Map<string, Revision[]>();
  const version = new Map<string, number>();
  for (const r of revs) {
    const key = r.path.toLowerCase();
    const forPath = byPath.get(key);
    if (forPath) forPath.push(r);
    else byPath.set(key, [r]);
    if (r.version > (version.get(key) ?? 0)) version.set(key, r.version);
    if (r.cardId) {
      const forCard = byCard.get(r.cardId);
      if (forCard) forCard.push(r);
      else byCard.set(r.cardId, [r]);
    }
  }
  return { byPath, byCard, version };
}

/* ── read and append ──────────────────────────────────────────────────────── */

/** Every revision in the workspace. A missing log is an empty history, not an
 *  error — every workspace that exists today has one. */
export async function readRevisions(ctx: RevisionsContext, workspaceRoot: string): Promise<Revision[]> {
  let raw: string;
  try {
    raw = await ctx.readFile(revisionsPath(workspaceRoot));
  } catch {
    return [];
  }
  return parseRevisionsJsonl(raw);
}

/**
 * Append one revision, and NUMBER IT.
 *
 * Read-then-write because the hosts have no append primitive: Studio's
 * `filesApi.write` is a whole-file put and `ToolContext.writeFile` is
 * `fs.writeFile`. Two concurrent appends lose a line rather than corrupting the
 * set — and here they can also both mint the same ordinal, which is VISIBLE
 * (two rows, same path, same `version`, different `id`) rather than silent.
 * That only happens when two workers wrote the same file in the same instant,
 * which is already a lost update on the file itself; the log reports a problem
 * it did not cause.
 *
 * `created` is verified here, because here is the only place that has seen
 * every prior line for this path. A caller claiming it for a path already in
 * the log gets `changed` instead — and the returned row says so, so the caller
 * can tell the person rather than reporting a creation that did not happen.
 *
 * Returns the written row so the caller can say "v3" without reading again.
 */
export async function appendRevision(
  ctx: RevisionsContext,
  workspaceRoot: string,
  draft: RevisionDraft,
  now: Date = new Date(),
): Promise<Revision> {
  const path = revisionsPath(workspaceRoot);
  let existing = '';
  try {
    existing = await ctx.readFile(path);
  } catch {
    // First revision in this workspace. `meta/` is an auto-created root and the
    // write handlers mkdir their parent, so there is nothing to create here.
  }
  const lines = existing ? existing.split('\n').filter((l) => l.trim()) : [];
  const prior = parseRevisionsJsonl(lines.join('\n'));

  /* The ordinal follows the file THROUGH a rename, so a move continues the
     history rather than restarting it. On a rename the chain is walked from
     `from`, because `path` is the new name and has no rows yet. */
  const trace = draft.op === 'renamed' && draft.from ? draft.from : draft.path;
  const seen = latestVersion(prior, trace);

  const rev: Revision = {
    ...draft,
    /* A creation claim the log can disprove is downgraded, never trusted. */
    op: draft.op === 'created' && seen > 0 ? 'changed' : draft.op,
    id: newRevisionId(now),
    version: seen + 1,
    at_iso: now.toISOString(),
  };

  lines.push(JSON.stringify(rev));
  const next = lines.length > REVISIONS_LOG_CAP ? await compactRevisionsLog(ctx, workspaceRoot, lines, now) : lines;
  await ctx.writeFile(path, `${next.join('\n')}\n`);
  return rev;
}

/**
 * Keep every row; drop only prose, then roll only overflow.
 *
 * Two stages, because the two costs are different. Stage one: for each path,
 * every row older than the newest `REVISIONS_PROSE_KEEP` loses its `summary`.
 * Stage two: if the file is still over `REVISIONS_LOG_CAP`, the oldest lines
 * move to `meta/revisions.{stamp}.jsonl` and the tail stays live.
 *
 * Nothing reachable is lost, which is the promise the cards log makes and the
 * reason a naive drop-oldest trim was rejected: the oldest rows are the
 * `v1 · created` rows, the half of a history nobody can reconstruct.
 */
export async function compactRevisionsLog(
  ctx: RevisionsContext,
  workspaceRoot: string,
  lines: string[],
  now: Date = new Date(),
): Promise<string[]> {
  const revs = parseRevisionsJsonl(lines.join('\n'));

  // Stage one: prose ages out per path, newest kept.
  const keep = new Set<string>();
  const byPath = new Map<string, Revision[]>();
  for (const r of revs) {
    const key = r.path.toLowerCase();
    const list = byPath.get(key);
    if (list) list.push(r);
    else byPath.set(key, [r]);
  }
  for (const list of byPath.values()) {
    for (const r of list.slice(-REVISIONS_PROSE_KEEP)) keep.add(r.id);
  }
  const stubbed = revs.map((r) => {
    if (r.summary && !keep.has(r.id)) {
      const { summary: _drop, ...rest } = r;
      return rest as Revision;
    }
    return r;
  });

  if (stubbed.length <= REVISIONS_LOG_CAP) return stubbed.map((r) => JSON.stringify(r));

  // Stage two: roll the oldest out to a numbered file; the tail stays live.
  const overflow = stubbed.slice(0, stubbed.length - REVISIONS_LOG_CAP);
  const live = stubbed.slice(stubbed.length - REVISIONS_LOG_CAP);
  const stamp = now.getTime().toString(36);
  const rolled = revisionsPath(workspaceRoot).replace(/\.jsonl$/, `.${stamp}.jsonl`);
  try {
    await ctx.writeFile(rolled, `${overflow.map((r) => JSON.stringify(r)).join('\n')}\n`);
  } catch {
    /* A roll that cannot be written must not lose the rows: keep them live and
       try again on the next append. An over-cap file reads slowly; a dropped
       one reads wrongly. */
    return stubbed.map((r) => JSON.stringify(r));
  }
  return live.map((r) => JSON.stringify(r));
}

/** A revision id. Time-ordered prefix so a raw log reads chronologically —
 *  the same shape as `newCardId`. */
export function newRevisionId(now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(2, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `r_${stamp}_${rand}`;
}
