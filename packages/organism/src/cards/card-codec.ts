/**
 * The cards log — parse, collapse, append.
 *
 * Event-sourced JSONL, exactly as `topics.jsonl` and the autopilot's
 * `verdicts.jsonl` already are in this repo: a change is a NEW LINE, and a
 * card's effective state is its latest line. Nothing rewrites in place.
 *
 * That shape is not a stylistic preference. Two surfaces write these — the
 * person in Flow and an agent working its queue — and they are different
 * processes on the same file. An append is a single write that cannot lose a
 * concurrent one; a read-modify-write of a JSON array silently drops whichever
 * writer lost the race, which here means a person's card vanishing because an
 * agent resolved something at the same moment.
 *
 * Only `compactCardsLog` rewrites, and only when the log is over its cap.
 */

import type { Card, CardAuthor, CardEvidence, CardPower, CardStatus } from './card-types';
import {
  CARDS_FILE,
  CARDS_LOG_CAP,
  CARD_EVIDENCE_CAP,
  CARD_KINDS,
  CARD_LOG_CAP,
  CARD_OUTCOMES,
  CARD_POWERS,
  CARD_STATUSES,
} from './card-types';

/** IO this module needs. Structurally compatible with `FileMetaContext`, so a
 *  host that already built one for the sidecars passes the same object. */
export interface CardsContext {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  /**
   * ADD TO THE END WITHOUT READING FIRST — when the host has one.
   *
   * The docblock above calls the worst case under two writers "a lost line
   * rather than a corrupted set", and calls that harmless because the collapse
   * survives a lost intermediate. True of an intermediate, FALSE of a first
   * line: losing the line that CREATES a card deletes the card, silently. It
   * was watched happening — a review written in the app disappeared under a
   * worker's write built from a snapshot taken a moment earlier, and a running
   * pool writes constantly.
   *
   * Read-modify-write cannot be made safe from here; the fix is to stop doing
   * it. Where the host offers a real append (`fs.appendFile`, O_APPEND, the
   * kernel taking the position at write time) both writers survive. Optional
   * because not every host has one — a browser build talking to an HTTP route
   * does not — and those keep the old path with the old risk.
   */
  appendFile?(path: string, content: string): Promise<void>;
}

/**
 * `meta/cards.jsonl` under a workspace root.
 *
 * An EMPTY root returns the bare relative path, which is what an agent tool
 * wants: `ToolContext`'s file IO is already rooted at the workspace, so a tool
 * passes `''` and gets `meta/cards.jsonl`. Studio's `filesApi` is not rooted,
 * so it passes the absolute root and gets an absolute path. One function, both
 * callers, no second opinion about where the log lives.
 */
export function cardsPath(workspaceRoot: string): string {
  const root = workspaceRoot.replace(/[\\/]+$/, '');
  return root ? `${root}/${CARDS_FILE}` : CARDS_FILE;
}

/**
 * A path as a card stores it: workspace-relative, forward slashes, no leading
 * or trailing separator. Absolute paths under the root are made relative;
 * anything already relative is only normalised.
 *
 * Case is PRESERVED — a path is what names the file on disk, and lowercasing it
 * would make the card unable to find its own target on a case-sensitive host.
 * Comparison, where case must not matter, is `sameTarget`'s job.
 */
export function toCardTarget(workspaceRoot: string, path: string): string {
  const root = workspaceRoot.replace(/\\/g, '/').replace(/\/+$/, '');
  const p = path.replace(/\\/g, '/').trim();
  if (root && (p.toLowerCase() === root.toLowerCase() || p.toLowerCase().startsWith(`${root.toLowerCase()}/`))) {
    return p.slice(root.length).replace(/^\/+/, '').replace(/\/+$/, '');
  }
  return p.replace(/^\/+/, '').replace(/\/+$/, '');
}

/** Two targets naming the same object, with either separator and either case. */
export function sameTarget(a: string, b: string): boolean {
  const norm = (p: string) => p.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
  return norm(a) === norm(b);
}

/** True when `target` is `prefix` itself or something underneath it. Segment-
 *  aware: `projects/catalog` does not contain `projects/catalog-2`. */
export function targetWithin(target: string, prefix: string): boolean {
  const norm = (p: string) => p.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
  const t = norm(target);
  const p = norm(prefix);
  if (!p) return true;
  return t === p || t.startsWith(`${p}/`);
}

/** A list of non-empty strings, capped. Anything else in the array is dropped
 *  rather than making the line unreadable — see `parseCardLine`. */
function stringList(v: unknown, cap: number = CARD_EVIDENCE_CAP): string[] | null {
  if (!Array.isArray(v)) return null;
  const out = v.filter((x): x is string => typeof x === 'string' && !!x.trim()).slice(0, cap);
  return out.length ? out : null;
}

/** A box, all four numbers or nothing — see `CardEvidence.rect`. A partial rect
 *  is worse than none: it would draw a ring somewhere the thing is not. */
function parseRect(v: unknown): { x: number; y: number; w: number; h: number } | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const r = v as Record<string, unknown>;
  const nums = [r.x, r.y, r.w, r.h];
  if (!nums.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  return { x: r.x as number, y: r.y as number, w: r.w as number, h: r.h as number };
}

/**
 * The evidence block, read defensively.
 *
 * Every field is optional and every one is dropped if it is not the shape it
 * claims. A card whose picture path arrived as a number is a card with no
 * picture, not an unreadable line: the instruction is the part that must
 * survive a bad write, and nothing here is the instruction.
 */
function parseEvidence(v: unknown): CardEvidence | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const e = v as Record<string, unknown>;
  const out: CardEvidence = {};
  if (typeof e.origin === 'string' && e.origin) out.origin = e.origin;
  if (typeof e.checkout === 'string' && e.checkout) out.checkout = e.checkout;
  if (typeof e.route === 'string' && e.route) out.route = e.route;
  if (typeof e.session === 'string' && e.session) out.session = e.session;
  if (typeof e.shot === 'string' && e.shot) out.shot = e.shot;
  if (typeof e.drawing === 'string' && e.drawing) out.drawing = e.drawing;
  const files = stringList(e.files);
  if (files) out.files = files;
  const nodes = stringList(e.nodes);
  if (nodes) out.nodes = nodes;
  const tokens = stringList(e.tokens);
  if (tokens) out.tokens = tokens;
  const rect = parseRect(e.rect);
  if (rect) out.rect = rect;
  /* ITS OWN CAP — a stack trace is a list whose middle matters. See
     `CARD_LOG_CAP`. */
  const log = stringList(e.log, CARD_LOG_CAP);
  if (log) out.log = log;
  return Object.keys(out).length ? out : null;
}

/** The author block, read the way the evidence is: every field optional, a
 *  bad one dropped rather than taking the line down with it. */
function parseAuthor(v: unknown): CardAuthor | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const a = v as Record<string, unknown>;
  const out: CardAuthor = {};
  if (typeof a.id === 'string' && a.id) out.id = a.id;
  if (typeof a.name === 'string' && a.name) out.name = a.name;
  if (typeof a.email === 'string' && a.email) out.email = a.email;
  return Object.keys(out).length ? out : null;
}

function isCardKind(v: unknown): v is Card['kind'] {
  return typeof v === 'string' && (CARD_KINDS as readonly string[]).includes(v);
}

function isCardStatus(v: unknown): v is CardStatus {
  return typeof v === 'string' && (CARD_STATUSES as readonly string[]).includes(v);
}

function isScore(v: unknown): v is 1 | 2 | 3 | 4 | 5 {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5;
}

/**
 * One line → a card, or null.
 *
 * A malformed line is SKIPPED rather than thrown on. The log is append-only and
 * written by two processes; one truncated line (a crash mid-write) must not
 * make the whole queue unreadable, which is the failure the strict version
 * would cause and the only one that matters here.
 */
export function parseCardLine(line: string): Card | null {
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
  /*
   * AN EMPTY TARGET IS THE WORKSPACE ITSELF, not a missing field.
   *
   * `toCardTarget(root, root)` is `''` by construction — a path relative to
   * itself has no segments — and the workspace IS an object you can write a
   * card on (Flow's root inspector offers it). Rejecting `''` here meant such
   * a card was appended to the log and then dropped by the very next read: it
   * vanished on reload, with nothing anywhere saying why.
   *
   * A MISSING target is still refused, which is what the `typeof` test is for.
   * The empty string has to be written deliberately, and it reads correctly
   * everywhere downstream: `targetWithin(anything, '')` is true, so the
   * workspace contains every card, which is exactly what a card on the
   * workspace means.
   */
  if (typeof v.target !== 'string') return null;
  if (typeof v.instruction !== 'string') return null;
  if (!isCardKind(v.kind) || !isCardStatus(v.status)) return null;
  if (!isScore(v.urgency)) return null;

  const card: Card = {
    id: v.id,
    target: v.target,
    kind: v.kind,
    instruction: v.instruction,
    urgency: v.urgency,
    status: v.status,
    at_iso: typeof v.at_iso === 'string' ? v.at_iso : new Date(0).toISOString(),
    by: v.by === 'agent' ? 'agent' : 'person',
  };
  if (typeof v.at === 'string' && v.at) card.at = v.at;
  /* ONLY WHEN IT IS A TICKET. `review` is the default (see `CardAct`), and
     writing it back on every line would put a redundant field on every card
     already in every log — a migration nobody asked for, to say what absence
     already says. An unknown value is dropped rather than kept: a line from a
     newer build claiming an act this one does not understand is safer read as
     the default than carried around unvalidated. */
  if (v.act === 'ticket') card.act = 'ticket';
  if (isScore(v.rating)) card.rating = v.rating;
  /* THREE SETTINGS, AND ABSENCE IS ONE OF THE ANSWERS — see `Card.power`. A
     number outside the range is dropped rather than clamped: "as much as the
     worker is already set to" is a real reading of a card that says nothing,
     and quietly turning a 7 into a 3 would spend the expensive model on a
     ticket nobody asked to. */
  if (typeof v.power === 'number' && (CARD_POWERS as readonly number[]).includes(v.power)) {
    card.power = v.power as CardPower;
  }
  if (typeof v.agent === 'string' && v.agent) card.agent = v.agent;
  /* Read back like `agent`, and for the same reason it is a separate field:
     see `Card.holder`. A line from an older build has none, and unheld is the
     safe reading of that — the exclusivity gate opens rather than locking a
     card nobody can prove is in a hand. */
  if (typeof v.holder === 'string' && v.holder) card.holder = v.holder;
  if (typeof v.resolution === 'string' && v.resolution) card.resolution = v.resolution;
  /* An outcome this build does not understand is dropped rather than carried:
     the board draws a failure differently from a success, and a third word it
     cannot read would be drawn as neither. */
  if (typeof v.outcome === 'string' && (CARD_OUTCOMES as readonly string[]).includes(v.outcome)) {
    card.outcome = v.outcome as (typeof CARD_OUTCOMES)[number];
  }
  /* THE BLOCKERS ARE READ LIKE AN EVIDENCE LIST, on purpose — same helper, same
     cap. A line whose `after` arrived as a string, or with a null in it, is a
     card with no blockers rather than an unreadable one: the instruction is the
     part that must survive a bad write, and a dropped edge fails open (see
     `Card.after` — a missing blocker counts as satisfied) where a dropped line
     loses the ask entirely. `CARD_EVIDENCE_CAP` rather than a cap of its own,
     because it is the same judgement about the same kind of list: past a couple
     of dozen ids nothing in there is about anything. */
  const after = stringList(v.after);
  if (after) card.after = after;
  const evidence = parseEvidence(v.evidence);
  if (evidence) card.evidence = evidence;
  const author = parseAuthor(v.author);
  if (author) card.author = author;
  return card;
}

export function parseCardsJsonl(text: string | null | undefined): Card[] {
  if (!text) return [];
  const out: Card[] = [];
  for (const line of text.split('\n')) {
    const card = parseCardLine(line);
    if (card) out.push(card);
  }
  return out;
}

/**
 * Collapse every line to the latest per id, in first-seen order.
 *
 * First-seen rather than latest-write order on purpose: a card that gets
 * touched does not jump to the end of the list and shuffle the queue under
 * someone reading it. Ordering for WORK is `sortForQueue`; this is just the
 * set.
 */
export function effectiveCards(lines: Card[]): Card[] {
  const order: string[] = [];
  const latest = new Map<string, Card>();
  for (const c of lines) {
    if (!latest.has(c.id)) order.push(c.id);
    latest.set(c.id, c);
  }
  return order.map((id) => latest.get(id)!);
}

/**
 * The order an agent works its queue in: urgency first, and where two cards are
 * equally urgent the WORSE-rated one goes first — a 2 needs the attention more
 * than a 4 does. An unrated card sorts as if it were a 3: it carries an
 * instruction but no verdict, so it should not jump the queue nor sink under it.
 */
export function sortForQueue(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.urgency !== b.urgency) return b.urgency - a.urgency;
    const ra = a.rating ?? 3;
    const rb = b.rating ?? 3;
    if (ra !== rb) return ra - rb;
    return a.at_iso.localeCompare(b.at_iso);
  });
}

export interface CardQuery {
  /** The object, or anything under it. */
  target?: string;
  status?: CardStatus | CardStatus[];
  agent?: string;
}

export function filterCards(cards: Card[], q: CardQuery): Card[] {
  const statuses = q.status ? (Array.isArray(q.status) ? q.status : [q.status]) : null;
  return cards.filter((c) => {
    if (q.target && !targetWithin(c.target, q.target)) return false;
    if (statuses && !statuses.includes(c.status)) return false;
    if (q.agent && c.agent !== q.agent) return false;
    return true;
  });
}

/**
 * Every card in the workspace, collapsed. A missing log is an empty queue,
 * not an error — most workspaces have never had a card written in them.
 *
 * WITHOUT THE DROPPED ONES. This is the reader that answers "which cards
 * exist", and a card whose last line says `dropped` does not — see
 * `CardStatus`. It is filtered HERE rather than in `effectiveCards` on
 * purpose: that function is the primitive "latest line per id", and the two
 * readers that want the whole history (`card_activity`, and the compaction
 * that rewrites the log) must keep seeing the tombstone or they would report a
 * deletion as if it had never happened, and compaction would quietly resurrect
 * the card the next time a mirror appended its old lines.
 */
export async function readCards(ctx: CardsContext, workspaceRoot: string): Promise<Card[]> {
  let raw: string;
  try {
    raw = await ctx.readFile(cardsPath(workspaceRoot));
  } catch {
    return [];
  }
  const cards = effectiveCards(parseCardsJsonl(raw));

  /* COMPACTION HAPPENS HERE NOW, not at the append. It used to ride on
     `appendCard`, which held the whole log because it read it to add a line.
     An append does not read, so this is the only place left that holds the
     file — and it is the honest one: a compaction is a rewrite, and a rewrite
     belongs immediately after a fresh read, where a stale snapshot cannot cost
     anything. Best effort: a log that could not be compacted is merely long. */
  const lineCount = raw.split('\n').filter((l) => l.trim()).length;
  if (lineCount > CARDS_LOG_CAP) {
    try {
      await ctx.writeFile(
        cardsPath(workspaceRoot),
        `${cards.map((c) => JSON.stringify(c)).join('\n')}\n`,
      );
    } catch {
      // Long, not broken.
    }
  }
  return cards.filter((c) => c.status !== 'dropped');
}

/**
 * Append a line — or a whole batch of them, in ONE read and ONE write.
 *
 * Read-then-append rather than a real append because the host IO here is a
 * `writeFile` (Studio's files API, an R2 put) with no append primitive. The
 * race that costs is a read-MODIFY-write; this one only ever adds to the end,
 * so the worst case of two concurrent writers is a lost line rather than a
 * corrupted set — and the collapse makes a lost intermediate line harmless as
 * long as the final state gets written, which the next status change does.
 *
 * THE BATCH IS WHY THE CARD ARGUMENT IS A UNION. Handing a worker its queue
 * writes one line per card, and a line is tiny while the log is not — so a
 * loop that called this once per card dragged the ENTIRE file across the
 * bridge twice for every card, and did it serially with a person waiting:
 * routing forty cards against a few hundred lines meant eighty round trips
 * and forty whole-file rewrites. Passing the cards together costs one round
 * trip however many there are. It is also the safer shape for the race above,
 * not just the cheaper one: a batch has no window between its own lines for
 * another writer to slip into, where the loop had one per card.
 */
export async function appendCard(
  ctx: CardsContext,
  workspaceRoot: string,
  card: Card | Card[],
): Promise<void> {
  const batch = Array.isArray(card) ? card : [card];
  // Nothing to say. Writing anyway would rewrite the log to add no line, and
  // on a workspace with no log yet it would create one holding a bare newline.
  if (!batch.length) return;
  const path = cardsPath(workspaceRoot);
  const added = batch.map((c) => JSON.stringify(c));

  /* THE ONLY WRITE THAT CANNOT EAT SOMEBODY ELSE'S LINE — no read, so there is
     no snapshot to go stale between reading and writing. See
     `CardsContext.appendFile`. Compaction moves to the read, which is the only
     place that still holds the whole log. */
  if (ctx.appendFile) {
    try {
      await ctx.appendFile(path, `${added.join('\n')}\n`);
      return;
    } catch {
      /* AND IF THE HOST CANNOT ACTUALLY DO IT, WRITE THE CARD ANYWAY.
         An `appendFile` on the context is a CLAIM by the host, and a claim can
         be wrong in a way nothing here can see: Studio's preload and its main
         process are compiled together and reload separately, so a window
         reload can pick up a preload that offers `append` while the main
         process it talks to has no handler for it yet — the call rejects with
         "No handler registered". Watched happening, on the very fix this path
         exists for.

         Falling through to the read-modify-write below is the old behaviour
         with the old race, which is strictly better than the alternative: the
         whole point of this change is that a person's instruction is never
         lost, and a card that throws on the way to disk is lost with far more
         certainty than one that races. */
    }
  }

  let existing = '';
  try {
    existing = await ctx.readFile(path);
  } catch {
    // First card in this workspace. `meta/` is an auto-created root and the
    // write handlers mkdir their parent, so there is nothing to create here.
  }
  const lines = existing ? existing.split('\n').filter((l) => l.trim()) : [];
  lines.push(...added);
  const next = lines.length > CARDS_LOG_CAP ? compactCardsLog(lines) : lines;
  await ctx.writeFile(path, `${next.join('\n')}\n`);
}

/** Collapse the log to one line per card. Only called when it is over cap. */
export function compactCardsLog(lines: string[]): string[] {
  const cards = effectiveCards(parseCardsJsonl(lines.join('\n')));
  return cards.map((c) => JSON.stringify(c));
}

/** A card id. Time-ordered prefix so a raw log reads chronologically. */
export function newCardId(now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(2, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `c_${stamp}_${rand}`;
}
