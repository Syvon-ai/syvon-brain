/**
 * THE PROJECT'S SOURCE — one intent, and the compositions that fulfil it.
 *
 * The comp source (`source-doc.ts`) one level up — the SAME schema, the same
 * panel, the same mental model: a YAML header, the Markdown under it, then one
 * PART per composition set off by a `---` line. Where a comp's source says
 * `comp:` in its header and `page:` in its parts, a project's says `project:`
 * and `comp:`. It lives at the project's root as `intent.mdx`:
 *
 *   ---
 *   $schema: source/v1
 *   project: weekly-ideas
 *   title: Share my ideas every week
 *   type: social
 *   timing: weekly
 *   ---
 *   Turn my latest ideas into useful social content that shows what Syvon
 *   can do. From [my September notes](notes/ideas-sep.md).
 *
 *   ---
 *   name: LinkedIn deck
 *   comp: linkedin-deck.comp
 *   ---
 *   - What Syvon does, in five slides
 *   - Close on the demo
 *
 * The Markdown under the header is the INTENT. Each part is one composition;
 * its `comp:` names the file, so renaming the part or moving it never points
 * it at another comp (the rule `page:` keeps inside a comp source). A part
 * with no `comp:` is a deliverable that has not been made yet. The body holds
 * the SUBPARTS — what the comp should carry — as the person wrote them.
 *
 * ── THE SAME READER AS A COMP SOURCE ──────────────────────────────────────
 * Parsing and every edit (`setPart`, `movePart`, `addPart`…) are the comp
 * source's own: the file is the person's, so an edit touches only what it
 * edits. What is here is what differs one level up — the schema, the path,
 * the first draft from the comps a project already has, and the links.
 *
 * ── THE INPUTS ARE LINKS, AND LINKS HEAL ──────────────────────────────────
 * Material the intent draws on is linked where it is mentioned, as plain
 * Markdown links into the project. A file that moved is found again by its
 * name (`healLinks`), so a link breaks only when the file is really gone.
 *
 * Pure, dependency-free, and the same on a server and in a browser.
 */

import { filingActionKind, type CardFiling } from '../cards/card-filing';
import type { CompPartAddress } from './comp-parts';
import { addressFor } from './source-run';
import { SOURCE_SCHEMA, addPart, headerValue, parseSource, partName, partRaw, setHeadRows, setPart, writeHeader, type SourceDoc, type SourceHeader } from './source-doc';

/** The first drafts were written under a schema of their own; still read. */
export const PROJECT_SOURCE_SCHEMA = 'project-source/v1';
/** The project source's file name, at the project's root. */
export const PROJECT_SOURCE_FILE = 'intent.mdx';

/** `projects/x` → `projects/x/intent.mdx`. */
export function projectSourcePathFor(projectRel: string): string {
  return `${projectRel.replace(/\/+$/, '')}/${PROJECT_SOURCE_FILE}`;
}

/** Is this text a project source (and not a comp's)? A `source/v1` that
 *  names a `project:`, or a first draft under the old schema. */
export function isProjectSourceText(text: string): boolean {
  const fm = parseSource(text).frontmatter;
  const schema = headerValue(fm, '$schema');
  return schema === PROJECT_SOURCE_SCHEMA || (schema === SOURCE_SCHEMA && headerValue(fm, 'project') !== undefined);
}

/**
 * THE PROJECT'S PARTS, AS THE PANEL ADDRESSES THEM — one per composition, in
 * the project's order: what `page:` is to a comp's part, `comp:` is here (see
 * `addressFor`). A task about one targets the comp itself.
 */
export function projectPartsOf(
  projectRel: string,
  comps: readonly { name: string; label: string }[],
): CompPartAddress[] {
  const root = projectRel.replace(/\/+$/, '');
  return comps.map((c, index) => ({
    index,
    label: c.label,
    target: `${root}/${c.name}`,
    params: {},
    file: `${root}/${c.name}`,
    src: c.name,
  }));
}

/**
 * A COMP'S PLACE IN ITS PROJECT. A project's compositions sit in its folder or
 * in one of its version folders — `projects/x/v2/` is the second round of `x`,
 * not another project — and a part names one by that project-relative path:
 * `deck.comp`, `v2/deck.comp`. Any other sub-folder (`output/`, `sessions/`, a
 * template copy) holds no composition of the project's. Null for a path that is
 * not a project comp.
 */
const PROJECT_COMP_PATH = /^(.*(?:^|\/)projects\/[^/]+)\/((?:v\d+\/)?[^/]+\.(?:comp|seq))$/i;

export function projectCompOf(path: string): { projectRel: string; file: string } | null {
  const m = path.replace(/\\/g, '/').match(PROJECT_COMP_PATH);
  return m ? { projectRel: m[1]!, file: m[2]! } : null;
}

/** The round a project-relative comp belongs to: `v3/deck.comp` → 3. A comp at
 *  the project's root is the first round — a flat project's files are its v1. */
export function versionOfComp(file: string): number {
  const m = file.match(/^v(\d+)\//i);
  return m ? Number(m[1]) : 1;
}

/** The comp file a part is — project-relative, its version folder kept
 *  (`v2/deck.comp`) — or null when it has not been made yet. */
export function compOfPart(part: { header: SourceHeader }): string | null {
  const c = headerValue(part.header, 'comp');
  if (typeof c !== 'string' || !c.trim()) return null;
  const m = c.trim().replace(/\\/g, '/').match(/(?:^|\/)((?:v\d+\/)?[^/]+)$/i);
  return m ? m[1]! : null;
}

/** The part that is this comp, or -1. */
export function partIndexForComp(doc: SourceDoc, compName: string): number {
  return doc.parts.findIndex((p) => compOfPart(p) === compName);
}

/** The project's comps that no part names — made from chat, a template, or before the source. */
export function compsOutsideSource(text: string, compNames: readonly string[]): string[] {
  const named = new Set(parseSource(text).parts.map(compOfPart).filter((c): c is string => !!c));
  return compNames.filter((n) => !named.has(n));
}

export interface ProjectSourceComp {
  /** The comp's project-relative file, `linkedin-deck.comp` or `v2/linkedin-deck.comp`. */
  name: string;
  /** What the person calls it. */
  label: string;
  /** Its parts' names, in order — the subparts. */
  parts?: readonly string[];
}

function frontmatter(header: SourceHeader): string {
  return ['---', ...writeHeader(header), '---', ''].join('\n');
}

/**
 * WRITE — a first project source, from what the project already holds.
 *
 * The intent is whatever the person gave (or nothing yet: the file says so
 * and waits for it); one part per comp, in the order given, each naming its
 * file and listing its parts. Nothing is invented.
 */
export function projectSourceFromComps(opts: {
  /** The project's slug — what the header's `project:` names. */
  project?: string;
  title: string;
  intent?: string;
  type?: string;
  timing?: string;
  comps: readonly ProjectSourceComp[];
}): string {
  const fm: SourceHeader = [['$schema', SOURCE_SCHEMA], ['project', opts.project?.trim() || opts.title.trim()]];
  if (opts.title.trim()) fm.push(['title', opts.title.trim()]);
  if (opts.type?.trim()) fm.push(['type', opts.type.trim()]);
  if (opts.timing?.trim()) fm.push(['timing', opts.timing.trim()]);
  const parts = opts.comps.map((c) => ({
    header: [
      ['name', c.label.trim() || c.name.replace(/\.comp$/i, '')],
      ['comp', c.name],
    ] as SourceHeader,
    body: (c.parts ?? []).filter((p) => p.trim()).map((p) => `- ${p.trim()}`).join('\n'),
  }));
  const chunks = [opts.intent?.trim() ? `${opts.intent.trim()}\n` : ''];
  parts.forEach((p, i) => chunks.push(partRaw(p, i < parts.length - 1 ? '\n' : '')));
  return frontmatter(fm) + chunks.join('\n') + (parts.length ? '\n' : '');
}

/**
 * A SUGGESTED INTENT, written down — the catalog's starting projects
 * (`@syvon/catalog/intent-suggestions`) as a project source: its title and
 * timing in the header, what it is for under it, one part per composition with
 * its lines and the template it starts from (`template:` — the draft arrives
 * with its collection attached, and the match skips a part that names one).
 * `firstComp` is a comp the project already has (the deck a new
 * project is scaffolded with): the first part takes it.
 */
export function intentFromSuggestion(
  s: {
    title: string;
    intent: string;
    timing?: string;
    /** Story rows the suggestion already knows (a tone, a framework) — the rest the person or the strategist fills. */
    story?: Story;
    parts: ReadonlyArray<{ name: string; lines: readonly string[]; template?: string }>;
  },
  opts: { project: string; firstComp?: string | null },
): string {
  let text = projectSourceFromComps({
    project: opts.project,
    title: s.title,
    intent: s.intent,
    ...(s.timing ? { timing: s.timing } : {}),
    comps: [],
  });
  if (s.story) text = setStory(text, s.story);
  s.parts.forEach((p, i) => {
    text = addPart(text, p.name);
    const header: SourceHeader = [['name', p.name]];
    if (i === 0 && opts.firstComp) header.push(['comp', opts.firstComp]);
    if (p.template?.trim()) header.push(['template', p.template.trim()]);
    text = setPart(text, i, { header, body: p.lines.map((l) => `- ${l}`).join('\n') });
  });
  return text;
}

/* ── the story ─────────────────────────────────────────────────────────── */

/**
 * THE STORY — what every piece of the project says, in the intent's header.
 *
 * One message for the whole set, so a reel, a deck and a listing image say the
 * same thing: who it is for, the one thing to say, what backs it, the doubt to
 * answer, how it sounds, what to do next, the frame that orders it, and what
 * the pictures may cost. The strategist fills what the person left empty; each
 * piece's words are written from it.
 */
export const STORY_KEYS = ['audience', 'proposition', 'proof', 'objection', 'tone', 'cta', 'framework', 'media'] as const;
export type StoryKey = (typeof STORY_KEYS)[number];
export type Story = Partial<Record<StoryKey, string>>;

/** What each row asks, for an empty row's placeholder. */
export const STORY_HINTS: Record<StoryKey, string> = {
  audience: 'Who it is for',
  proposition: 'The one thing to say',
  proof: 'What backs it — facts, numbers, quotes',
  objection: 'The doubt to answer',
  tone: 'How it sounds',
  cta: 'What they should do next',
  framework: 'How the message is ordered (PAS, AIDA…)',
  media: 'placeholders · generate up to $N · empty = ask with one price',
};

/** The story rows the intent holds (empty ones absent). */
export function storyOf(text: string): Story {
  const fm = parseSource(text).frontmatter;
  const out: Story = {};
  for (const k of STORY_KEYS) {
    const v = headerValue(fm, k);
    if (typeof v === 'string' && v.trim()) out[k] = v.trim();
  }
  return out;
}

/** Set story rows; blank removes one. Nothing else in the file moves. */
export function setStory(text: string, patch: Story): string {
  const rows: Record<string, string | undefined> = {};
  for (const k of STORY_KEYS) if (k in patch) rows[k] = patch[k];
  return setHeadRows(text, rows);
}

/** The story rows still empty — what the strategist fills before building. `media` may stay empty. */
export function storyGaps(text: string): StoryKey[] {
  const s = storyOf(text);
  return STORY_KEYS.filter((k) => k !== 'media' && !s[k]);
}

/** A fingerprint of the story — when it moves, every built piece's words are due again. */
export function storyHash(text: string): string {
  const s = storyOf(text);
  const flat = STORY_KEYS.filter((k) => k !== 'media').map((k) => `${k}=${s[k] ?? ''}`).join('\n');
  let h = 5381;
  for (let i = 0; i < flat.length; i += 1) h = ((h << 5) + h + flat.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * THE STORY CHANGED — one task that rewrites the words of every piece the
 * intent has already made, from the story as it now reads. Null when no part
 * names a comp yet (Build makes them, from the story, in the first place).
 */
export function storyRewriteFilingFor(input: { text: string; sourceRel: string; projectRel: string }): CardFiling | null {
  const doc = parseSource(input.text);
  const made = doc.parts.flatMap((p, i) => (compOfPart(p) ? [{ p, i }] : []));
  if (!made.length) return null;
  const list = made.map(({ p, i }) => `- Part ${i + 1}, "${partName(p, i)}" — \`${input.projectRel}/${compOfPart(p)}\``).join('\n');
  return {
    target: input.projectRel,
    kind: filingActionKind('change'),
    instruction:
      `The story in this project's intent changed. Rewrite the words of every piece it has made, from the story as it now reads:\n\n${list}\n\n` +
      `The intent is \`${input.sourceRel}\` — read its header rows (audience, proposition, proof, objection, tone, cta, framework) and each part's lines. ` +
      `For each piece, write its words into its source's slot rows (\`<file>.mdx\` beside the comp) — the deck follows its source. Keep the layout; change words only. ` +
      `Then run validate on each: done when no piece still carries its template's sample words.`,
    urgency: 3,
    files: made.map(({ p }) => `${input.sourceRel}:${p.line}-${p.lineEnd}`),
  };
}

/* ── build ─────────────────────────────────────────────────────────────── */

/** The parts no comp answers to yet — the compositions still to make. */
export function partsToMake(text: string, parts: readonly CompPartAddress[]): number[] {
  return parseSource(text).parts.flatMap((p, i) => (addressFor(p, i, parts) ? [] : [i]));
}

/**
 * BUILD — the task that makes the compositions the intent names and the
 * project does not have yet. ONE task for all of them, so one worker makes
 * them side by side and keeps them consistent with each other and the intent.
 *
 * The worker names each comp on its part (`comp:`) BEFORE making it: a comp
 * made in the project joins the intent by itself, and a part that already
 * names it is how that does not add a second.
 */
export function intentFilingFor(input: {
  text: string;
  /** Workspace-relative path of `intent.mdx`. */
  sourceRel: string;
  projectRel: string;
  parts: readonly CompPartAddress[];
}): CardFiling | null {
  const doc = parseSource(input.text);
  const todo = partsToMake(input.text, input.parts);
  if (!todo.length) return null;
  const list = todo
    .map((i) => {
      const p = doc.parts[i]!;
      const lines = p.body.trim() ? `:\n${p.body.trim().replace(/^/gm, '    ')}` : '';
      return `- Part ${i + 1}, "${partName(p, i)}" (${input.sourceRel}:${p.line}-${p.lineEnd})${lines}`;
    })
    .join('\n');
  return {
    target: input.projectRel,
    kind: filingActionKind('make'),
    instruction:
      `Make the compositions this project's intent names and does not have yet, in \`${input.projectRel}\`:\n\n${list}\n\n` +
      `The intent is \`${input.sourceRel}\` — read all of it first: the Markdown under its header is what the project is for, and each part is one composition, the lines under it what that composition carries. ` +
      `For each part: choose its kind (a deck, a carousel, a video, a print piece) from the part and the intent; set \`comp: <file>.comp\` on that part in the intent FIRST, then make the comp, with its own source beside it (\`<file>.mdx\`, one part per line under the intent's part). Keep every other byte of the intent as it is.`,
    urgency: 3,
    files: todo.map((i) => `${input.sourceRel}:${doc.parts[i]!.line}-${doc.parts[i]!.lineEnd}`),
  };
}

/* ── links ─────────────────────────────────────────────────────────────── */

/** `[text](target)`, not an image's `![…](…)` sibling's text — both are links to heal. */
const LINK = /(!?\[[^\]\n]*\]\()([^)\s]+)(\s+"[^"\n]*")?\)/g;
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

/** The project-relative files a source links to, in order, once each. */
export function linkedFiles(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(LINK)) {
    const target = decodeTarget(m[2]!);
    if (!EXTERNAL.test(target) && !out.includes(target)) out.push(target);
  }
  return out;
}

function decodeTarget(t: string): string {
  try {
    return decodeURI(t).replace(/^\.\//, '');
  } catch {
    return t.replace(/^\.\//, '');
  }
}

const base = (p: string) => p.split('/').pop()!.toLowerCase();

/**
 * HEAL — every link to a file that is not there, pointed at the one file of
 * that name that is. `files` are the project's files, project-relative.
 *
 * Only an unambiguous match is taken: two files of the name leave the link as
 * it was, since guessing would quietly point the intent at the wrong material.
 * Returns the text unchanged (the same string) when nothing needed healing.
 */
export function healLinks(text: string, files: readonly string[]): { text: string; healed: Array<[string, string]>; broken: string[] } {
  const have = new Set(files);
  const byName = new Map<string, string[]>();
  for (const f of files) {
    const k = base(f);
    byName.set(k, [...(byName.get(k) ?? []), f]);
  }
  const healed: Array<[string, string]> = [];
  const broken: string[] = [];
  const next = text.replace(LINK, (all, open: string, raw: string, title: string | undefined) => {
    const target = decodeTarget(raw);
    /* `/assets/…` is rooted at the WORKSPACE — material filed outside the
       project (a dropped file lands in the brand kit). Not this list's to heal. */
    if (EXTERNAL.test(target) || target.startsWith('/') || have.has(target)) return all;
    const hits = byName.get(base(target)) ?? [];
    if (hits.length !== 1) {
      if (!broken.includes(target)) broken.push(target);
      return all;
    }
    const to = hits[0]!;
    healed.push([target, to]);
    return `${open}${encodeURI(to)}${title ?? ''})`;
  });
  return { text: healed.length ? next : text, healed, broken };
}
