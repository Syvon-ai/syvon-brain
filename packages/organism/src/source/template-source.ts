/**
 * A TEMPLATE'S SOURCE, BROUGHT INTO A PROJECT.
 *
 * A catalog template carries a source like any comp: what it is for, and one
 * part per page saying that page's job over its layout note. When a deck is
 * started from the template, that account comes along — otherwise the
 * project's deck opens with parts named "Cover" and "Stat" and nothing about
 * what each is for, which is exactly what the template knew.
 *
 * What comes along, and what does not:
 * - Each part's BODY (the page's job): into the project's part naming the same
 *   page (renamed as the copy renamed it), when that part has none of its own.
 * - The TEXT under the header: only when the project's source has none — the
 *   project's own words (the intent part that asked for the deck) come first.
 *   The template's `Best for:` line stays behind; it is for matching templates,
 *   not for describing this deck.
 * - Header rows: never. The words are the pages', and the pair keeps those.
 */

import { headerValue, parseSource, setHead, setPart, type SourceHeader } from './source-doc';
import { retargetSource } from './pair-open';

const BEST_FOR = /^\s*Best for:.*$/gim;

const fileName = (p: string) => p.replace(/\\/g, '/').split('/').pop() ?? p;

/**
 * WHERE A TEMPLATE'S SOURCE IS, from the `template:` an intent part names —
 * the spellings `use_template` takes: a catalog slug (`social.reels.reels` →
 * `catalog/templates/social/reels/reels.mdx`), or a path in the catalog or the
 * workspace, with or without its extension. Null when it names no deck.
 */
export function templateSourcePathFor(ref: string): string | null {
  const raw = ref.trim().replace(/\\/g, '/').replace(/^\/+/, '');
  if (!raw) return null;
  if (/^[a-z0-9_-]+(\.[a-z0-9_-]+){2,}$/i.test(raw) && !/\.(comp|seq|mdx)$/i.test(raw)) {
    return `catalog/templates/${raw.split('.').join('/')}.mdx`;
  }
  if (/^(catalog\/)?templates\/.+/i.test(raw)) return `${raw.replace(/\.(comp|seq|mdx)$/i, '')}.mdx`;
  return null;
}

/**
 * THE TEMPLATE'S WORDS STILL IN THE DECK — the parts of a deck's source whose
 * words are exactly the template's sample words for the same page. A deck
 * made from a template and never written for its project says "Built for
 * What Comes Next" to everyone; this is how that is caught before it is called
 * done. A slot whose sample is empty or a `{placeholder}` is not counted, and
 * neither is a word the project happened to keep on purpose when others on
 * the same part changed.
 */
export function sampleWordsLeft(
  deckSource: string,
  templateSource: string,
): Array<{ part: number; name: string; slots: string[] }> {
  const sample = new Map<string, SourceHeader>();
  for (const p of parseSource(templateSource).parts) {
    const page = headerValue(p.header, 'page') ?? headerValue(p.header, 'shot');
    if (typeof page === 'string') sample.set(fileName(page.trim()).toLowerCase(), p.header);
  }
  const out: Array<{ part: number; name: string; slots: string[] }> = [];
  parseSource(deckSource).parts.forEach((p, i) => {
    const page = headerValue(p.header, 'page') ?? headerValue(p.header, 'shot');
    if (typeof page !== 'string') return;
    const tpl = sample.get(fileName(page.trim()).toLowerCase());
    if (!tpl) return;
    const words = p.header.filter(([k]) => !['name', 'page', 'shot', 'comp', 'template'].includes(k));
    const worded = words.filter(([, v]) => typeof v === 'string' && v.trim() && !/^\{[^}]*\}$/.test(v.trim()));
    if (!worded.length) return;
    const same = worded.filter(([k, v]) => String(headerValue(tpl, k) ?? '').trim() === String(v).trim()).map(([k]) => k);
    /* Every worded slot still the template's: the part was never written. */
    if (same.length === worded.length) out.push({ part: i, name: String(headerValue(p.header, 'name') ?? `Part ${i + 1}`), slots: same });
  });
  return out;
}

/**
 * A TEMPLATE'S ACCOUNT OF ITSELF, WRITTEN INTO ITS SOURCE — at the moment it
 * is saved, by whoever saves it. `purpose` (what it is for, when a sibling
 * fits better) becomes the text under the header, with `bestFor` as its
 * `Best for:` line; each `pageJobs` entry (keyed by page file or stem) becomes
 * the first line of the part naming that page. Words and header rows are left
 * as they are. Anything not given is left as it was.
 */
export function describeTemplateSource(
  text: string,
  about: { title?: string; purpose?: string; bestFor?: readonly string[]; pageJobs?: Readonly<Record<string, string>> },
): string {
  let next = text;
  const purpose = about.purpose?.trim();
  const best = (about.bestFor ?? []).map((b) => b.trim()).filter(Boolean);
  if (about.title?.trim()) next = setHead(next, { title: about.title.trim() });
  if (purpose || best.length) {
    const old = parseSource(next).treatment.replace(BEST_FOR, '').trim();
    const body = [purpose || old, best.length ? `Best for: ${best.join(', ')}` : ''].filter(Boolean).join('\n\n');
    next = setHead(next, { treatment: body });
  }
  const jobs = new Map<string, string>();
  for (const [k, v] of Object.entries(about.pageJobs ?? {})) {
    if (v?.trim()) jobs.set(fileName(k).toLowerCase().replace(/\.(dsgn|design)$/i, ''), v.trim());
  }
  if (jobs.size) {
    parseSource(next).parts.forEach((p, i) => {
      const page = headerValue(p.header, 'page') ?? headerValue(p.header, 'shot');
      if (typeof page !== 'string') return;
      const job = jobs.get(fileName(page.trim()).toLowerCase().replace(/\.(dsgn|design)$/i, ''));
      if (!job || p.body.trim().startsWith(job)) return;
      next = setPart(next, i, { body: p.body.trim() ? `${job}\n${p.body.trim()}` : job });
    });
  }
  return next;
}

/**
 * The project's source with the template's account folded in. `project` null:
 * the project has none yet, so the template's, pointed at `compFile`. `renames`:
 * template page name → the name the copy took (a clash renamed it).
 */
export function withTemplateSource(
  project: string | null,
  template: string,
  compFile: string,
  renames: ReadonlyMap<string, string> = new Map(),
): string {
  const tpl = parseSource(template);
  const treatment = tpl.treatment.replace(BEST_FOR, '').trim();
  /* The template's parts by the page they will have in the project. */
  const jobs = new Map<string, string>();
  for (const p of tpl.parts) {
    const page = headerValue(p.header, 'page');
    if (typeof page !== 'string' || !p.body.trim()) continue;
    const name = fileName(page.trim());
    jobs.set((renames.get(name) ?? name).toLowerCase(), p.body);
  }

  if (project === null) {
    let text = retargetSource(template, compFile);
    text = setHead(text, { treatment });
    parseSource(text).parts.forEach((p, i) => {
      const page = headerValue(p.header, 'page');
      if (typeof page !== 'string') return;
      const name = fileName(page.trim());
      const renamed = renames.get(name);
      if (renamed && renamed !== name) {
        text = setPart(text, i, { header: p.header.map(([k, v]) => (k === 'page' ? [k, renamed] : [k, v])) });
      }
    });
    return text;
  }

  let text = project;
  const doc = parseSource(text);
  if (!doc.treatment.trim() && treatment) text = setHead(text, { treatment });
  parseSource(text).parts.forEach((p, i) => {
    const page = headerValue(p.header, 'page');
    if (typeof page !== 'string') return;
    const job = jobs.get(fileName(page.trim()).toLowerCase());
    if (!job) return;
    /* Empty, or only the page's own layout note (what a source written from
       the pages holds, and what the template's part keeps under its job):
       the template's part says more. Anything else is somebody's words. */
    const own = p.body.trim();
    if (!own || (own !== job.trim() && job.includes(own))) text = setPart(text, i, { body: job });
  });
  return text;
}
