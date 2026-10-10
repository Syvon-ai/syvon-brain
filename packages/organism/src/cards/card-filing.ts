/**
 * HOW A SELECTION BECOMES A CARD — the filing rule, shared by every app.
 *
 * ── WHY IT LIVES HERE ─────────────────────────────────────────────────────
 * Studio's Flow bar and Surface's review bar both turn the same thing — a
 * handful of pointed-at parts, a sentence, a verdict and two dials — into one
 * line of `meta/cards.jsonl`. Each had its own copy of the arithmetic, and the
 * two disagreed: Surface listed every pin with no verdict, Studio skipped a pin
 * that had nothing to say, and only Studio wrote urgency, power and the worst
 * rating. A worker reading a card could not tell which app filed it, and the
 * card read differently depending on the answer.
 *
 * So the rule is one module, and it is pure. It imports nothing, touches no
 * store, and takes paths as opaque strings — absolute on Studio's disk,
 * bucket keys in Surface — so both hosts hand it what they have and get back a
 * `CardFiling` they turn into a `Card` at their own door.
 *
 * ── THE ACTION IS READ, NOT PICKED ────────────────────────────────────────
 * There were five kinds on a rail and a person had to choose one before the
 * card could be filed. Nobody chooses accurately under that much freedom: the
 * commonest outcome was whatever was selected last, on every card of an
 * afternoon, which makes the field noise in the one place a queue could have
 * been read at a glance.
 *
 * Almost all of the answer is already on screen at the moment of filing. How
 * many things are pointed at, whether one of them is broken, whether a verdict
 * was given, whether the pointer was on a thing at all. So the verb is DERIVED
 * from the shape of the selection, one is preselected, and the two or three
 * that could plausibly be meant instead are offered beside it. A person
 * confirms rather than classifies.
 *
 * ── AN ACTION IS NOT A `CardKind` ─────────────────────────────────────────
 * `CardKind` is what the card ASKS FOR and it goes in the ledger; an action
 * also says where the card lands. `make` is `change` at a folder with no part.
 * Collapsing them into kinds would put that rule in the schema, where every
 * reader of the log would have to know it.
 */

import type { CardKind, CardPower } from './card-types';

/**
 * WHAT A PRESS OF THE CHECK DOES.
 *
 *   make        nothing is pointed at — a card at the place you are standing,
 *               asking for something that does not exist yet.
 *   change      one thing, and the words say what to do to it.
 *   repair      one thing that is BROKEN — it printed an error, and the error
 *               is the brief unless the person writes a better one.
 *   correction  one thing, a verdict, no words: "make this better".
 *   variations  one thing, and the ask is more of it rather than a fix.
 */
export type FilingAction = 'make' | 'change' | 'repair' | 'correction' | 'variations';

/** What the chip says — the label, for the tooltip and for a reader. */
export const FILING_ACTION_LABEL: Record<FilingAction, string> = {
  make: 'Make',
  change: 'Change',
  repair: 'Repair',
  correction: 'Correction',
  variations: 'Variations',
};

/**
 * THE GLYPH FOR EACH ACTION — and they are the CARD KINDS' OWN.
 *
 * An action is what the ticket will BE, so the chip that files it has to wear
 * the same glyph the queue will show it with — otherwise a person learns two
 * vocabularies for one fact. `make` is the one with no kind of its own (it files
 * as `change`), so it takes the plain plus. The other four are `CARD_KIND_ICON`
 * verbatim, and the pairing is asserted in the tests.
 */
export const FILING_ACTION_ICON: Record<FilingAction, string> = {
  make: 'add',
  change: 'swap_horiz',
  repair: 'build',
  correction: 'edit',
  variations: 'call_split',
};

/**
 * THE GLYPH FOR EACH KIND — Material Symbols names, one per `CardKind`.
 *
 * Drawn on every card in every app: the badge on a row in a review panel, the
 * icon on a ticket in an isolate, the mark on the board, the chip that files
 * one. Here, beside the kinds, so the apps cannot draw the same kind two ways.
 */
export const CARD_KIND_ICON: Record<CardKind, string> = {
  variation: 'call_split',
  correction: 'edit',
  change: 'swap_horiz',
  reconnection: 'link',
  repair: 'build',
  /* A note, not a verb — the glyph says what it does to the work, and
     feedback does nothing to it. */
  feedback: 'notes',
};

/**
 * WHAT LANDS IN THE LEDGER for each action.
 *
 * `reconnection` is in `CardKind` and is not reachable from here on purpose:
 * nothing about a selection can tell you that what is wrong is a broken link
 * rather than the content. A person files one from the task panel; workers
 * cannot file tasks at all, and put what they find in their own task's
 * resolution.
 */
const ACTION_KIND: Record<FilingAction, CardKind> = {
  make: 'change',
  change: 'change',
  repair: 'repair',
  correction: 'correction',
  variations: 'variation',
};

export function filingActionKind(action: FilingAction): CardKind {
  return ACTION_KIND[action];
}

/** What the person's selection looks like, as far as the verb is concerned. */
export interface FilingShape {
  /** How many things are pointed at. Zero with `isVoid` is the place. */
  count: number;
  /** The press landed on bare ground — see `CardSpot.isPlace`. */
  isVoid: boolean;
  /** At least one of them printed an error (`CardEvidence.log`). */
  hasLog: boolean;
  /** Something was typed. */
  hasWords: boolean;
  /** A rating was given on the dials. */
  hasRating: boolean;
}

export interface FilingActionChoice {
  chosen: FilingAction;
  /** Every action the person may switch to, `chosen` first. */
  offered: FilingAction[];
}

/**
 * WHICH VERB, AND WHAT ELSE IT COULD HAVE BEEN.
 *
 * The order of these branches is the order of certainty, and each one is a
 * fact about the selection rather than a preference:
 *
 *  1. NOTHING POINTED AT can only be `make`. There is no thing to change, so
 *     no other verb is even offered — a row of chips where six are impossible
 *     is worse than no row.
 *  2. BROKEN is `repair` before anything else about one thing, because a
 *     component that printed an error has told us what is wrong with it. The
 *     person may disagree and mean something else about it, so `change` is
 *     offered beside it.
 *  3. A VERDICT WITH NO WORDS is `correction`. Pressing 2 and nothing else is
 *     "this is not good enough", which is a real and complete instruction.
 *     Adding words to it makes it a `change`, which is branch 4.
 *  4. Otherwise `change`, with `variations` beside it.
 */
export function deriveFilingAction(sel: FilingShape): FilingActionChoice {
  if (sel.isVoid || sel.count === 0) {
    return { chosen: 'make', offered: ['make'] };
  }
  if (sel.hasLog) {
    return { chosen: 'repair', offered: ['repair', 'change', 'variations'] };
  }
  if (sel.hasRating && !sel.hasWords) {
    return { chosen: 'correction', offered: ['correction', 'change', 'variations'] };
  }
  return { chosen: 'change', offered: ['change', 'variations', 'correction'] };
}

/** One pointed-at thing, as much of it as the filing needs. */
export interface FilingSpot {
  /** The file or folder, as the host spells paths. Opaque here. */
  path: string;
  /** The part inside it — `Card.at`. Empty is the whole thing. */
  at: string;
  /** What to call that part — the resolved address. */
  label: string;
  /** What the person renamed the badge to, when they did. Preferred in the brief. */
  name?: string;
  /** What is wrong with this part, in the person's words. */
  note?: string;
  /** How good this part is. The card's own rating is the WORST of them. */
  rating?: 1 | 2 | 3 | 4 | 5;
  /**
   * THIS PIN IS THE PLACE, not a thing in it — the press landed on bare ground
   * and resolved to the folder in the frame. It sets the ticket's target and
   * earns no line in the brief, because there is no part to name.
   */
  isPlace?: boolean;
  nodes?: string[];
  tokens?: string[];
  /** What it printed when it broke — `CardEvidence.log`. */
  log?: string[];
  /** Where it sits on screen, for `CardEvidence.rect`. Measured at the press. */
  rect?: { x: number; y: number; w: number; h: number };
}

export interface FilingDials {
  rating: 1 | 2 | 3 | 4 | 5 | null;
  urgency: 1 | 2 | 3 | 4 | 5;
  power: CardPower;
}

export interface FilingInput {
  action: FilingAction;
  spots: FilingSpot[];
  /**
   * FILES DROPPED OR PASTED INTO THE BUCKET — workspace paths, as data.
   *
   * They are quoted into the sentence as well (that is what a person wrote them
   * for), and this is the same list machine-readable, which is where the queue
   * prompt already tells a worker to look for its starting points.
   */
  files?: string[];
  /** The folder in the frame — where a `make` lands, and the fallback when the
   *  pins share no folder at all. */
  standing: string | null;
  words: string;
  dials: FilingDials;
}

/**
 * ONE CARD, AS THE FILING RULE HANDS IT BACK — everything a host needs to
 * write a `Card`, minus what only the host knows (the id, the author, the
 * picture, the session, the root the target is relative to).
 *
 * `target` is spelled the way the spots were — the host makes it
 * workspace-relative at its own door, as it does for every other card.
 */
export interface CardFiling {
  target: string;
  at?: string;
  kind: CardKind;
  instruction: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  urgency: 1 | 2 | 3 | 4 | 5;
  power?: CardPower;
  nodes?: string[];
  tokens?: string[];
  files?: string[];
  rect?: { x: number; y: number; w: number; h: number };
  log?: string[];
}

/**
 * WHAT TO SAY when the person said nothing.
 *
 * Every one of these is a complete instruction on its own, which is the point:
 * the gesture has to be able to cost one keystroke. A card whose instruction is
 * "make this better" plus a rating of 2 and a picture of the thing is a card a
 * worker can act on, and it took less time to write than choosing a kind used
 * to.
 */
function instructionFor(input: FilingInput, spot: FilingSpot | null): string {
  const said = input.words.trim();
  if (said) return said;
  /* A BROKEN THING SAYS ITS OWN BRIEF. The first line of what it printed is
     the fault far more often than any other line, and it is the sentence the
     person would have copied out by hand. */
  if (input.action === 'repair' && spot?.log?.length) return spot.log[0]!;
  if (input.action === 'correction') {
    const n = input.dials.rating;
    return n ? `Rated ${n}/5 — make this better.` : 'Make this better.';
  }
  if (input.action === 'variations') return 'Try some variations of this.';
  return '';
}

/**
 * THE LONGEST FOLDER EVERY PIN IS INSIDE — where a card over several things
 * lands.
 *
 * One result out of four things is not about any one of them, so the card
 * cannot sit on a pin; it sits on the smallest place that contains them all,
 * which is also the folder a worker would have to stand in to do the work.
 * Falls back to the standing place.
 */
export function commonFolder(spots: FilingSpot[], standing: string | null): string | null {
  if (spots.length === 0) return standing;
  const parts = spots.map((s) => s.path.split(/[\\/]+/).filter(Boolean));
  const first = parts[0]!;
  let shared = 0;
  outer: for (; shared < first.length; shared++) {
    const seg = first[shared]!;
    for (const p of parts) {
      if (p[shared] !== seg) break outer;
    }
  }
  /* THE LAST SEGMENT OF A COMMON PREFIX MAY BE A FILE — two pins on the same
     comp share every segment of it, and a card `target`ed at that comp is
     right. Two pins on different files share their folder, and the prefix stops
     there on its own. Either way what is left is the deepest thing both are in,
     which is what this is for. */
  if (shared === 0) return standing;
  const sep = spots[0]!.path.includes('\\') ? '\\' : '/';
  const lead = spots[0]!.path.startsWith('/') ? '/' : '';
  return lead + first.slice(0, shared).join(sep);
}

/** The pins grouped by the file they are in, in the order the files were
 *  first pointed at. A place is its own group. */
function groupByPath(spots: FilingSpot[]): FilingSpot[][] {
  const groups = new Map<string, FilingSpot[]>();
  for (const s of spots) {
    const g = groups.get(s.path);
    if (g) g.push(s);
    else groups.set(s.path, [s]);
  }
  return [...groups.values()];
}

/**
 * THE BRIEF — the general direction, then one addressed line per part.
 *
 * The direction is what the person typed in the composer, and it is about the
 * whole ask. Each pin adds a line naming itself and, where there is one, its
 * verdict — so a worker reads the shape of the request and then exactly where to
 * look, in the same vocabulary `Card.at` uses.
 *
 * A pin with no note still earns a line, because being POINTED AT is information:
 * it says this part is in scope even when the direction above covers what to do
 * with it. A pin with a note and no direction is a complete brief on its own.
 */
export function briefFor(input: FilingInput, spots: FilingSpot[]): string {
  const lines: string[] = [];
  const said = input.words.trim();
  if (said) lines.push(said);

  for (const s of spots) {
    /* A PLACE NAMES NOTHING — it set the target, and there is no part to list. */
    if (s.isPlace) continue;
    const note = s.note?.trim();
    /*
     * A LINE HAS TO SAY SOMETHING.
     *
     * A pin earns one when it has a note, a verdict, or an ADDRESS — a part
     * inside the file. A pin that is the whole file with nothing said about it
     * earns none: the card's `target` already names that file, so the line would
     * read `- D:/ws/hero.react` and repeat it.
     *
     * That case is not hypothetical, it is the ONE-KEYSTROKE case. Point at a
     * broken component and press Enter: no note, no verdict, no part. The brief
     * has to fall through to the log's first line, and a path repeated as a
     * bullet would have swallowed it.
     */
    if (!note && s.rating == null && !s.at) continue;
    /* WHAT THE PERSON CALLED IT, where they renamed the badge. The line is read by
       whoever works the ticket, so a name they can act on beats an address they
       cannot — `evidence.nodes` and `at` still carry the machine-readable one. */
    const name = s.name || s.label || s.at || s.path;
    const score = s.rating ? ` (${s.rating}/5)` : '';
    lines.push(`- ${name}${score}${note ? `: ${note}` : ''}`);
  }

  if (lines.length > 0) return lines.join('\n');

  /* NOTHING SAID AND NOTHING NAMED — what the shape of the ask implies: a broken
     thing states its own fault, a bare verdict means "make this better". */
  return instructionFor(input, spots[0] ?? null);
}

/**
 * ONE TASK PER FILE — the parts of one file as one task, not one per pin.
 *
 * ── WHY IT IS NOT ONE TASK PER PIN ────────────────────────────────────────
 * "The kicker is too tight and so is the caption" is two findings at two
 * addresses, and the schema's own note warns that a single card naming both is
 * the ticket nobody can work. But that is not what the gesture means. A person
 * points at four parts of one thing and writes one direction about it — that
 * is ONE ask with four addressed observations, and filing it as four cards puts
 * four rows on the board for one decision, four workers potentially on one
 * object, and no record that they were ever the same request.
 *
 * ── SO THE PARTS RIDE IN THE BRIEF, ADDRESSED ─────────────────────────────
 * The instruction is the general direction followed by one line per pin, each
 * naming its own part and its own verdict. That answers the warning above: the
 * failure it describes is a card that names two things and says where NEITHER of
 * them is. This says exactly where each one is, in the same vocabulary `Card.at`
 * uses, and the machine-readable addresses go in `evidence` beside it.
 *
 *   Tighten the strip.
 *   - headline (2/5): too tight
 *   - kicker: wrong colour, use the token
 *
 * `at` is set only when there is exactly ONE pin, which is the common case and
 * the one where a single address is the truth. `rating` is the WORST of the pins'
 * — the convention the workspace already uses for an object's effective rating.
 *
 * Pins across SEVERAL files are one task per file (see below): a task is one
 * thing to do to one target.
 *
 * Empty when there is nothing to say at all: no direction, no notes, no verdict,
 * and no log to borrow a sentence from.
 */
export function cardFilingFor(input: FilingInput): CardFiling[] {
  const { action, spots, dials } = input;
  const kind = filingActionKind(action);
  const rating = dials.rating ?? undefined;

  /* THE VERDICT IS ONLY EVER ON A THING. A `make` asks for something that does
     not exist, so a rating on it would be a judgement of nothing — the schema
     refuses the same thing for a ticket (`cardActError`), and this is where the
     app stops writing one in the first place. */
  if (action === 'make') {
    const target = input.standing;
    const instruction = instructionFor(input, null);
    if (target == null || !instruction) return [];
    return [{ target, kind, instruction, urgency: dials.urgency, power: dials.power }];
  }

  /*
   * ONE TARGET PER TASK.
   *
   * A task is one thing to do to one target. Pins inside one file are one task
   * on that file, with each part addressed in the brief. Pins across several
   * files are one task PER FILE, each carrying the same direction and its own
   * parts: a task on the folder above them had no single thing to be done to,
   * and a worker closing it could not say which file it had finished.
   */
  const files = groupByPath(spots);
  if (files.length > 1) return files.flatMap((group) => cardFilingFor({ ...input, spots: group }));

  /* `at` only when there is exactly one pin, because that is the only case
     where a single address is the truth about the task. */
  const only = spots.length === 1 ? spots[0]! : null;
  const target = spots[0]?.path ?? input.standing;
  const instruction = briefFor(input, spots);
  if (target == null || !instruction) return [];

  /* THE WORST VERDICT IS THE CARD'S. Four parts rated 4,4,2,5 make an object
     that is not finished, and 2 is the number that says so — the same rule
     `search_file_meta` uses for a file's effective rating. */
  const worst = spots.reduce<number | null>(
    (low, s) => (s.rating == null ? low : low == null ? s.rating : Math.min(low, s.rating)),
    null,
  );
  const nodes = spots.flatMap((s) => s.nodes ?? []);
  const tokens = spots.flatMap((s) => s.tokens ?? []);
  const log = spots.flatMap((s) => s.log ?? []);

  return [
    {
      target,
      ...(only?.at ? { at: only.at } : {}),
      kind,
      instruction,
      urgency: dials.urgency,
      power: dials.power,
      ...(worst != null ? { rating: worst as 1 | 2 | 3 | 4 | 5 } : rating ? { rating } : {}),
      ...(nodes.length ? { nodes } : {}),
      ...(tokens.length ? { tokens } : {}),
      ...(input.files?.length ? { files: input.files } : {}),
      /* THE RECT IS ONLY MEANINGFUL FOR ONE. A ring drawn round the first of
         four pins would point at the wrong part three times out of four; the
         addresses in `nodes` are what a reader uses for a set. */
      ...(only?.rect ? { rect: only.rect } : {}),
      ...(log.length ? { log } : {}),
    },
  ];
}

/**
 * THE BLUE SEND: A NOTE, NOT A TICKET.
 *
 * A selection the blue pointer made is EXACTLY a red selection — the numbers,
 * the marks, the comments, the ratings, the bar — except in what leaving it
 * does. No kind is derived, no lane is chosen, no worker is told: one
 * `feedback` card, for the record, carrying the sentence, the verdict and every
 * part the picks addressed. That is the whole difference, and it lives HERE so
 * the two gestures cannot drift apart anywhere upstream of the send.
 *
 * Urgency is a fact about work; a note has none to give, so it is the middle.
 */
export function feedbackFilingFor(input: Omit<FilingInput, 'action'>): CardFiling[] {
  /* A NOTE IS ATTACHED TO ONE THING, like a task is done to one: pins across
     several files are one note per file. */
  const groups = groupByPath(input.spots);
  if (groups.length > 1) return groups.flatMap((group) => feedbackFilingFor({ ...input, spots: group }));
  const { spots, dials } = input;
  const first = spots[0];
  const instruction = briefFor({ ...input, action: 'change' }, spots);
  if (!first || !instruction) return [];
  const parts = [...new Set(spots.flatMap((sp) => (sp.at ? [sp.at] : sp.nodes ?? [])))];
  const only = spots.length === 1 ? first : null;
  const target = first.path;
  return [
    {
      target,
      ...(only?.at ? { at: only.at } : {}),
      kind: 'feedback',
      instruction,
      ...(dials.rating ? { rating: dials.rating } : {}),
      urgency: 3,
      ...(parts.length ? { nodes: parts } : {}),
      ...(input.files?.length ? { files: input.files } : {}),
    },
  ];
}
