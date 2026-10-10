/**
 * ONE ACTION, AND IT DECIDES FOR ITSELF — what "make this real" costs.
 *
 * A source and its comp differ in several ways at once, and they are not the
 * same kind of difference. Most need no judgement at all: a word that changed,
 * pages that moved, a part taken out, a part that names a page already in the
 * project. Those are edits to the comp, done here and now, for nothing. What
 * is left over needs a worker: prose that says how a page should LOOK, and a
 * part with no page to draw it on.
 *
 * So the button is one button. It plans first, does everything free, and hands
 * over only the remainder — and it can say, before it is pressed, whether
 * pressing it costs anything.
 *
 *   free      the comp is edited: words, order, a page added or dropped
 *   a worker  a part's brief changed, or a part has no page yet
 *
 * Pure: it reads and returns a plan. `applyPlan` returns the comp to write.
 */

import { briefHash } from './source-run';
import { ADDRESS_KEYS, addCompPage, compOrderFromSource, removeCompPage, setCompSlots } from './comp-sync';
import type { CompPartAddress } from './comp-parts';
import { headerValue, parseSource, partName } from './source-doc';

/**
 * WHAT WAS BUILT, PER PART — each part's brief at its last run, keyed by the
 * page it is about, never by where it sits. Keyed by position, moving a part
 * compared it with whatever used to be in its place, and a reorder read as a
 * brief to rebuild.
 *
 *   shot:<id>        a video's shot
 *   page:<file>#<n>  a deck page — the nth part naming that layout
 *   name:<name>      a part that names no page yet
 */
export type BriefRecord = Readonly<Record<string, string>>;

/** Each part's key in a `BriefRecord`, in the source's order. */
export function briefKeys(text: string): string[] {
  const seen = new Map<string, number>();
  return parseSource(text).parts.map((p, i) => {
    const shot = headerValue(p.header, 'shot');
    if (typeof shot === 'string' && shot.trim()) return `shot:${shot.trim()}`;
    const page = headerValue(p.header, 'page');
    if (typeof page === 'string' && page.trim()) {
      const f = fileName(page.trim().replace(/\\/g, '/')).toLowerCase();
      const n = seen.get(f) ?? 0;
      seen.set(f, n + 1);
      return `page:${f}#${n}`;
    }
    const name = headerValue(p.header, 'name');
    return typeof name === 'string' && name.trim() ? `name:${name.trim()}` : `part:${i}`;
  });
}

/** The record of the source as it stands — every part counted as built. */
export function briefRecord(text: string): Record<string, string> {
  const keys = briefKeys(text);
  const out: Record<string, string> = {};
  parseSource(text).parts.forEach((p, i) => {
    out[keys[i]!] = briefHash(p);
  });
  return out;
}

export type UpdateStep =
  | { kind: 'slots'; page: number; slots: Array<[string, string | null]> }
  | { kind: 'remove'; page: number; name: string }
  | { kind: 'add'; at: number; src: string; name: string };

export interface UpdatePlan {
  /** Edits to the comp, done here for nothing. */
  steps: UpdateStep[];
  /** The pages are in another order than the parts. */
  reorder: boolean;
  /** Source parts a worker must build, 0-based. */
  work: number[];
  /** There is no comp at all: the whole piece has to be made. */
  make: boolean;
  /** Does pressing it call a model? */
  costs: boolean;
  /** Is there anything to do? */
  any: boolean;
  /** What the button says under itself, in a line. */
  says: string;
}

const fileName = (rel: string) => rel.split('/').pop() ?? rel;

/**
 * THE PAGE A PART IS, FOR PLANNING — stricter than `addressFor`, which falls
 * back to the part's position. A part that NAMES a page and names one the comp
 * does not have is a part with no page; taking the page at its position would
 * be a plan to rewrite somebody else's page.
 */
function pageOf(
  header: readonly (readonly [string, unknown])[],
  index: number,
  parts: readonly CompPartAddress[],
  claimed: ReadonlySet<number>,
): CompPartAddress | undefined {
  const free = (p: CompPartAddress) => !claimed.has(p.index);
  const shot = header.find(([k]) => k === 'shot')?.[1];
  if (typeof shot === 'string' && shot.trim()) {
    return parts.find((p) => free(p) && (p.shot === shot.trim() || p.at === shot.trim()));
  }
  const page = header.find(([k]) => k === 'page')?.[1];
  if (typeof page === 'string' && page.trim()) {
    const want = page.trim().replace(/\\/g, '/');
    return parts.find(
      (p) => free(p) && (p.src === want || (!!p.file && (p.file === want || fileName(p.file) === fileName(want)))),
    );
  }
  const at = parts[index];
  return at && free(at) ? at : undefined;
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function planUpdate(input: {
  text: string;
  /** The comp's pages (`compPartsOf`). */
  parts: readonly CompPartAddress[];
  /** False when the comp has not been made yet. */
  compExists: boolean;
  /** The project's files, for a part that names a page that already exists. */
  files?: readonly string[];
  /** Each part's brief as it was at its last run (`briefRecord`). */
  lastBriefs?: BriefRecord;
  /**
   * Parts the person rated low since they were last built — the brief is the
   * same, but what came back is not it yet. Another pass, by a worker.
   */
  again?: readonly number[];
}): UpdatePlan {
  const { text, parts, compExists, files = [], lastBriefs = {}, again = [] } = input;
  const doc = parseSource(text);
  const keys = briefKeys(text);
  const steps: UpdateStep[] = [];
  const work: number[] = [];

  if (!compExists) {
    return {
      steps: [],
      reorder: false,
      work: doc.parts.map((_, i) => i),
      make: true,
      costs: true,
      any: doc.parts.length > 0 || !!doc.treatment,
      says: `Build ${plural(doc.parts.length, 'page')}`,
    };
  }

  const known = new Set(files.map((f) => fileName(f).toLowerCase()));
  const claimed = new Set<number>();

  doc.parts.forEach((p, i) => {
    const a = pageOf(p.header, i, parts, claimed);
    if (a && !claimed.has(a.index)) {
      claimed.add(a.index);
      /* THE WORDS — only where the comp carries one and the two disagree.
         A key the comp does not carry is the page's own word showing. */
      const slots: Array<[string, string | null]> = [];
      for (const [k, v] of p.header) {
        if (ADDRESS_KEYS.has(k) || !(k in a.params)) continue;
        if (String(a.params[k] ?? '') !== String(v ?? '')) slots.push([k, v === null ? '' : String(v)]);
      }
      if (slots.length) steps.push({ kind: 'slots', page: a.index, slots });
      /* THE BRIEF — how the page should look. That is a worker's. A part with
         no record of its last run (a blank, or none) counts as built: only a
         brief that CHANGED from a known one is work, never an unknown one. */
      const last = lastBriefs[keys[i]!];
      if (last && last !== briefHash(p)) work.push(i);
      return;
    }
    /* A PART WITH NO PAGE. It names one the project already has → the comp
       simply draws it. Otherwise there is nothing to draw and a worker makes
       the page. */
    const page = headerValue(p.header, 'page');
    const src = typeof page === 'string' && page.trim() ? page.trim() : '';
    if (src && known.has(fileName(src).toLowerCase())) {
      steps.push({ kind: 'add', at: i, src, name: partName(p, i) });
    } else {
      work.push(i);
    }
  });

  /* A PAGE NO PART NAMES IS LEFT ALONE. A source that does not mention a page
     says nothing about it — it may simply not have been written down yet.
     A page leaves the comp only when a person removes its part (the panel does
     that as its own act, `removeCompPage`), never because it was not named. */

  /* RATED LOW — built, and not right yet. Counted apart from a changed brief
     so the line says which it is. */
  const briefed = work.length;
  for (const i of again) if (i >= 0 && i < doc.parts.length && !work.includes(i)) work.push(i);
  work.sort((a, b) => a - b);
  const passes = work.length - briefed;

  const order = compOrderFromSource(text, parts);
  const reorder = !!order && !order.every((o, k) => o === k);

  const counts = {
    words: steps.filter((s) => s.kind === 'slots').length,
    added: steps.filter((s) => s.kind === 'add').length,
    dropped: steps.filter((s) => s.kind === 'remove').length,
  };
  const said: string[] = [];
  if (counts.words) said.push(`${plural(counts.words, 'page')} reworded`);
  if (reorder) said.push('reordered');
  if (counts.added) said.push(`${plural(counts.added, 'page')} added`);
  if (counts.dropped) said.push(`${plural(counts.dropped, 'page')} dropped`);
  if (briefed) said.push(`${plural(briefed, 'part')} to build`);
  if (passes) said.push(`${plural(passes, 'part')} rated low, another pass`);
  const any = steps.length > 0 || reorder || work.length > 0;

  return {
    steps,
    reorder,
    work,
    make: false,
    costs: work.length > 0,
    any,
    says: said.length ? said.join(', ') : 'Everything matches',
  };
}

/**
 * The comp with every free step applied, or null when none of them changed it.
 * Order is applied by the caller afterwards, against the comp this returns —
 * adding and dropping pages moves the others, so the order has to be read
 * from what is there when it runs.
 */
export function applyPlan(comp: unknown, steps: readonly UpdateStep[]): unknown | null {
  let next: unknown = comp;
  let changed = false;
  /* Words first (they name pages by their current place), then pages dropped
     from the back, then pages added. */
  const order: UpdateStep['kind'][] = ['slots', 'remove', 'add'];
  for (const kind of order) {
    for (const step of steps) {
      if (step.kind !== kind) continue;
      const r =
        step.kind === 'slots'
          ? setCompSlots(next, step.page, step.slots)
          : step.kind === 'remove'
            ? removeCompPage(next, step.page)
            : addCompPage(next, step.at, step.src, step.name);
      if (r) {
        next = r;
        changed = true;
      }
    }
  }
  return changed ? next : null;
}
