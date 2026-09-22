/**
 * `session.json` — what a conversation is.
 *
 * v1 lived at `projects/{slug}/sessions/{id}/session.json` and carried no
 * project field at all: the owning slug WAS the key path, so a session could
 * only ever belong to the project it sat inside. That is the constraint this
 * shape removes. v2 lives at `sessions/{id}/session.json` and names its project
 * explicitly, which buys two things:
 *
 *   - one conversation can move between projects (`context.projects`) instead
 *     of being abandoned when the user switches;
 *   - a connector conversation (claude.ai / ChatGPT) can exist without minting
 *     a Project row purely to have somewhere to live.
 *
 * `primaryProjectSlug` is the DEFAULT OUTPUT FOLDER, not a container. Artifacts
 * still land under `projects/{slug}/`, so the draft-vs-export rule in
 * `./output-paths` is untouched by the move.
 *
 * Pure types + a tolerant parser. No I/O, no storage prefix — callers build the
 * key with `getWorkspaceSessionManifestPath`.
 */

export const SESSION_MANIFEST_VERSION = 2 as const;

/** Where a conversation came from. Recorded on the manifest and stamped onto
 *  every card the session produces, so the canvas can tell an in-app turn from
 *  a claude.ai tool call. */
export type SessionOrigin =
  | 'agent'
  /** A remote MCP client we could not name. The connector is stateless and the
   *  `tools/call` request carries no `clientInfo`, so the two labels below are
   *  only available where a host identifies itself; everything else lands here
   *  rather than being guessed into one of them. */
  | 'connector'
  | 'connector-claude'
  | 'connector-chatgpt'
  | 'studio'
  | 'autopilot';

const ORIGINS: readonly SessionOrigin[] = [
  'agent', 'connector', 'connector-claude', 'connector-chatgpt', 'studio', 'autopilot',
];

/**
 * The other places this conversation went.
 *
 * `projects` NEVER repeats `primaryProjectSlug` — a reader that wants
 * everything the session touched takes the union, and `sessionProjects()`
 * below is that union so no caller has to remember the rule.
 */
export interface SessionContext {
  /** Additional project slugs, excluding the primary. */
  projects: string[];
  /** Workspace-relative paths pinned into the conversation. */
  paths: string[];
  /**
   * How the CANVAS is arranged — the user's edit of a derived view, not data.
   *
   * The grid is computed from `cards.jsonl`, which is an append-only ledger and
   * therefore has exactly one order (what happened) and exactly one membership
   * (everything). Both are frequently wrong for looking at: the thing you want
   * in front of you is rarely the last thing written, and a conversation
   * accumulates scratch files you are done with.
   *
   * So these two lists are an OVERLAY. Neither is a delete — `hidden` takes a
   * tile off the stack and leaves the file, the ledger entry and every other
   * surface untouched, and a path that is not in `order` simply keeps its
   * ledger position. That asymmetry is the point: the arrangement is cheap to
   * change and impossible to lose anything with.
   */
  canvas: SessionCanvas;
}

/** The canvas overlay. Both lists are workspace-relative paths. */
export interface SessionCanvas {
  /** Off the stack. NOT deleted — see `SessionContext.canvas`. */
  hidden: string[];
  /** Explicit order, first tile first. Paths not listed fall in after these,
   *  keeping their ledger order, so a partial list is meaningful. */
  order: string[];
}

export interface SessionManifest {
  v: typeof SESSION_MANIFEST_VERSION;
  id: string;
  /** Display name. Called `name` (not `title`) because v1 called it `name` and
   *  `sessions-list.ts` reads that key on every worklines list. */
  name: string;
  createdAt: string | null;
  lastAnswerAt: string | null;
  answerCount: number;
  origin: SessionOrigin;
  /** Default output folder for this conversation. */
  primaryProjectSlug: string;
  /**
   * WHERE THIS CONVERSATION LIVES — its home, not its container.
   *
   * `"project:{slug}"`, a bare section name (`"brand"`, `"assets"`), or `""`
   * for a conversation that started somewhere with no scope at all (the home
   * screen, a connector call). See `sessionScope()` for the vocabulary.
   *
   * ── WHY THIS IS NOT `primaryProjectSlug` ──────────────────────────────
   * They answer different questions and drift on purpose. `primaryProjectSlug`
   * is the DEFAULT OUTPUT FOLDER and it moves: `withActiveProject` re-points it
   * every time the user switches project mid-conversation, which is correct —
   * output should land where you are working. `scope` is where the conversation
   * BELONGS, it is written once when the conversation starts, and navigation
   * never changes it.
   *
   * Collapsing them would mean a conversation's home moved every time you
   * walked past another project, which is the behaviour that made the session
   * feel app-wide in the first place. A brand-scoped conversation still needs
   * somewhere to write files; that is what the other field is for.
   *
   * Advisory, never a wall. It decides what OPENS when nothing is open, and how
   * the switcher groups; an explicit `?s=` still resolves any session from
   * anywhere, because a v2 id locates its own folder.
   */
  scope: string;
  /**
   * A TURN IS RUNNING — stamped when one starts, cleared when it ends.
   *
   * The client's own `sending` flag cannot answer this. It lives in browser
   * memory, so it is false after a reload and false in every tab except the one
   * that pressed send — which is exactly wrong for a rail whose whole job is
   * showing work you are NOT looking at.
   *
   * An ISO instant rather than a boolean, because a crash would leave a boolean
   * true forever. Readers apply a staleness ceiling (see `sessionRunning`) so a
   * process that died mid-turn self-heals instead of spinning until someone
   * edits the file.
   */
  runningSince?: string | null;
  /**
   * THE SENTENCE THE RUNNING TURN IS ANSWERING.
   *
   * Written and cleared with `runningSince`, and meaningless without it — the
   * two are one fact in two fields. It exists because a turn is persisted to
   * the transcript as ONE record when the loop closes: the prompt and the
   * answer go in together, so while a turn is in flight the log holds neither.
   * A reload could therefore say "working" but not what it was working on, and
   * the transcript came back missing the message the user had just sent.
   *
   * NOT a second copy of the transcript, and it must never grow into one. It
   * holds exactly the turn in flight, it is deleted the moment that turn
   * lands in the log, and `name` is no substitute: the name is taken from the
   * conversation's FIRST prompt and then deliberately never overwritten (a
   * user rename must win), so from turn two onwards it describes something
   * else entirely.
   */
  runningPrompt?: string | null;
  /**
   * THE SKILL PERSONA ANSWERING THIS CONVERSATION — e.g. `__builtin__/syvon-world`.
   *
   * Absent = the lane's default persona. Written when a turn explicitly names
   * a skill or when the model calls `set_skill`, and read back on every later
   * turn — this field is what makes a skill outlive the one request that
   * carried it (and a reload: the manifest is the store, the client resends
   * nothing).
   *
   * OVERWRITE semantics, not `scope`'s stored-wins: a later set_skill (or a
   * later explicit skill) REPLACES it, and clearing it returns the lane to
   * its default. Advisory like everything else here — readers validate the id
   * against their own registry and treat an unknown one as absent.
   */
  activeSkill?: string;
  context: SessionContext;
  /** The host's conversation key, when one arrives. Unique per workspace —
   *  it is how a stateless connector call resolves which session it is in. */
  clientRef?: string;
  /**
   * Keys this module does not model, preserved verbatim across a
   * parse→write round trip.
   *
   * Load-bearing: `session.json#settings` is this conversation's generation
   * prefs (`apps/agent/src/lib/server/make/generation-prefs.ts`), the manifest
   * is rewritten on every answer, and a parser that dropped unknown keys would
   * silently reset the user's chosen settings once per turn.
   */
  [extra: string]: unknown;
}

/** A non-empty single path segment — reused for slugs and session ids. */
function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const entry of v) {
    const s = str(entry);
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

// ── Scope: the vocabulary ────────────────────────────────────────────────

/** The prefix that marks a scope as naming one project. */
const PROJECT_SCOPE = 'project:';

/**
 * A project's scope string.
 *
 * A prefix rather than a bare slug so a project can never collide with a
 * section: a project legitimately called `brand` would otherwise be homed to
 * the Brand screen, and the bug would only appear for the one user who named a
 * deck that.
 */
export function projectScope(slug: string): string {
  const s = slug.trim();
  return s ? `${PROJECT_SCOPE}${s}` : '';
}

/**
 * The project a scope names, or null when it names a section (or nothing).
 *
 * The reason scope is a plain string and not a tagged union: it round-trips
 * through JSON, a URL query and a `Record` key without a codec, and these two
 * helpers are the entire cost of that. Callers must go through them rather than
 * slicing the prefix by hand — one place to change if the spelling ever does.
 */
/**
 * HOW LONG A STAMPED TURN IS BELIEVED.
 *
 * The work route caps itself at 120s (`maxDuration`), so anything past this is
 * not a slow turn — it is a turn whose process died before it could clear the
 * stamp. Generous rather than tight: a spinner that stops early on a turn still
 * running is a worse lie than one that runs a few minutes late, because the
 * first teaches people to distrust it.
 */
const RUNNING_TTL_MS = 10 * 60 * 1000;

/**
 * Is a turn actually running, given the stamp and the time now?
 *
 * Pure, and takes `now` rather than reading the clock: this is read on the
 * server per row and could be read on the client, and a function that cannot be
 * tested at a fixed instant is a function whose staleness rule nobody checks.
 */
export function sessionRunning(runningSince: string | null | undefined, now: number): boolean {
  if (!runningSince) return false;
  const started = Date.parse(runningSince);
  if (Number.isNaN(started)) return false;
  // A stamp from the future is a clock disagreement, not a running turn — but
  // it is also not evidence of a crash, so believe it for one TTL.
  return now - started < RUNNING_TTL_MS;
}

export function scopeProjectSlug(scope: string): string | null {
  if (!scope.startsWith(PROJECT_SCOPE)) return null;
  const slug = scope.slice(PROJECT_SCOPE.length).trim();
  return slug || null;
}

/**
 * Read a manifest of either version into the v2 shape.
 *
 * v1 has no `primaryProjectSlug` — the slug was its key path — so the caller
 * supplies it from wherever it resolved the folder. Unknown keys survive (see
 * the index signature). Never throws: a corrupt or absent manifest degrades to
 * a well-formed default, because losing a transcript's manifest must not make
 * the transcript unreadable.
 */
export function parseSessionManifest(
  raw: unknown,
  ctx: { id: string; primaryProjectSlug: string; origin?: SessionOrigin; scope?: string },
): SessionManifest {
  const src: Record<string, unknown> =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...(raw as Record<string, unknown>) } : {};

  // Modelled keys are pulled out so the rest can be spread back untouched.
  const {
    v: _v, id: _id, name: _name, createdAt: _c, lastAnswerAt: _l, answerCount: _a,
    origin: _o, primaryProjectSlug: _p, scope: _s, runningSince: _rs, runningPrompt: _rp,
    activeSkill: _sk, context: _ctx, clientRef: _cr,
    ...extra
  } = src;

  const rawContext =
    _ctx && typeof _ctx === 'object' && !Array.isArray(_ctx) ? (_ctx as Record<string, unknown>) : {};

  const primaryProjectSlug = str(_p) ?? ctx.primaryProjectSlug;
  const origin = ORIGINS.includes(_o as SessionOrigin) ? (_o as SessionOrigin) : (ctx.origin ?? 'agent');
  const count = typeof _a === 'number' && Number.isFinite(_a) && _a >= 0 ? Math.floor(_a) : 0;

  return {
    ...extra,
    v: SESSION_MANIFEST_VERSION,
    id: str(_id) ?? ctx.id,
    name: str(_name) ?? ctx.id,
    createdAt: str(_c),
    lastAnswerAt: str(_l),
    answerCount: count,
    origin,
    primaryProjectSlug,
    // A stored scope always wins — it was written once, at the start, and
    // nothing since is a better answer. Absent, it is DERIVED from the output
    // folder, which makes every session that predates this field read as homed
    // to its own project instead of homeless. That is the whole migration:
    // there is nothing to backfill, because the old field already says it.
    scope:
      str(_s) ??
      str(ctx.scope) ??
      (primaryProjectSlug ? projectScope(primaryProjectSlug) : ''),
    // Absent unless a turn is in flight, so an idle manifest stays clean
    // rather than carrying a null nobody reads.
    ...(str(_rs) ? { runningSince: str(_rs)! } : {}),
    // Only alongside a stamp. A prompt with no `runningSince` is a leftover
    // from a write that half-failed, and carrying it forward would let a
    // reader show a sentence for a turn that is not running.
    ...(str(_rs) && str(_rp) ? { runningPrompt: str(_rp)! } : {}),
    // Absent unless set — the parser never invents a persona, and an empty or
    // non-string value reads as "no skill" rather than surviving as junk.
    ...(str(_sk) ? { activeSkill: str(_sk)! } : {}),
    context: {
      // The primary is implicit, so strip it if a writer listed it anyway.
      projects: strArray(rawContext.projects).filter((s) => s !== primaryProjectSlug),
      paths: strArray(rawContext.paths),
      canvas: parseCanvas(rawContext.canvas),
    },
    ...(str(_cr) ? { clientRef: str(_cr)! } : {}),
  };
}

/** True when `raw` was already written in the v2 shape — i.e. it lives at
 *  `sessions/{id}/` and needs no slug supplied from its key path. */
export function isSessionManifestV2(raw: unknown): boolean {
  return !!raw && typeof raw === 'object' && (raw as { v?: unknown }).v === SESSION_MANIFEST_VERSION;
}

/** Every project this conversation touched, primary first, deduped. */
export function sessionProjects(manifest: SessionManifest): string[] {
  return [manifest.primaryProjectSlug, ...manifest.context.projects.filter((s) => s !== manifest.primaryProjectSlug)];
}

/**
 * Point the conversation at a different ACTIVE project, keeping the old one.
 *
 * One session is one conversation; it can be LINKED to several projects, and
 * exactly one of those is active — the folder its output lands in now. Switching
 * therefore has two halves, and the second is the one that is easy to forget:
 * the outgoing project must be demoted into `context.projects`, not dropped.
 * Overwriting `primaryProjectSlug` alone loses every project the conversation
 * worked in before this one, which is precisely the history the canvas exists
 * to show.
 *
 * Pure, and a no-op when the slug is already active — so a caller can run it on
 * every turn without churning the manifest.
 */
export function withActiveProject(manifest: SessionManifest, slug: string): SessionManifest {
  const next = slug.trim();
  if (!next || next === manifest.primaryProjectSlug) return manifest;
  const outgoing = manifest.primaryProjectSlug;
  const projects = manifest.context.projects.filter((s) => s !== next);
  // A session that never had a primary (a connector conversation started before
  // any project existed) has nothing to demote.
  if (outgoing && !projects.includes(outgoing)) projects.push(outgoing);
  return { ...manifest, primaryProjectSlug: next, context: { ...manifest.context, projects } };
}

/**
 * Point the conversation at a different SKILL PERSONA — or back at the lane
 * default (`null` / `''` clears the field entirely, keeping an idle manifest
 * clean the way `runningSince` does).
 *
 * Pure, and a no-op returning the SAME manifest when nothing changes, so a
 * caller can run it unconditionally and skip the write. Overwrite semantics on
 * purpose — see the field's doc comment.
 */
export function withActiveSkill(manifest: SessionManifest, skillId: string | null): SessionManifest {
  const next = skillId?.trim() || null;
  const current = manifest.activeSkill ?? null;
  if (next === current) return manifest;
  if (next) return { ...manifest, activeSkill: next };
  const { activeSkill: _drop, ...rest } = manifest;
  return rest as SessionManifest;
}

/**
 * How many files a conversation may pin.
 *
 * Small ON PURPOSE. Pins go into the system prompt on EVERY turn, so the list
 * is a cost paid per message forever. A cap is what keeps them a working set
 * — "the three things this conversation is about" — rather than a second,
 * worse copy of the card ledger.
 */
export const MAX_SESSION_PINS = 20;

/**
 * Pin a file into the conversation's working set.
 *
 * `context.paths` is DELIBERATE, not automatic. What a conversation TOUCHED is
 * already recorded — every read and write lands in `cards.jsonl` — and
 * mirroring that here would grow without bound and make every prompt worse.
 * A pin says something the ledger cannot: *this* is what the conversation is
 * about, keep it in view even after it falls out of the history window.
 *
 * Newest last, deduped, capped at `MAX_SESSION_PINS` by dropping the OLDEST —
 * pinning a 21st file is a statement about what matters now, so it should
 * succeed and retire the stalest pin rather than fail.
 *
 * Pure: returns a new manifest, or the SAME one when nothing changed, so a
 * caller can skip the write.
 */
export function withPinnedPath(manifest: SessionManifest, path: string): SessionManifest {
  const next = path.trim().replace(/^\/+/, '');
  if (!next || manifest.context.paths.includes(next)) return manifest;
  const paths = [...manifest.context.paths, next].slice(-MAX_SESSION_PINS);
  return { ...manifest, context: { ...manifest.context, paths } };
}

function parseCanvas(raw: unknown): SessionCanvas {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return { hidden: strArray(src.hidden), order: strArray(src.order) };
}

/** Normalise a path the way both pin and canvas lists store it. */
function relPath(path: string): string {
  return path.trim().replace(/^\/+/, '');
}

function withCanvas(manifest: SessionManifest, canvas: SessionCanvas): SessionManifest {
  return { ...manifest, context: { ...manifest.context, canvas } };
}

/**
 * Take a tile off the canvas.
 *
 * NOT a delete, and the distinction is the whole feature: the file stays, its
 * ledger record stays, every other surface still shows it. Hiding says "not on
 * this board", which is a statement about the view — so it is stored with the
 * view (the session), never against the file.
 *
 * Also drops the path from `order`: a hidden tile has no position, and leaving
 * a stale entry there would silently restore it to a slot on unhide rather than
 * where the ledger would put it.
 */
export function withHiddenPath(manifest: SessionManifest, path: string): SessionManifest {
  const next = relPath(path);
  const { hidden, order } = manifest.context.canvas;
  if (!next || hidden.includes(next)) return manifest;
  return withCanvas(manifest, { hidden: [...hidden, next], order: order.filter((p) => p !== next) });
}

/** Put a hidden tile back. A no-op when it was never hidden. */
export function withoutHiddenPath(manifest: SessionManifest, path: string): SessionManifest {
  const next = relPath(path);
  const { hidden, order } = manifest.context.canvas;
  if (!next || !hidden.includes(next)) return manifest;
  return withCanvas(manifest, { hidden: hidden.filter((p) => p !== next), order });
}

/**
 * Record the order the user dragged the tiles into.
 *
 * Stored as the WHOLE visible list rather than a moved-item delta, because the
 * grid the user was looking at is the only thing that makes a position mean
 * anything — a delta replayed against a ledger that has grown since would land
 * the tile somewhere else.
 *
 * Hidden paths are stripped: they have no position, and keeping them would make
 * unhide reinstate a slot rather than the ledger's answer.
 */
export function withCanvasOrder(manifest: SessionManifest, order: string[]): SessionManifest {
  const { hidden } = manifest.context.canvas;
  const seen = new Set<string>();
  const next: string[] = [];
  for (const raw of order) {
    const p = relPath(raw);
    if (!p || seen.has(p) || hidden.includes(p)) continue;
    seen.add(p);
    next.push(p);
  }
  const current = manifest.context.canvas.order;
  if (next.length === current.length && next.every((p, i) => p === current[i])) return manifest;
  return withCanvas(manifest, { hidden, order: next });
}

/** Unpin a file. A no-op when it was not pinned. */
export function withoutPinnedPath(manifest: SessionManifest, path: string): SessionManifest {
  const target = path.trim().replace(/^\/+/, '');
  if (!manifest.context.paths.includes(target)) return manifest;
  return {
    ...manifest,
    context: { ...manifest.context, paths: manifest.context.paths.filter((p) => p !== target) },
  };
}

/**
 * Record that a conversation touched a project or a path. Pure — returns a new
 * manifest; the caller writes it.
 *
 * This is the whole point of the v2 shape: the user goes back and forth between
 * projects inside one conversation, and the canvas needs to show all of it.
 */
export function withSessionContext(
  manifest: SessionManifest,
  touched: { project?: string; path?: string },
): SessionManifest {
  const project = touched.project?.trim();
  const path = touched.path?.trim();
  const projects =
    project && project !== manifest.primaryProjectSlug && !manifest.context.projects.includes(project)
      ? [...manifest.context.projects, project]
      : manifest.context.projects;
  const paths = path && !manifest.context.paths.includes(path) ? [...manifest.context.paths, path] : manifest.context.paths;
  if (projects === manifest.context.projects && paths === manifest.context.paths) return manifest;
  // SPREAD, never a fresh literal: `context` also carries the canvas overlay
  // (hidden tiles, drag order), and this runs on every turn — rebuilding the
  // object from two fields would wipe the user's arrangement once per message.
  return { ...manifest, context: { ...manifest.context, projects, paths } };
}
