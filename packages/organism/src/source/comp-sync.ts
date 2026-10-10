/**
 * THE SOURCE IS THE RECORD — and the comp follows it, without a worker, for
 * the two things a source says that need no judgement:
 *
 *   a slot's words   a header key's value is that page's `data-slot` — written
 *                    straight into the comp's own copy of the page's words
 *   the order        the parts' order is the pages' order
 *
 * The prose under a part is a brief — how it should look — and still goes to a
 * worker by Run. Everything here is pure: it takes a comp and gives back the
 * comp to write, or null when there is nothing it can do safely.
 *
 * ── WHERE A PAGE'S WORDS LIVE ────────────────────────────────────────────
 * Per page, on the comp: a video's shot keeps them in `inlineShot.params`, a
 * deck's page in `params` (the parser turns those into the shot's params when
 * it plays). Written there and only there — never into the page's own design
 * file, which a layout shared by several pages would pass to all of them.
 */

import type { CompPartAddress } from './comp-parts';
import { parseSource, headerValue } from './source-doc';

type Item = Record<string, unknown> & { inlineShot?: Record<string, unknown>; params?: Record<string, unknown>; startTime?: number };
type Track = { id?: string; type?: string; persistent?: boolean; items?: Item[] };

/** Keys in a part's header that say which part it is, not what a page says. */
export const ADDRESS_KEYS = new Set(['name', 'page', 'shot', 'comp']);

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** The page-bearing items of a comp, in its reading order — the live objects. */
function pageItemsOf(comp: Record<string, unknown>): { list: Item[]; track: Track | null } {
  const items = comp.items as Item[] | undefined;
  if (Array.isArray(items) && items.length) return { list: items, track: null };
  const tracks = (comp.tracks as Track[] | undefined) ?? [];
  const video = tracks.find((t) => (t?.type === 'video' || t?.id === 'video') && !t?.persistent) ?? null;
  const list = (video?.items ?? []).slice().sort((a, b) => (a?.startTime ?? 0) - (b?.startTime ?? 0));
  return { list, track: video };
}

/**
 * One slot of one page, set on the comp. `value` null removes the comp's own
 * copy, so the page's own words show again.
 */
export function setCompSlots(
  comp: unknown,
  pageIndex: number,
  slots: ReadonlyArray<[string, string | null]>,
): unknown | null {
  if (!comp || typeof comp !== 'object' || !slots.length) return null;
  const next = clone(comp) as Record<string, unknown>;
  const item = pageItemsOf(next).list[pageIndex];
  if (!item) return null;
  const onShot = !!item.inlineShot;
  const bag = { ...((onShot ? item.inlineShot!.params : item.params) as Record<string, unknown> | undefined) };
  let changed = false;
  for (const [key, value] of slots) {
    if (ADDRESS_KEYS.has(key)) continue;
    if (value === null) {
      if (key in bag) {
        delete bag[key];
        changed = true;
      }
    } else if (bag[key] !== value) {
      bag[key] = value;
      changed = true;
    }
  }
  if (!changed) return null;
  if (onShot) item.inlineShot = { ...item.inlineShot!, params: bag };
  else item.params = bag;
  return next;
}

/**
 * The comp's pages in a new order — `order[k]` is the page (by its current
 * place) that goes k-th. A deck's list is reordered. A video's timeline keeps
 * its slots — each keeps its start and length — and the shots move through
 * them, the same rule a drag on the board follows (`comp-pages.reorderPages`).
 */
export function permuteCompPages(comp: unknown, order: readonly number[]): unknown | null {
  if (!comp || typeof comp !== 'object') return null;
  const next = clone(comp) as Record<string, unknown>;
  const { list, track } = pageItemsOf(next);
  if (order.length !== list.length || new Set(order).size !== order.length || order.some((o) => !list[o])) return null;
  if (order.every((o, k) => o === k)) return null;
  if (!track) {
    next.items = order.map((o) => list[o]!);
    return next;
  }
  const slots = list.map((it) => ({ startTime: it.startTime, duration: (it as { duration?: number }).duration }));
  const moved = order.map((o, k) => {
    const it = { ...list[o]! };
    const slot = slots[k]!;
    if (slot.startTime !== undefined) it.startTime = slot.startTime;
    if (slot.duration !== undefined) (it as { duration?: number }).duration = slot.duration;
    return it;
  });
  track.items = moved;
  return next;
}

/**
 * The comp's page order the source asks for: its parts matched to pages (by
 * `shot:`, then `page:`; pages sharing a layout in order of appearance).
 *
 * PARTIAL IS FINE. The pages the source names are put in the source's order,
 * in the places those pages already hold; a page it does not name keeps its
 * own place. So a source still missing a page can reorder all the others.
 * Null when fewer than two pages are named — nothing to order.
 */
export function compOrderFromSource(text: string, parts: readonly CompPartAddress[]): number[] | null {
  const doc = parseSource(text);
  const used = new Set<number>();
  const named: number[] = [];
  const fileName = (rel: string) => rel.split('/').pop() ?? rel;
  for (const p of doc.parts) {
    const shot = headerValue(p.header, 'shot');
    const page = headerValue(p.header, 'page');
    let hit: CompPartAddress | undefined;
    if (typeof shot === 'string' && shot.trim()) {
      hit = parts.find((c) => !used.has(c.index) && (c.shot === shot.trim() || c.at === shot.trim()));
    }
    if (!hit && typeof page === 'string' && page.trim()) {
      const want = page.trim().replace(/\\/g, '/');
      hit = parts.find(
        (c) => !used.has(c.index) && (c.src === want || (!!c.file && (c.file === want || fileName(c.file) === fileName(want)))),
      );
    }
    if (!hit) continue;
    used.add(hit.index);
    named.push(hit.index);
  }
  if (named.length < 2) return null;
  /* The slots the named pages occupy, in the comp's order, refilled in the
     source's order; every other page stays where it is. */
  const slots = [...named].sort((a, b) => a - b);
  const order = parts.map((p) => p.index);
  slots.forEach((slot, k) => {
    order[slot] = named[k]!;
  });
  return order;
}

/* ── adding and removing pages ─────────────────────────────────────────── */

/** Put a page into the comp at `at`, drawn from `src`. Null when it cannot. */
export function addCompPage(comp: unknown, at: number, src: string, label?: string): unknown | null {
  if (!comp || typeof comp !== 'object' || !src) return null;
  const next = clone(comp) as Record<string, unknown>;
  const { list, track } = pageItemsOf(next);
  const where = Math.max(0, Math.min(at, list.length));
  if (!track) {
    const items = (next.items as Item[] | undefined) ?? [];
    items.splice(where, 0, { source: src, ...(label ? { label } : {}) });
    next.items = items;
    return next;
  }
  /* A video's shot needs a place in time: it takes the length of the one it
     follows and everything after it moves along by that much. */
  const prev = list[Math.max(0, where - 1)];
  const duration = (prev as { duration?: number } | undefined)?.duration ?? 4;
  const startTime = prev ? (prev.startTime ?? 0) + duration : 0;
  const item: Item = {
    id: `shot-${Math.random().toString(36).slice(2, 8)}`,
    startTime,
    duration,
    ...(label ? { label } : {}),
    source: src,
    inlineShot: { $schema: 'shot/v1', templateType: 'design', templatePath: src, params: {} },
  };
  const items = (track.items ?? []).slice();
  const after = items.filter((it) => (it.startTime ?? 0) >= startTime);
  for (const it of after) it.startTime = (it.startTime ?? 0) + duration;
  items.push(item);
  track.items = items.sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0));
  return next;
}

/**
 * Take a page out of the comp. The page's FILE is left where it is — the comp
 * says what is in the piece, and a design nothing draws is still a design.
 */
export function removeCompPage(comp: unknown, pageIndex: number): unknown | null {
  if (!comp || typeof comp !== 'object') return null;
  const next = clone(comp) as Record<string, unknown>;
  const { list, track } = pageItemsOf(next);
  const gone = list[pageIndex];
  if (!gone) return null;
  if (!track) {
    next.items = list.filter((_, i) => i !== pageIndex);
    return next;
  }
  const duration = (gone as { duration?: number }).duration ?? 0;
  const from = gone.startTime ?? 0;
  track.items = (track.items ?? [])
    .filter((it) => it !== gone)
    .map((it) => ((it.startTime ?? 0) > from ? { ...it, startTime: (it.startTime ?? 0) - duration } : it));
  return next;
}
