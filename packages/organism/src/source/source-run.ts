/**
 * RUN — a source, or one part of it, becomes a task.
 *
 * The press is the person's, so the task is the person's: the same shape a
 * task filed from the work bar has (`CardFiling`), through the same door in
 * each app. Nothing here writes; it says what to write.
 *
 *   Run      the part (or the whole comp) is built to say what its section says
 *   Realign  the cheap one: words, order and timing only — generate nothing,
 *            replace no media. Power 1.
 *
 * A WHOLE RUN IS ONE TASK. One worker builds the comp in order, which keeps the
 * parts consistent with each other and the board at one line per press.
 *
 * WHICH PAGE A PART IS: its `page:` (or a video's `shot:`) when it names one
 * the comp has, else its position. Naming wins so that moving a part in the
 * source does not quietly point its task at a different page.
 *
 * The worker is told where the source is and, for a part, exactly which lines
 * (`evidence.files` as `path:from-to`, the form the queue prompt already
 * teaches). The section is quoted too, so the task still says what was asked
 * if the source changes after it was filed.
 */

import { filingActionKind, type CardFiling } from '../cards/card-filing';
import type { CardPower } from '../cards/card-types';
import { compMeta, designWords, humanStem, paramsToHeader, partLabel, type CompPartAddress } from './comp-parts';
import {
  addPart,
  headerValue,
  newSource,
  parseSource,
  partHash,
  partName,
  reorderParts,
  setHead,
  setPart,
  withHeaderValue,
  type SourceHeader,
  type SourcePart,
} from './source-doc';

export type SourceRunMode = 'run' | 'realign';

export interface SourceRunInput {
  /** The source's text as it is now. */
  text: string;
  /** Workspace-relative path of the source. */
  sourceRel: string;
  /** Workspace-relative path of the comp; null when it has not been made yet. */
  compRel: string | null;
  /** Workspace-relative project folder — where a comp that does not exist lands. */
  projectRel: string;
  /** The comp's parts (`compPartsOf`); empty when there is no comp. */
  parts: CompPartAddress[];
  /** The whole source, or one part by its 0-based position. */
  scope: 'whole' | number;
  mode: SourceRunMode;
}

const REALIGN =
  'Realign only: change words, order and timing to match the source. Generate nothing, replace no media, add no new pages.';

const fileName = (rel: string) => rel.split('/').pop() ?? rel;

/** The comp part a source part is about: named by `page:`/`shot:`, else by position. */
export function addressFor(part: Pick<SourcePart, 'header'>, index: number, parts: readonly CompPartAddress[]): CompPartAddress | undefined {
  const page = headerValue(part.header, 'page');
  if (typeof page === 'string' && page.trim()) {
    const want = page.trim().replace(/\\/g, '/');
    const hit = parts.find((p) => p.src === want || (p.file && (p.file === want || fileName(p.file) === fileName(want))));
    if (hit) return hit;
  }
  /* One level up: a PROJECT's part is a composition, named by `comp:` the way
     a comp's part names its page. */
  const comp = headerValue(part.header, 'comp');
  if (typeof comp === 'string' && comp.trim()) {
    const want = fileName(comp.trim().replace(/\\/g, '/'));
    const hit = parts.find((p) => p.src === want || (p.file && fileName(p.file) === want));
    if (hit) return hit;
  }
  /* …and ONLY by it. A project's part that names no comp is a composition not
     made yet, never whichever comp happens to sit at its position — that would
     point a new deliverable at somebody else's work. */
  if (parts.length && parts.every((p) => /\.(comp|seq)$/i.test(p.src ?? ''))) return undefined;
  const shot = headerValue(part.header, 'shot');
  if (typeof shot === 'string' && shot.trim()) {
    const want = shot.trim();
    const hit = parts.find((p) => p.shot === want || p.at === want);
    if (hit) return hit;
  }
  return parts[index];
}

/** A part's text, as quoted into a task. Long sections are cut, never dropped. */
function quoted(part: SourcePart, cap = 1800): string {
  const text = part.raw.trim();
  return text.length > cap ? `${text.slice(0, cap).trimEnd()}\n[… the rest is in the source]` : text;
}

/** The task a Run (or Realign) press files, or null when there is nothing to run. */
export function sourceFilingFor(input: SourceRunInput): CardFiling | null {
  const doc = parseSource(input.text);
  const realign = input.mode === 'realign';
  const power: CardPower | undefined = realign ? 1 : undefined;
  const head = realign ? `${REALIGN}\n\n` : '';
  const readFirst =
    `The source is \`${input.sourceRel}\` — read all of it first: its header and treatment are the brief for every part, ` +
    `each part's YAML header holds its facts (the keys are the page's slots), and the Markdown under it says the rest.`;

  /* NOTHING TO BUILD INTO: the comp is made from the source. */
  if (!input.compRel) {
    if (realign) return null;
    const named = headerValue(doc.frontmatter, 'comp');
    const compName = typeof named === 'string' && named ? named : fileName(input.sourceRel).replace(/\.mdx$/i, '.comp');
    return {
      target: input.projectRel,
      kind: filingActionKind('make'),
      instruction: `Make \`${input.projectRel}/${compName}\` from its source, one page or shot per part, in order.\n\n${readFirst}`,
      urgency: 3,
      files: [input.sourceRel],
    };
  }

  if (input.scope === 'whole') {
    if (!doc.parts.length && !doc.treatment) return null;
    const list = doc.parts.map((p, i) => `${i + 1}. ${partName(p, i)}`).join('\n');
    return {
      target: input.compRel,
      kind: 'change',
      instruction:
        `${head}Build \`${fileName(input.compRel)}\` from its source, part by part, in order` +
        (doc.parts.length !== input.parts.length
          ? ` — the source has ${doc.parts.length} parts and the comp ${input.parts.length} pages, so add or remove pages to match`
          : '') +
        `.\n\n${readFirst}` +
        (list ? `\n\nParts:\n${list}` : ''),
      urgency: 3,
      ...(power ? { power } : {}),
      files: [input.sourceRel],
    };
  }

  const i = input.scope;
  const part = doc.parts[i];
  if (!part) return null;
  const where = `${input.sourceRel}:${part.line}-${part.lineEnd}`;
  const address = addressFor(part, i, input.parts);
  const name = partName(part, i);
  const section = quoted(part);

  /* A PART THE COMP DOES NOT HAVE YET — added after the page before it. */
  if (!address) {
    if (realign) return null;
    return {
      target: input.compRel,
      kind: 'change',
      instruction:
        `Add part ${i + 1}, "${name}", to \`${fileName(input.compRel)}\` after page ${i}, built from this section of its source:\n\n${section}\n\n${readFirst}`,
      urgency: 3,
      files: [where],
    };
  }

  return {
    target: address.target,
    ...(address.at ? { at: address.at } : {}),
    kind: 'change',
    instruction:
      `${head}Make "${name}" — page ${address.index + 1} of \`${fileName(input.compRel)}\` — say what this section of its source says:\n\n${section}\n\n${readFirst}` +
      /* WHERE THE WORDS LIVE. The comp's own copy is what is drawn, so an edit
         to the page file alone changes nothing on screen. */
      (Object.keys(address.params).length
        ? `\n\nThe comp carries this page's words itself (its item's \`inlineShot.params\`) and those are what is drawn: change them there — edit_sequence set_slot, or edit_piece — not only in \`${address.src ?? 'the page file'}\`.`
        : ''),
    urgency: 3,
    ...(power ? { power } : {}),
    files: [where],
  };
}

/* ── Live ──────────────────────────────────────────────────────────────── */

/** One fingerprint per part, in order — what Live compares against. */
export function partHashes(text: string): string[] {
  return parseSource(text).parts.map(partHash);
}

/**
 * The parts that changed since the last run: a part whose fingerprint is not
 * the one recorded for its position. A part added at the end is a change; a
 * part removed is not something Live can run.
 */
export function changedParts(text: string, last: readonly string[]): number[] {
  return partHashes(text).flatMap((h, i) => (last[i] === h ? [] : [i]));
}

/* ── the first source a comp gets ──────────────────────────────────────── */

/**
 * A source written FROM a comp: its name and description on top, then one
 * part per page — named, pointed at its page, its slots as header keys with
 * the words they hold, and how the page looks as the Markdown under them. So
 * a comp made before sources existed explains itself the moment one is asked
 * for.
 */
export function sourceFromComp(
  comp: unknown,
  compName: string,
  parts: CompPartAddress[],
  /**
   * The pages' own files, by workspace path (`CompPartAddress.file`) — read by
   * the host. A page usually keeps its words in its own slots rather than in
   * the comp, so without these most parts would come out as names alone.
   */
  pages: Record<string, string> = {},
): string {
  const meta = compMeta(comp);
  return newSource({
    comp: compName,
    title: meta.label ?? humanStem(compName),
    treatment: meta.description ?? '',
    parts: parts.map((p) => {
      const page = p.file && pages[p.file] ? designWords(pages[p.file]!) : null;
      const header: SourceHeader = [['name', page?.name ? partLabel(page.name, p.index) : p.label]];
      if (p.at && p.shot && p.at.endsWith(`/${p.shot}`)) header.push(['shot', p.shot]);
      else if (p.src) header.push(['page', p.src]);
      /* The comp's words win: they are what this comp puts on the page. */
      const own = paramsToHeader(p.params);
      const have = new Set(own.map(([k]) => k));
      header.push(...own);
      for (const [key, value] of page?.slots ?? []) if (!have.has(key)) header.push([key, value]);
      return { header, body: page?.description ?? '' };
    }),
  });
}

/* ── rewrite: the comp's words, back into the source ───────────────────── */

/** The header facts a comp part says today: its page (or shot) and its slot words. */
function wordsOf(p: CompPartAddress, pages: Record<string, string>): { name: string; header: SourceHeader; description: string | null } {
  const page = p.file && pages[p.file] ? designWords(pages[p.file]!) : null;
  const header: SourceHeader = [];
  if (p.at && p.shot && p.at.endsWith(`/${p.shot}`)) header.push(['shot', p.shot]);
  else if (p.src) header.push(['page', p.src]);
  const own = paramsToHeader(p.params);
  const have = new Set(own.map(([k]) => k));
  header.push(...own);
  for (const [key, value] of page?.slots ?? []) if (!have.has(key)) header.push([key, value]);
  return { name: page?.name ? partLabel(page.name, p.index) : p.label, header, description: page?.description ?? null };
}

/**
 * REWRITE ONE PART FROM ITS PAGE — the other direction from Run.
 *
 * After the comp moved (a worker built it, someone edited a page by hand), the
 * source should say what is there now. Each slot key the page has takes the
 * page's words; every other key, the name and the Markdown are the person's
 * and stay as they are (an empty body takes the page's description).
 */
export function rewritePart(
  text: string,
  index: number,
  parts: readonly CompPartAddress[],
  pages: Record<string, string> = {},
): string {
  const doc = parseSource(text);
  const part = doc.parts[index];
  const address = part ? addressFor(part, index, parts) : undefined;
  if (!part || !address) return text;
  const now = wordsOf(address, pages);
  let header = part.header.length ? part.header : ([['name', now.name]] as SourceHeader);
  for (const [k, v] of now.header) header = withHeaderValue(header, k, v);
  const body = part.body.trim() ? part.body : now.description ?? '';
  return setPart(text, index, { header, body });
}

/**
 * THE FIRST SHAPE, RETIRED — a source written before parts were set off by
 * lines: no `title` in its header, a `# Title` line opening the treatment,
 * then one `## Part` section per page. Read with today's rules all of that is
 * treatment, so a rewrite would add the parts BELOW it and the source would
 * say everything twice. Recognised by that exact signature (only the first
 * generator wrote it), its title moves into the header and its `##` sections
 * go — the rewrite that follows puts every page back as a part.
 */
export function isLegacySource(text: string): boolean {
  /* The signature is the treatment itself: an opening `# Title` line and `##`
     sections under it. A source already half-rewritten carries a `title:` in
     its header as well, and is the same shape underneath. */
  return /^# .+\n[\s\S]*^## /m.test(parseSource(text).treatment) && /^# /.test(parseSource(text).treatment);
}

export function upgradeLegacy(text: string): string {
  if (!isLegacySource(text)) return text;
  const doc = parseSource(text);
  const lines = doc.treatment.split('\n');
  const had = headerValue(doc.frontmatter, 'title');
  const title = typeof had === 'string' && had.trim() ? had : lines[0]!.replace(/^#\s+/, '').trim();
  const firstPart = lines.findIndex((l) => /^## /.test(l));
  const treatment = lines.slice(1, firstPart < 0 ? undefined : firstPart).join('\n').trim();
  return setHead(text, { title, treatment });
}

/**
 * REWRITE THE WHOLE SOURCE FROM THE COMP — every part refreshed as above, a
 * part added for every page no part names yet, in the comp's order. The
 * treatment and parts the comp does not have are left alone.
 */
export function rewriteSource(
  text: string,
  parts: readonly CompPartAddress[],
  pages: Record<string, string> = {},
): string {
  let next = upgradeLegacy(text);
  const n = parseSource(text).parts.length;
  for (let i = 0; i < n; i += 1) next = rewritePart(next, i, parts, pages);
  const doc = parseSource(next);
  const named = new Set(doc.parts.map((p, i) => addressFor(p, i, parts)?.index).filter((x): x is number => x !== undefined));
  for (const p of parts) {
    if (named.has(p.index)) continue;
    const now = wordsOf(p, pages);
    next = addPart(next, now.name);
    const last = parseSource(next).parts.length - 1;
    next = setPart(next, last, { header: [['name', now.name], ...now.header], body: now.description ?? '' });
  }
  return next;
}

/* ── the comp was reordered: the source follows ────────────────────────── */

/**
 * THE SOURCE IN THE COMP'S ORDER — after pages were moved on the board.
 *
 * Every part is matched to its page by what it names (`shot:` for a video,
 * `page:` for a deck). Pages that share one layout name the same file, so
 * they are matched in the order they appear — one part per page, first come
 * first served. A part that names no page stays with the part above it. The
 * text of every part travels with it, byte for byte: only their order changes.
 *
 * Called when the COMP's order changes, never merely because the two orders
 * differ — a person may order the source their own way until the comp moves.
 */
export function orderLikeComp(text: string, parts: readonly CompPartAddress[]): string {
  const doc = parseSource(text);
  if (doc.parts.length < 2 || !parts.length) return text;
  const used = new Set<number>();
  const ranks: Array<number | null> = doc.parts.map((p) => {
    const shot = headerValue(p.header, 'shot');
    const page = headerValue(p.header, 'page');
    let hit: CompPartAddress | undefined;
    if (typeof shot === 'string' && shot.trim()) {
      const want = shot.trim();
      hit = parts.find((c) => !used.has(c.index) && (c.shot === want || c.at === want));
    }
    if (!hit && typeof page === 'string' && page.trim()) {
      const want = page.trim().replace(/\\/g, '/');
      hit = parts.find(
        (c) => !used.has(c.index) && (c.src === want || (!!c.file && (c.file === want || fileName(c.file) === fileName(want)))),
      );
    }
    if (!hit) return null;
    used.add(hit.index);
    return hit.index;
  });
  if (ranks.every((r) => r === null)) return text;
  /* A part naming no page rides just behind the one above it. */
  let last = -1;
  const keyed = ranks.map((r, i) => {
    if (r === null) return { i, rank: last + 0.5 + i / 1e6 };
    last = r;
    return { i, rank: r };
  });
  const order = keyed.sort((a, b) => a.rank - b.rank || a.i - b.i).map((k) => k.i);
  return reorderParts(text, order);
}

/** The comp's page order, as a comparable string — what `orderLikeComp` watches. */
export function compOrderKey(parts: readonly CompPartAddress[]): string {
  return parts.map((p) => p.shot ?? p.src ?? '').join('|');
}

/* ── what Live watches: the brief, not the words ───────────────────────── */

/**
 * A part's BRIEF — its name and the Markdown under it: what a worker is
 * needed for. The header's slot words are not in it: they reach the page on
 * their own (`setCompSlots`, as they are typed), and counting them made every
 * keystroke in a row a change for Live to hand to an agent.
 */
export function briefHash(part: Pick<SourcePart, 'header' | 'body'>): string {
  const name = headerValue(part.header, 'name');
  return partHash({ header: [['name', typeof name === 'string' ? name : '']], body: part.body });
}

export function briefHashes(text: string): string[] {
  return parseSource(text).parts.map(briefHash);
}

/** The parts whose brief changed since the last run — what Live files. */
export function changedBriefs(text: string, last: readonly string[]): number[] {
  return briefHashes(text).flatMap((h, i) => (last[i] === h ? [] : [i]));
}
