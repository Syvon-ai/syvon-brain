/**
 * A COMP AND ITS SOURCE, KEPT IN STEP — whoever wrote last.
 *
 * The pair is one piece said two ways, and either can be written by anyone: a
 * person in the panel or on the board, an agent's tool, a worker. So the sync
 * does not live in a panel that may be closed; it lives here, and every place
 * that writes either file calls it with the file it just wrote. It returns the
 * OTHER file as it should now be, or null when that one already agrees.
 *
 *   the source was written   the comp takes its words (the keys it carries),
 *                            the pages it names that the comp lacks, and its
 *                            order among the pages it names
 *   the comp was written     the source takes the comp's order, the comp's
 *                            words for every key a page carries, and a part
 *                            for every page it did not have
 *
 * What neither side can infer, it leaves: a page the source does not name is
 * not dropped, and a part whose page is gone is not deleted — both are a
 * person's act. The prose under a part is never touched by the comp.
 *
 * Converges: applied to its own output it changes nothing, so a write it
 * causes, reconciled in turn, stops there.
 */

import { addCompPage, compOrderFromSource, permuteCompPages, setCompSlots, ADDRESS_KEYS } from './comp-sync';
import { compPartsOf, designWords, paramsToHeader, type CompPartAddress } from './comp-parts';
import { addPart, headerValue, parseSource, setPart, withHeaderValue, type SourceHeader } from './source-doc';
import { orderLikeComp } from './source-run';

const fileName = (rel: string) => rel.split('/').pop() ?? rel;

/** Which page of the comp a part is, by what it names — never by position. */
function named(header: SourceHeader, parts: readonly CompPartAddress[], used: Set<number>): CompPartAddress | undefined {
  const shot = headerValue(header, 'shot');
  if (typeof shot === 'string' && shot.trim()) {
    return parts.find((p) => !used.has(p.index) && (p.shot === shot.trim() || p.at === shot.trim()));
  }
  const page = headerValue(header, 'page');
  if (typeof page === 'string' && page.trim()) {
    const want = page.trim().replace(/\\/g, '/');
    return parts.find(
      (p) => !used.has(p.index) && (p.src === want || (!!p.file && (p.file === want || fileName(p.file) === fileName(want)))),
    );
  }
  return undefined;
}

export interface PairPaths {
  compRel: string;
  projectRel: string;
  /** The project's files, for a part that names a page the comp lacks. */
  files?: readonly string[];
  /** The pages' own text, by `CompPartAddress.file` — for a slot whose words
   *  the page holds and the comp does not override yet. */
  pages?: Readonly<Record<string, string>>;
}

/** THE SOURCE WAS WRITTEN — the comp as it should now be, or null. */
export function compFollowingSource(text: string, comp: unknown, paths: PairPaths): unknown | null {
  if (!comp || typeof comp !== 'object') return null;
  const doc = parseSource(text);
  let next: unknown = comp;
  let changed = false;
  const take = (r: unknown | null) => {
    if (r) {
      next = r;
      changed = true;
    }
  };

  /* WORDS: every key the comp carries for a page the part names. */
  let parts = compPartsOf(next, paths.compRel, paths.projectRel);
  const used = new Set<number>();
  for (const p of doc.parts) {
    const a = named(p.header, parts, used);
    if (!a) continue;
    used.add(a.index);
    const slots: Array<[string, string | null]> = [];
    /* A slot the page holds and the comp does not override: changed in the
       source, the comp overrides it — the comp's words win, so that is where
       a word changed for this comp goes (the page stays as it is). */
    const onPage = a.file && paths.pages?.[a.file] ? new Map(designWords(paths.pages[a.file]!).slots) : null;
    for (const [k, v] of p.header) {
      if (ADDRESS_KEYS.has(k)) continue;
      if (k in a.params) {
        if (String(a.params[k] ?? '') !== String(v ?? '')) slots.push([k, v === null ? '' : String(v)]);
      } else if (onPage?.has(k) && String(onPage.get(k) ?? '') !== String(v ?? '')) {
        slots.push([k, v === null ? '' : String(v)]);
      }
    }
    if (slots.length) take(setCompSlots(next, a.index, slots));
  }

  /* PAGES the source names that the comp does not draw yet, and the project
     has: the comp draws them, where the part sits. */
  const known = new Set((paths.files ?? []).map((f) => fileName(f).toLowerCase()));
  parts = compPartsOf(next, paths.compRel, paths.projectRel);
  const have = new Set(parts.flatMap((p) => [p.src, p.file].filter(Boolean).map((f) => fileName(f!).toLowerCase())));
  doc.parts.forEach((p, i) => {
    const page = headerValue(p.header, 'page');
    if (typeof page !== 'string' || !page.trim()) return;
    const key = fileName(page.trim()).toLowerCase();
    if (have.has(key) || !known.has(key)) return;
    take(addCompPage(next, i, page.trim(), typeof headerValue(p.header, 'name') === 'string' ? (headerValue(p.header, 'name') as string) : undefined));
    have.add(key);
  });

  /* ORDER among the pages it names; the rest keep their places. */
  parts = compPartsOf(next, paths.compRel, paths.projectRel);
  const order = compOrderFromSource(text, parts);
  if (order) take(permuteCompPages(next, order));

  return changed ? next : null;
}

/** THE COMP WAS WRITTEN — the source as it should now be, or null. */
export function sourceFollowingComp(text: string, comp: unknown, paths: PairPaths): string | null {
  if (!comp || typeof comp !== 'object') return null;
  const parts = compPartsOf(comp, paths.compRel, paths.projectRel);
  if (!parts.length) return null;
  let next = text;

  /* ORDER: the parts take the comp's. */
  next = orderLikeComp(next, parts);

  /* WORDS: for every page a part names, the comp's words — a key it carries
     is written, whether the part had it or not. */
  let doc = parseSource(next);
  const used = new Set<number>();
  doc.parts.forEach((p, i) => {
    const a = named(p.header, parts, used);
    if (!a) return;
    used.add(a.index);
    let header = p.header;
    for (const [k, v] of paramsToHeader(a.params)) {
      if (String(headerValue(header, k) ?? '') !== v) header = withHeaderValue(header, k, v);
    }
    if (header !== p.header) next = setPart(next, i, { header });
  });

  /* PAGES the source has no part for: a part, where the page sits, naming it
     and carrying its words. Its prose is left for the person to write. */
  doc = parseSource(next);
  const seen = new Set<number>();
  for (const p of doc.parts) {
    const a = named(p.header, parts, seen);
    if (a) seen.add(a.index);
  }
  for (const a of parts) {
    if (seen.has(a.index)) continue;
    const header: SourceHeader = [
      ['name', a.label],
      a.at && a.shot && a.at.endsWith(`/${a.shot}`) ? ['shot', a.shot] : ['page', a.src ?? ''],
      ...paramsToHeader(a.params),
    ];
    /* Just after the last part naming a page that comes before it in the comp;
       first, when none does. */
    const cur = parseSource(next);
    const walk = new Set<number>();
    let at = 0;
    cur.parts.forEach((p, i) => {
      const b = named(p.header, parts, walk);
      if (!b) return;
      walk.add(b.index);
      if (b.index < a.index) at = i + 1;
    });
    next = addPart(next, a.label, at);
    next = setPart(next, at, { header, body: '' });
    seen.add(a.index);
  }

  return next !== text ? next : null;
}

/**
 * The one call a writer makes: it just wrote `wrote`; here is the other file
 * as it should now be. `{}` when nothing needs writing.
 */
export function reconcilePair(input: {
  wrote: 'source' | 'comp';
  source: string;
  comp: unknown;
  paths: PairPaths;
}): { source?: string; comp?: unknown } {
  if (input.wrote === 'source') {
    const comp = compFollowingSource(input.source, input.comp, input.paths);
    return comp ? { comp } : {};
  }
  const source = sourceFollowingComp(input.source, input.comp, input.paths);
  return source !== null ? { source } : {};
}
