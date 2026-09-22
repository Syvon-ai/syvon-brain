/**
 * CARDS — the review: a rating and an instruction, attached to an object,
 * queueable to an agent.
 *
 * ── Why this is not just another field on the sidecar ──────────────────────
 * The sidecar USED to carry the verdict (`rating` + `ratingNote`) beside these
 * cards — one act in two stores, and only the cards ever reached the workline.
 * They were the same thing; they are one now. A card's optional `rating` is
 * the star, its `instruction` is the note, and this log is the only verdict
 * store. Sidecars written before the merge may still hold the old fields on
 * disk; they are legacy, read by nothing that writes.
 *
 * ── Not to be confused with `@syvon/agent/tools/shared/cards` ─────────────
 * THAT module is about FILE CARDS — the previews a chat transcript extracts
 * from a tool call. Same word, unrelated thing. These are the rating cards.
 *
 * ── Why this lives in `organism` ──────────────────────────────────────────
 * Because `meta/cards.jsonl` is a fact about the SHAPE OF A WORKSPACE, which is
 * what this package already owns (`workspace-config.ts`, `brand-folder-paths`).
 * Both sides need it and neither can own it: `packages/agent` is node-side and
 * Studio's renderer must not import it, and a mirror in the app — the way
 * `file-meta` is mirrored — is a second copy of the parsing rules waiting to
 * disagree with the first. Organism is a dependency of both, and this module
 * imports nothing at all, so it costs neither of them anything.
 *
 * A card can say what a single star-field never could:
 *
 *   - a verdict on a FOLDER — a project, a whole object, not a file in it;
 *   - a verdict on a PATH INSIDE a file — one shot of a comp, one slot of a
 *     design, addressed the way `review_composition` findings already address
 *     their subjects;
 *   - MORE THAN ONE at a time — a variation to try, a repair to make and a
 *     reconnection to fix are three instructions about the same object;
 *   - URGENCY — the order the queue is worked in, which is a different question
 *     from how good the thing is;
 *   - an ASSIGNEE — which agent is going to do it.
 *
 * The workline skill reads these, and only these.
 *
 * ── Who may write what ────────────────────────────────────────────────────
 * The same rule `write_file_meta` already enforces, for the same reason. Only a
 * PERSON creates a card, sets its `rating` or `urgency`, or marks it
 * `reviewed`. An agent may only move a card it was given from `queued` through
 * `working` to `done`, and write what it did in `resolution`. An agent that
 * could approve its own rework has removed the only signal the queue carries.
 */

/**
 * WHICH ACT MADE THIS CARD — and it is the one distinction the schema was
 * missing.
 *
 * A REVIEW is anchored to a NODE. Its precondition is output: there is
 * something already there, you looked at it, and this is the verdict. It can
 * carry a `rating`, because there is something to rate. Without a `target`
 * that exists it means nothing.
 *
 * A TICKET is anchored to a HAND. Its precondition is an agent: nothing has
 * been made yet, and this is the ask. It carries no `rating`, because a
 * verdict on a thing that does not exist is noise. Without an `agent` it is a
 * wish, not a ticket.
 *
 * Each act requires exactly one thing the other does not have. That is the
 * whole rule, and it is why this is one field rather than two record types:
 * they are the same atom — one instruction, at one address — bonded to two
 * different things. A review can be re-bonded into a ticket without a word of
 * it being rewritten, which is precisely what the bar's Review/Send pair does
 * by hand today.
 *
 * ── ONE LEDGER, NOT TWO ───────────────────────────────────────────────────
 * The temptation is a second file. Don't: the docblock at the top of this
 * module is the record of what happened last time this shape was split — the
 * verdict lived on the sidecar while the instructions lived here, "one act in
 * two stores", and only one of them ever reached the workline. A `tickets.jsonl`
 * beside `cards.jsonl` rebuilds that bug with new names.
 *
 * ── THE DEFAULT IS `review`, DELIBERATELY ─────────────────────────────────
 * Every line already on disk was written by the review panel or by the bar's
 * Review button, and every one of them is a verdict on something that existed.
 * An absent `act` reading as `review` is therefore not a fallback, it is the
 * truth about the log's history.
 */
export type CardAct = 'review' | 'ticket';

export const CARD_ACTS: readonly CardAct[] = ['review', 'ticket'] as const;

/**
 * DID IT WORK — the agent's own account of its attempt, written with `done`.
 *
 * `done` alone has always been ambiguous, and the ambiguity is expensive: it
 * means "the worker has finished with this", which covers both "the change is
 * made" and "I tried and could not". Those go in the same column, read the
 * same on the board, and a person accepting a queue of them is accepting
 * failures they never saw. So the worker must say which, and the word is
 * attributed to it: the card already carries `agent` (which lane) and
 * `by: 'agent'` (which kind of hand), and this is what that hand claims to
 * have achieved.
 *
 * IT IS NOT A VERDICT. `rating` is a person's judgement of the output and
 * stays refused to agents; this is a report about an attempt, which is the one
 * thing the agent is the authority on. A `success` a person disagrees with is
 * still answered the way it always was — by rating it, or by writing another
 * card.
 */
export type CardOutcome = 'success' | 'failure';

export const CARD_OUTCOMES: readonly CardOutcome[] = ['success', 'failure'] as const;

/**
 * HOW MUCH POWER THE TICKET IS WORTH — the third dial on the bar, beside
 * urgency and rating.
 *
 * Three settings, because that is how many the app can actually reach: the
 * fast one, the everyday one, the expensive one. It is not a rating and it is
 * not a priority — a trivial correction can be urgent and still want the
 * cheapest model, and a quiet architectural change can wait a week and still
 * want the best one. Those are three separate questions and this is the third.
 *
 * A NUMBER, NOT A MODEL NAME. The card outlives the model line-up and travels
 * to workspaces running a different CLI, so what it records is how much — and
 * whoever hands it out maps that onto whatever that worker can be set to
 * (`lane-commands`). A card that named `opus` would be a card that expired.
 */
export type CardPower = 1 | 2 | 3;

export const CARD_POWERS: readonly CardPower[] = [1, 2, 3] as const;

/** What kind of change the card asks for. Not a taxonomy for its own sake —
 *  it is what the instruction IS, and it lets a queue be read at a glance.
 *
 *  `feedback` is the one kind that asks for NOTHING. It is a note about the
 *  work for the record — evaluation, self-improvement, "this is how it reads"
 *  — pointed at a part the same way a ticket is, but never handed to a lane:
 *  no agent, no queue, no outcome. Its life is a person's alone: written
 *  `open`, finished `reviewed` by the check that validates it. */
export type CardKind =
  | 'variation'
  | 'correction'
  | 'change'
  | 'reconnection'
  | 'repair'
  | 'feedback';

/**
 * WHERE A CARD IS IN ITS LIFE.
 *
 *   open      written, nobody assigned. The default.
 *   queued    handed to an agent; waiting its turn in that agent's queue.
 *   working   that agent is on it now.
 *   done      the agent finished and said what it did. NOT approved.
 *   reviewed  a person looked at the result and is satisfied.
 *   dropped   the person took it back. The card is gone.
 *
 * `done → reviewed` is a person's move alone. `done` means "the agent says it
 * is finished", which is a claim, not a verdict.
 *
 * ── `dropped` IS A DELETE, AND IT IS STILL A LINE ─────────────────────────
 * A card written by mistake, or made pointless by the work that happened
 * since, has to be able to leave the board — otherwise every queue silts up
 * with cards nobody will ever work and the Waiting column stops meaning "what
 * is next". But this log is append-only for a reason that has not changed (two
 * writers, no lock: see `card-codec`), so a delete cannot cut lines out of it.
 * It is a last line saying the card is gone, and `readCards` — the reader that
 * answers "which cards exist" — is where it disappears.
 *
 * Terminal and person-only. An agent may not drop work it was given: refusing
 * a card is what `done` with `outcome: 'failure'` is FOR, and it says why,
 * where a silent deletion says nothing and loses the ask. Nothing moves out of
 * `dropped` either — a card you want back is a card you write again, which is
 * one sentence of typing and leaves the log honest about what happened.
 */
export type CardStatus = 'open' | 'queued' | 'working' | 'done' | 'reviewed' | 'dropped';

export const CARD_KINDS: readonly CardKind[] = [
  'variation',
  'correction',
  'change',
  'reconnection',
  'repair',
  'feedback',
] as const;

export const CARD_STATUSES: readonly CardStatus[] = [
  'open',
  'queued',
  'working',
  'done',
  'reviewed',
  'dropped',
] as const;

/** The statuses an AGENT is allowed to write. See the file docblock. */
export const AGENT_WRITABLE_STATUSES: readonly CardStatus[] = ['working', 'done'] as const;

/**
 * WHOSE HAND — the person, not the kind of hand.
 *
 * `by` already says `person` or `agent`, and that answers a rule question:
 * who is ALLOWED to have written this line (only a person rates, only a person
 * accepts). It does not answer the question a queue asks the moment more than
 * one person is in it — WHO wrote this, and who do I go back to when the
 * instruction is ambiguous.
 *
 * The builder board is exactly that case by construction: it holds cards
 * mirrored in from every checkout on every machine that writes one, so "a
 * person" is the least useful thing a card can say about its author. Written
 * from the signed-in profile at the moment of the write, and absent where
 * nobody is signed in — an unattributed card is still a card.
 *
 * IDENTITY IS COPIED, NOT REFERENCED. A card outlives a session and travels to
 * workspaces that cannot resolve an account id, so the display name and email
 * are written beside it rather than looked up later. The id is what a system
 * matches on; the other two are what a person reads.
 */
export interface CardAuthor {
  /** The account id, where the host knows one. */
  id?: string;
  /** What to show — the display name. */
  name?: string;
  email?: string;
}

export interface Card {
  /** Stable across every line that touches this card — the collapse key. */
  id: string;
  /**
   * The object, as a workspace-relative forward-slash path. A folder
   * (`projects/catalog-layout`) or a file (`projects/catalog-layout/cover.comp`).
   * Relative rather than absolute so a card survives the workspace being
   * checked out somewhere else, and so it means the same thing after `ws push`.
   */
  target: string;
  /**
   * A path INSIDE the target, when the card is about one part of it —
   * `video/shot-2`, `page-3/headline`. The same addressing
   * `review_composition` uses for its findings, so the two vocabularies agree.
   * Absent means the card is about the whole object.
   */
  at?: string;
  /**
   * Which act made it — see `CardAct`. Absent means `review`: every line
   * written before this field existed was one.
   */
  act?: CardAct;
  kind: CardKind;
  /** What to change, in the rater's own words. The brief the agent works to. */
  instruction: string;
  /**
   * How much the output matters — the same 1–5 scale the file star uses.
   * Optional: an instruction with no verdict attached is still worth doing.
   *
   * A TICKET MAY NOT CARRY ONE. There is nothing made yet to be good or bad,
   * so a number here would be a judgment of a thing that does not exist. See
   * `cardActError`, which is where that is enforced.
   */
  rating?: 1 | 2 | 3 | 4 | 5;
  /** Where it lands in the queue. Higher goes first. */
  urgency: 1 | 2 | 3 | 4 | 5;
  /**
   * HOW MUCH MODEL TO SPEND ON IT — see `CardPower`.
   *
   * Absent means the card says nothing, and a worker handed it runs on whatever
   * it is already set to. That is the right default and it is why this is
   * optional: most tickets do not care, and a field written on every card
   * would make "the everyday one" look like a decision somebody took.
   */
  power?: CardPower;
  status: CardStatus;
  /** The lane this card was handed to, once assigned. */
  agent?: string;
  /**
   * WHO ACTUALLY PICKED IT UP — written by `resolve_card` on `working`, and
   * distinct from `agent` on purpose. `agent` is a PROMISE: the pump writes it
   * when it hands a card out, and it stays put whether or not that lane ever
   * started. This is the FACT, and only a lane that called `working` has one.
   *
   * The difference is what makes exclusivity possible. Two lanes pointed at
   * the same card both read `agent` as themselves-or-someone, so it cannot
   * answer "is this already in a hand"; `holder` can, because it is written by
   * the act of taking the card rather than by the act of offering it.
   *
   * Absent on every card written before this field, and on every card nobody
   * has started. Absence means unheld — the gate in `resolve_card` opens for
   * it, which is what keeps an old log workable.
   */
  holder?: string;
  /**
   * WHAT MUST BE FINISHED FIRST — ids of cards that have to reach `done` or
   * `reviewed` before this one may be routed to a worker. The dependency edge,
   * and the only one the schema has.
   *
   * ── WHERE THE IDEA COMES FROM ───────────────────────────────────────────
   * Steve Yegge's Beads, borrowed openly: `bd ready` answers "what can be
   * started right now" as "everything with no open blockers", and that single
   * question is most of what a queue needs to stop handing out work whose
   * ground has not been laid yet. Ours is that one field and none of the graph
   * — no transitive closure, no cycle detection, no second store underneath it.
   * A list of ids on a card, read by whoever routes.
   *
   * ── IT IS NOT A HIERARCHY ───────────────────────────────────────────────
   * Not an epic, not a parent link, not a sub-task pointer. The object tree is
   * ALREADY the hierarchy: a card on a folder contains its files' cards, which
   * is what `targetWithin` computes and what every reader here already uses to
   * ask "what is under this". Containment is answered by the target. This is
   * the other edge — ORDER — and it is the one the target cannot express, since
   * two cards on the same file can still need doing in a particular sequence.
   *
   * ── A MISSING BLOCKER COUNTS AS SATISFIED ───────────────────────────────
   * The id may name a card that was never written, or one somebody has since
   * deleted. A card locked forever because its blocker no longer exists is a
   * worse failure than a card that starts early: the first is invisible and
   * permanent, the second is a person noticing and re-filing. So absence reads
   * as done. The check itself lives with the planner — this module holds the
   * shape, not the policy.
   */
  after?: string[];
  /** What the agent did — written on `done`. A record, never a verdict. */
  resolution?: string;
  /**
   * Whether the attempt succeeded, in the agent's own words — see
   * `CardOutcome`. Written with `done` and meaningless before it: a card
   * nobody has finished with has no outcome to report.
   */
  outcome?: CardOutcome;
  /**
   * What was on screen when it was written — see `CardEvidence`. A record for
   * the reader, never part of the brief.
   */
  evidence?: CardEvidence;
  /**
   * WHO wrote this line — see `CardAuthor`. `by` says which kind of hand; this
   * says whose, and on a board fed by several checkouts that is the difference
   * between a queue and a pile.
   */
  author?: CardAuthor;
  /** ISO timestamp of THIS line. */
  at_iso: string;
  by: 'person' | 'agent';
}

/** `meta/cards.jsonl`, relative to the workspace root. */
export const CARDS_FILE = 'meta/cards.jsonl';

/**
 * How many lines the log may hold before a read compacts it.
 *
 * The file is append-only, so a card touched ten times is ten lines. Same
 * reasoning as `FILE_HISTORY_CAP`: the log is read whenever a queue is drawn,
 * and an unbounded one on a busy workspace is a real cost. Compaction rewrites
 * the collapsed set, so nothing reachable is lost — only superseded lines.
 */
export const CARDS_LOG_CAP = 2000;

/**
 * THE TWO INVARIANTS, in one place so both sides check the same thing.
 *
 * Returns the reason a card is malformed, or null when it is fine. A checker
 * rather than a thrower: the app wants to say "a ticket needs an agent" on the
 * bar, and the node side wants to refuse the write — one sentence serves both,
 * and neither has to know the other's error convention.
 *
 * `target` is not checked for EXISTENCE here. This module imports nothing (see
 * the file docblock — that is what lets both sides depend on it), so it cannot
 * touch a filesystem; whether a path resolves is the caller's to answer, and
 * `card-codec` is where a malformed line is dropped.
 */
export function cardActError(card: Pick<Card, 'act' | 'agent' | 'rating' | 'target'>): string | null {
  const act: CardAct = card.act ?? 'review';
  if (act === 'ticket') {
    if (!card.agent) {
      return 'A ticket is addressed to an agent — assign it to a lane, or file it as a review of something that already exists.';
    }
    if (card.rating != null) {
      return 'A ticket carries no rating: nothing has been made yet to judge.';
    }
    return null;
  }
  /* `''` IS A TARGET — it is the workspace itself, which is why `card-codec`
     takes an empty string and refuses only a MISSING field ("an empty target
     is the workspace, not a missing field"). Testing truthiness here would
     have made every card on the workspace root malformed. */
  if (typeof card.target !== 'string') {
    return 'A review is about an object — it needs a target.';
  }
  return null;
}

/**
 * WHAT THE PERSON WAS LOOKING AT WHEN THEY WROTE IT.
 *
 * The instruction says what should change. This says what was on screen, and
 * it is the half a queue loses first: a card read three days later, on another
 * board, in another workspace, is a sentence about an object whose state
 * nobody remembers. Everything here was already KNOWN at the moment of
 * writing and thrown away — the builder pick resolves a component chain and a
 * `file:line`, photographs the window with its own badges in it, and then
 * `writePickTicket` kept the target and dropped the rest.
 *
 * Every field is optional and every one is a RECORD, never an instruction: an
 * agent works to `instruction`, and reads this to know where to look. A card
 * with no evidence is a card written by hand, which is most of them and is
 * fine.
 *
 * ── NODES AND TOKENS, not just files ──────────────────────────────────────
 * A file is where the SOURCE is, and for half this system that is the wrong
 * altitude. A `.dsgn` node has an id the canvas already marks (`data-layer-id`,
 * `data-syv-node`) and the structure list already addresses; a colour that is
 * wrong is wrong at `--color-secondary`, in the DNA, not at the line of the
 * file that happens to reference it. Those are the two addresses this system
 * actually reasons about, so they are two fields rather than more `file:line`
 * strings with a different shape smuggled into them.
 *
 * `at` stays what it is — ONE address, the part the card is ABOUT. These are
 * the material it touches, which is a different and longer list: a card `at`
 * `page-3/headline` may name four tokens and two nodes.
 */
export interface CardEvidence {
  /**
   * The workspace this was written in, absolute, as the machine that wrote it
   * spells paths.
   *
   * WITHOUT THIS A MIRRORED CARD CANNOT BE OPENED. `target` is relative to its
   * own workspace by design, and the builder board deliberately holds copies
   * of cards from every other one — so a board joining `target` onto the root
   * it happens to be reading lands on a path that does not exist. A card that
   * came from somewhere else has to say where.
   */
  origin?: string;
  /**
   * WHERE THE SOURCE LIVES — the absolute monorepo root that `files` below are
   * relative to, as the machine that wrote it spells paths.
   *
   * ── WHY THIS IS NOT `origin` ────────────────────────────────────────────
   * `origin` is the WORKSPACE the card was FILED FROM. This is the CHECKOUT the
   * card is ABOUT, and on a builder ticket those are two different roots on the
   * same disk. The person is standing in a Syvon workspace when they pick a
   * component and write the ticket — that is what `origin` records — but what
   * the ticket asks for is a change to a file in a git checkout, so the worker
   * that picks it up has to stand in the checkout, not in the workspace it was
   * written from. Joining `files` onto `origin` lands in the wrong tree, which
   * is the same failure `origin` itself exists to prevent for `target`.
   *
   * Without it the card says `packages/studio-editor/...` and there is no root
   * anybody — a reader, a router, a worker — can resolve that against.
   */
  checkout?: string;
  /** Where in the app it was written â the route, for a card about the product. */
  route?: string;
  /**
   * THE RUN IT CAME OUT OF — a work-session id (`sessions/<id>/`).
   *
   * A ticket is one sentence lifted out of an afternoon. The shot says what
   * was on screen and the instruction says what to change; neither says what
   * had just been tried, what was said a minute earlier, or which of four
   * attempts this was the verdict on — and that is most of what a person
   * would tell you if you asked them about the card in person.
   *
   * The session already records all of it (`work-session.ts`: the run as a
   * linear timeline, with each line's own shot, drawing and picked
   * components). It was simply never joined to the cards the same run
   * produced. This is the join, and it is one string: the timeline stays one
   * file, written once, read by whoever wants the context.
   *
   * A card with no session is normal — one written before this existed, or
   * in a run where nothing had been said yet.
   */
  session?: string;
  /**
   * The picture, workspace-relative — `meta/cards/<id>.png`.
   *
   * COPIED, NEVER REFERENCED. The picker's own `.syvon/builder-pick.png` is
   * overwritten by the next capture on purpose (it is what is current, not a
   * history), so a card pointing at it shows someone else's screen within the
   * minute. The copy is the card's for as long as the card exists.
   */
  shot?: string;
  /** `apps/studio/src/features/flow/FlowApp.tsx:86` â where the source is. */
  files?: string[];
  /**
   * WHAT WAS DRAWN OVER THAT PICTURE — a PNG, workspace-relative
   * (`meta/cards/<id>-drawing.png`), beside the shot it annotates.
   *
   * The same pair `WorkSessionEntry` already keeps, and for the same reason:
   * the shot says what was on screen, the drawing says what the person MEANT
   * about it. A circle round the wrong margin with an arrow to where it should
   * go is a sentence nobody can type, and a ticket that carries the words and
   * the photograph but not the ink has lost the clearest half of the ask.
   *
   * Transparent, and drawn OVER the shot rather than beside it — it was
   * drawn in the frame's coordinates, so the two only mean anything stacked.
   */
  drawing?: string;
  /** Nodes inside the object: layer ids, component names, structure addresses. */
  nodes?: string[];
  /** DNA tokens the card is about — `--color-secondary`, `h2-section`. */
  tokens?: string[];
  /**
   * WHERE IN THE PICTURE THE THING IS — the pointed element's box, in the
   * `shot`'s own pixels.
   *
   * The shot is the whole window, deliberately: the numbered badges the picker
   * draws are real DOM, so photographing the window rather than cropping to a
   * rect is what puts the person's own annotations in the picture. The cost of
   * that is a 2560px screenshot in which the thing the card is about may be a
   * 40px caption, and a reader — a person on the board, or a worker that just
   * called `read_asset` — has to find it from the words.
   *
   * So the box travels beside the picture rather than instead of it. Nothing
   * crops; whoever draws the shot can ring it, and whoever reads it knows where
   * to look. Absent on a card written from a menu, or about a whole object, or
   * on a PLACE — there was no element.
   */
  rect?: { x: number; y: number; w: number; h: number };
  /**
   * WHAT IT PRINTED WHEN IT BROKE — the component's own error and warnings, at
   * the moment the card was written.
   *
   * ── WHY THIS IS ON THE CARD AND NOT LOOKED UP LATER ───────────────────────
   * It cannot be looked up later. A `.react` runs inside an `<iframe sandbox>`
   * with an opaque origin; what it printed lives in that frame's console and
   * nowhere else, and the frame is gone the moment the preview unmounts. The
   * error was caught, shown inline, and thrown away — so a card about a broken
   * component carried a photograph of a blank tile and the words "this is
   * broken", and the worker rediscovered from scratch what the browser had
   * already said in one line.
   *
   * ── THE FIRST LINE IS THE FAULT, USUALLY ──────────────────────────────────
   * Written error-first (see `diagnosticLines`), because that is the ordering a
   * reader can rely on: `log[0]` is the throw where there was one, and the
   * queue prompt tells the worker to read it that way. The rest is what the
   * component warned about on the way, which is often the actual cause (an
   * asset that 404'd, a key that collided).
   *
   * A RECORD, NEVER THE BRIEF. `instruction` is what to do; this is what
   * happened. The app may seed the instruction FROM it when the person typed
   * nothing, and that is a copy made at filing time, not a rule about the field.
   */
  log?: string[];
}

/** How many entries of each list a card may carry. A pick can name a long
 *  ancestor chain and none of it past the first few is about anything. */
export const CARD_EVIDENCE_CAP = 24;

/**
 * How many printed lines a card may carry — see `CardEvidence.log`.
 *
 * Larger than `CARD_EVIDENCE_CAP` because a stack trace is a list whose middle
 * matters: the top frame names the throw and the frames under it name the
 * component, and cutting at 24 would routinely lose the second. Still small
 * enough that a ledger line stays a line.
 */
export const CARD_LOG_CAP = 20;

/** Where a card's picture lives, workspace-relative. One per card, by id. */
export const CARD_SHOTS_DIR = 'meta/cards';

export function cardShotPath(id: string): string {
  return `${CARD_SHOTS_DIR}/${id}.png`;
}

/** The ink over that shot. Same folder, same id, the suffix the session's own
 *  drawings already use — one convention, so a reader who has seen
 *  `shots/<t>-drawing.png` knows what this is. */
export function cardDrawingPath(id: string): string {
  return `${CARD_SHOTS_DIR}/${id}-drawing.png`;
}
