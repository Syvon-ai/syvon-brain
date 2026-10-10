/**
 * A SOURCE — the Markdown document that says what one composition is.
 *
 * One per comp, beside it: `projects/x/launch.mdx` for `projects/x/launch.comp`
 * (the same stem is the link). The file's own YAML header names the comp; the
 * Markdown under it is the treatment. Then every PART — a page or a shot — is
 * set off by a `---` line, carries a small YAML header of its facts (its name,
 * its page, one key per slot), and says the rest in Markdown:
 *
 *   ---
 *   $schema: source/v1
 *   comp: "launch.comp"
 *   title: Product introduction
 *   ---
 *   What it is for, the tone, the references.
 *
 *   ---
 *   name: Opening
 *   page: 01-opening.dsgn
 *   headline: Bring your work to life.
 *   ---
 *   Slow push in on the product. Calm.
 *
 *   ---
 *   name: Demonstration
 *   ---
 *   One source, two results.
 *
 * The slide tools' convention (Slidev, Marp): lines separate, headers hold the
 * data, the body holds the words about it. The header is what a machine reads —
 * `headline` is the page's `data-slot="headline"` — and the body is what a
 * person writes.
 *
 * ── THE FILE IS THE PERSON'S, SO AN EDIT TOUCHES ONLY WHAT IT EDITS ─────────
 * Every part keeps its own raw text. Changing part 3 rewrites part 3 and hands
 * every other byte back exactly as it was read. Header lines this reader does
 * not understand (a nested list, say) are kept as they were written.
 *
 * Pure, dependency-free, and the same on a server and in a browser.
 */

export const SOURCE_SCHEMA = 'source/v1';
export const SOURCE_EXT = '.mdx';

export type SourceValue = string | number | boolean | null;
/** A YAML header, in the order it was written. */
export type SourceHeader = Array<[string, SourceValue]>;

export interface SourcePart {
  /** The part's facts — `name`, `page`, one key per slot. Empty when it has no header. */
  header: SourceHeader;
  /** Header lines this reader could not read, kept verbatim. */
  headerExtra: string[];
  /** The Markdown under the header. */
  body: string;
  /** The part's text exactly as it sits in the file, its `---` line included. */
  raw: string;
  /** 1-based line of the part's `---` in the whole file. */
  line: number;
  /** 1-based last line that belongs to the part (trailing blank lines excluded). */
  lineEnd: number;
}

export interface SourceDoc {
  /** The file's own header: `$schema`, `comp`, `title`, anything else. */
  frontmatter: SourceHeader;
  frontmatterExtra: string[];
  /** The `---` block as written, closing newline included; '' when there is none. */
  frontmatterRaw: string;
  /** `title` from the header, or '' when it has none. */
  title: string;
  /** The Markdown above the first part: the comp-level brief. */
  treatment: string;
  /** The text between the header and the first part, as written. Null when there is none. */
  headRaw: string | null;
  parts: SourcePart[];
}

/* ── paths ─────────────────────────────────────────────────────────────── */

/** `projects/x/launch.comp` → `projects/x/launch.mdx`. */
export function sourcePathFor(compPath: string): string {
  return compPath.replace(/\.(comp|seq)$/i, '') + SOURCE_EXT;
}

/** `projects/x/launch.mdx` → `projects/x/launch.comp`. */
export function compPathFor(sourcePath: string): string {
  return sourcePath.replace(/\.mdx$/i, '') + '.comp';
}

/** Is this text a source (and not the older `script/v1` beat list)? */
export function isSourceText(text: string): boolean {
  return headerValue(parseSource(text).frontmatter, '$schema') === SOURCE_SCHEMA;
}

/** One key of a header, or undefined. */
export function headerValue(header: SourceHeader, key: string): SourceValue | undefined {
  return header.find(([k]) => k === key)?.[1];
}

/** A header with one key set (added at the end when it is new), or removed with `undefined`. */
export function withHeaderValue(header: SourceHeader, key: string, value: SourceValue | undefined): SourceHeader {
  const i = header.findIndex(([k]) => k === key);
  if (value === undefined) return i < 0 ? header : header.filter((_, j) => j !== i);
  if (i < 0) return [...header, [key, value]];
  const next = header.slice();
  next[i] = [key, value];
  return next;
}

/** What a part is called: its `name`, else `Part N`. */
export function partName(part: Pick<SourcePart, 'header'>, index: number): string {
  const n = headerValue(part.header, 'name');
  return typeof n === 'string' && n.trim() ? n.trim() : `Part ${index + 1}`;
}

/* ── the YAML this file uses: flat keys, scalar values ─────────────────── */

const KEY = /^([A-Za-z_$][\w$.-]*)\s*:(?:\s(.*)|)$/;

function readScalar(raw: string): SourceValue {
  const t = raw.trim();
  if (t === '' || t === '~' || t === 'null') return t === '' ? '' : null;
  if (t.startsWith('"')) {
    try {
      return JSON.parse(t) as string;
    } catch {
      return t;
    }
  }
  if (t.startsWith("'") && t.endsWith("'") && t.length >= 2) return t.slice(1, -1).replace(/''/g, "'");
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  /* A plain scalar ends at a comment. */
  return t.replace(/\s+#.*$/, '');
}

/** Read a flat YAML block. What is not `key: scalar` or a `|` block is kept aside. */
export function parseHeader(lines: string[]): { header: SourceHeader; extra: string[] } {
  const header: SourceHeader = [];
  const extra: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const m = line.match(KEY);
    if (!m || /^\s/.test(line)) {
      extra.push(line);
      continue;
    }
    const key = m[1]!;
    const rest = (m[2] ?? '').trim();
    if (rest === '|' || rest === '|-' || rest === '>' || rest === '>-') {
      const block: string[] = [];
      while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]!) || !lines[i + 1]!.trim())) {
        block.push(lines[i + 1]!);
        i += 1;
      }
      const indent = Math.min(...block.filter((l) => l.trim()).map((l) => l.match(/^\s*/)![0].length));
      const text = block.map((l) => l.slice(Number.isFinite(indent) ? indent : 0)).join('\n').replace(/\n+$/, '');
      header.push([key, rest.startsWith('>') ? text.replace(/\n(?!\n)/g, ' ') : text]);
      continue;
    }
    if (rest === '' && i + 1 < lines.length && /^\s+(-|\w)/.test(lines[i + 1]!)) {
      /* A nested map or a list: not ours to read, so kept whole. */
      extra.push(line);
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1]!)) {
        extra.push(lines[i + 1]!);
        i += 1;
      }
      continue;
    }
    header.push([key, readScalar(rest)]);
  }
  return { header, extra };
}

const RESERVED = /^(true|false|null|yes|no|on|off|~|-?\d+(\.\d+)?)$/i;

function writeScalar(v: SourceValue): string {
  if (v === null) return 'null';
  if (typeof v !== 'string') return String(v);
  if (v === '') return '""';
  if (v.includes('\n')) return JSON.stringify(v);
  const plain =
    !RESERVED.test(v) &&
    !/^[\s\-?:,[\]{}#&*!|>'"%@`]/.test(v) &&
    !/\s$/.test(v) &&
    !/:(\s|$)/.test(v) &&
    !/\s#/.test(v);
  return plain ? v : JSON.stringify(v);
}

/** Write a flat header, one `key: value` per line, then the lines it could not read. */
export function writeHeader(header: SourceHeader, extra: string[] = []): string[] {
  return [...header.map(([k, v]) => `${k}: ${writeScalar(v)}`), ...extra];
}

/* ── parsing ───────────────────────────────────────────────────────────── */

const FENCE = /^\s*(```|~~~)/;
const RULE = (l: string) => l.trim() === '---';
const YAMLISH = (l: string) => KEY.test(l) || /^\s+\S/.test(l) || /^\s*#/.test(l) || /^\s*-\s/.test(l);

export function parseSource(input: string): SourceDoc {
  const text = input.replace(/\r\n/g, '\n');
  const lines = text.split('\n');

  /* THE FILE'S HEADER — a `---` block on the very first line. */
  let start = 0;
  let frontmatter: SourceHeader = [];
  let frontmatterExtra: string[] = [];
  let frontmatterRaw = '';
  if (RULE(lines[0] ?? '')) {
    const close = lines.findIndex((l, i) => i > 0 && RULE(l));
    if (close > 0 && lines.slice(1, close).every((l) => !l.trim() || YAMLISH(l))) {
      const read = parseHeader(lines.slice(1, close));
      frontmatter = read.header;
      frontmatterExtra = read.extra;
      start = close + 1;
      frontmatterRaw = lines.slice(0, start).join('\n') + (start < lines.length ? '\n' : '');
    }
  }

  /* THE PARTS — every top-level `---` from here on starts one. */
  const body = lines.slice(start);
  const seps: number[] = [];
  let fenced = false;
  for (let i = 0; i < body.length; i += 1) {
    const l = body[i]!;
    if (FENCE.test(l)) fenced = !fenced;
    if (fenced || !RULE(l)) continue;
    seps.push(i);
    /* A header right after the line is closed by the next `---`, which is
       therefore not a part of its own. */
    const close = body.findIndex((x, j) => j > i && RULE(x));
    if (close > i + 1 && body.slice(i + 1, close).every((x) => x.trim() && YAMLISH(x))) i = close;
  }

  const head = seps.length ? body.slice(0, seps[0]) : body;
  const parts: SourcePart[] = seps.map((s, n) => {
    const end = n + 1 < seps.length ? seps[n + 1]! : body.length;
    const chunk = body.slice(s, end);
    const close = chunk.findIndex((x, j) => j > 0 && RULE(x));
    const hasHeader = close > 1 && chunk.slice(1, close).every((x) => x.trim() && YAMLISH(x));
    const read = hasHeader ? parseHeader(chunk.slice(1, close)) : { header: [] as SourceHeader, extra: [] as string[] };
    const bodyLines = chunk.slice(hasHeader ? close + 1 : 1);
    let last = chunk.length;
    while (last > 1 && !chunk[last - 1]!.trim()) last -= 1;
    const line = start + s + 1;
    return {
      header: read.header,
      headerExtra: read.extra,
      body: bodyLines.join('\n').trim(),
      raw: chunk.join('\n'),
      line,
      lineEnd: line + last - 1,
    };
  });

  const title = headerValue(frontmatter, 'title');
  return {
    frontmatter,
    frontmatterExtra,
    frontmatterRaw,
    title: typeof title === 'string' ? title : '',
    treatment: head.join('\n').trim(),
    headRaw: seps.length ? (seps[0]! > 0 ? head.join('\n') : null) : body.length && body.join('\n') !== '' ? body.join('\n') : null,
    parts,
  };
}

/* ── writing ───────────────────────────────────────────────────────────── */

/** The file, from a doc whose raw pieces are current. */
export function serializeSource(doc: SourceDoc): string {
  const chunks: string[] = [];
  if (doc.headRaw !== null) chunks.push(doc.headRaw);
  for (const p of doc.parts) chunks.push(p.raw);
  return doc.frontmatterRaw + chunks.join('\n');
}

function tailOf(raw: string): string {
  return raw.match(/\n*$/)?.[0] ?? '';
}

/** A part's text, from its header and body. */
export function partRaw(part: Pick<SourcePart, 'header' | 'body'> & { headerExtra?: string[] }, tail = '\n'): string {
  const out = ['---'];
  const header = writeHeader(part.header, part.headerExtra ?? []);
  if (header.length) out.push(...header, '---');
  if (part.body.trim()) out.push(part.body.trim());
  return out.join('\n') + tail;
}

function frontmatterRawOf(header: SourceHeader, extra: string[]): string {
  return ['---', ...writeHeader(header, extra), '---', ''].join('\n');
}

/**
 * Keep the chunks apart: every chunk but the last ends on a blank line, so a
 * part moved or added from the end of the file does not run into the next.
 */
function separate(doc: SourceDoc): SourceDoc {
  const parts = doc.parts.map((p, i) =>
    i < doc.parts.length - 1 && !p.raw.endsWith('\n') ? { ...p, raw: p.raw + '\n' } : p,
  );
  const headRaw =
    doc.headRaw !== null && doc.headRaw !== '' && parts.length && !doc.headRaw.endsWith('\n') ? doc.headRaw + '\n' : doc.headRaw;
  return { ...doc, headRaw, parts };
}

const settle = (doc: SourceDoc): string => serializeSource(separate(doc));

/** Change one part. Every other part is handed back byte for byte. */
export function setPart(
  text: string,
  index: number,
  patch: Partial<Pick<SourcePart, 'header' | 'body'>>,
): string {
  const doc = parseSource(text);
  const cur = doc.parts[index];
  if (!cur) return text;
  const next = { ...cur, ...patch };
  const raw = partRaw(next, tailOf(cur.raw) || (index < doc.parts.length - 1 ? '\n' : ''));
  if (raw === cur.raw) return serializeSource(doc);
  const parts = doc.parts.slice();
  parts[index] = { ...next, raw };
  return settle({ ...doc, parts });
}

/** Change the title (in the file's header) or the treatment. The parts are not touched. */
export function setHead(text: string, patch: { title?: string; treatment?: string }): string {
  const doc = parseSource(text);
  let next = doc;
  if (patch.title !== undefined && patch.title !== doc.title) {
    const header = withHeaderValue(doc.frontmatter, 'title', patch.title.trim() || undefined);
    next = { ...next, frontmatter: header, frontmatterRaw: frontmatterRawOf(header, doc.frontmatterExtra) };
  }
  if (patch.treatment !== undefined && patch.treatment.trim() !== doc.treatment) {
    const t = patch.treatment.trim();
    /* No treatment still leaves a blank line before the first part. */
    next = { ...next, treatment: t, headRaw: t ? `${t}\n` : doc.parts.length ? '' : null };
  }
  return settle(next);
}

/**
 * Set rows in the file's header — any key but the schema. A value that is
 * `undefined` or blank removes the row; a new key goes at the end; every
 * other row, and anything the header holds that is not a flat row, is kept.
 * The treatment and the parts are not touched.
 */
export function setHeadRows(text: string, rows: Readonly<Record<string, string | undefined>>): string {
  const doc = parseSource(text);
  let header = doc.frontmatter;
  for (const [key, value] of Object.entries(rows)) {
    if (key === '$schema') continue;
    const v = value?.trim();
    header = withHeaderValue(header, key, v ? v : undefined);
  }
  if (header === doc.frontmatter) return text;
  const same = header.length === doc.frontmatter.length && header.every(([k, v], i) => k === doc.frontmatter[i]![0] && v === doc.frontmatter[i]![1]);
  if (same) return text;
  return settle({ ...doc, frontmatter: header, frontmatterRaw: frontmatterRawOf(header, doc.frontmatterExtra) });
}

export function movePart(text: string, from: number, to: number): string {
  const doc = parseSource(text);
  const n = doc.parts.length;
  if (from === to || from < 0 || to < 0 || from >= n || to >= n) return text;
  const parts = doc.parts.slice();
  const [moved] = parts.splice(from, 1);
  parts.splice(to, 0, moved!);
  return settle({ ...doc, parts });
}

/** The parts in a new order — `order[k]` is the old index of the part that goes k-th. */
export function reorderParts(text: string, order: readonly number[]): string {
  const doc = parseSource(text);
  if (order.length !== doc.parts.length || order.every((o, k) => o === k)) return text;
  if (new Set(order).size !== order.length || order.some((o) => !doc.parts[o])) return text;
  return settle({ ...doc, parts: order.map((o) => doc.parts[o]!) });
}

export function addPart(text: string, name: string, at?: number): string {
  const doc = parseSource(text);
  const parts = doc.parts.slice();
  const i = at === undefined ? parts.length : Math.max(0, Math.min(at, parts.length));
  const blank = { header: [['name', name]] as SourceHeader, headerExtra: [], body: '' };
  parts.splice(i, 0, { ...blank, raw: partRaw(blank, i < parts.length ? '\n' : ''), line: 0, lineEnd: 0 });
  return settle({ ...doc, parts });
}

export function removePart(text: string, index: number): string {
  const doc = parseSource(text);
  if (!doc.parts[index]) return text;
  return settle({ ...doc, parts: doc.parts.filter((_, i) => i !== index) });
}

/** A new source file. */
export function newSource(opts: {
  comp?: string;
  title: string;
  treatment?: string;
  parts: Array<{ header: SourceHeader; body: string }>;
}): string {
  const fm: SourceHeader = [['$schema', SOURCE_SCHEMA]];
  if (opts.comp) fm.push(['comp', opts.comp]);
  if (opts.title.trim()) fm.push(['title', opts.title.trim()]);
  const chunks: string[] = [];
  /* A blank line under the file's header even with no treatment, so its
     closing line and the first part's opening one do not read as one. */
  chunks.push(opts.treatment?.trim() ? `${opts.treatment.trim()}\n` : '');
  opts.parts.forEach((p, i) => chunks.push(partRaw(p, i < opts.parts.length - 1 ? '\n' : '')));
  return frontmatterRawOf(fm, []) + chunks.join('\n') + (opts.parts.length ? '\n' : '');
}

/* ── identity of a part's content, for Live ────────────────────────────── */

/** A short, stable fingerprint of what a part says. Spacing does not count. */
export function partHash(part: Pick<SourcePart, 'header' | 'body'>): string {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  const text = [...part.header.map(([k, v]) => `${k}=${String(v)}`), part.body].map(norm).join('\u0001');
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
