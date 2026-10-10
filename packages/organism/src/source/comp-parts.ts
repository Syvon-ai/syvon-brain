/**
 * WHAT EACH PART OF A SOURCE POINTS AT IN ITS COMP — and the first source a
 * comp gets, written from the comp itself.
 *
 * A part says which page it is (`page:`) or which shot (`shot:`); a part that
 * says neither is the comp's page N by position — the same structural address
 * every other editor uses (`studio-editor/cards/address.ts`: never a parser's
 * id, always what a person opening the file would count).
 *
 * ── THE PAGE ORDER IS THE COMP'S ──────────────────────────────────────────
 * Read by the same rule as `comp-pages.ts` in Studio and in Surface: a deck's
 * `items[]` in reading order, else the non-persistent video track's items by
 * `startTime`. Those two files must agree with each other and so must this;
 * it lives here because it is the one package both apps and the agent reach.
 */

export interface CompPartAddress {
  /** 0-based position, which is the part's number minus one. */
  index: number;
  /** What the comp calls it: the item's label, else its file's name. */
  label: string;
  /** What a task about this part targets — workspace-relative. */
  target: string;
  /** The part inside `target`, when the target is the comp itself. */
  at?: string;
  /** The words the page carries (`inlineShot.params` over `formatProps`). */
  params: Record<string, unknown>;
  /** The page's own file, workspace-relative — where its words live when the comp holds none. */
  file?: string;
  /** The page as the comp names it (`01-cover.dsgn`) — what a part's `page:` says. */
  src?: string;
  /** The shot's item id in a video comp — what a part's `shot:` says. */
  shot?: string;
}

interface RawItem {
  id?: unknown;
  label?: unknown;
  source?: unknown;
  params?: unknown;
  startTime?: number;
  inlineShot?: { templatePath?: unknown; params?: unknown; formatProps?: unknown };
}

interface RawTrack {
  id?: string;
  type?: string;
  persistent?: boolean;
  items?: RawItem[];
}

function pageItemsOf(comp: unknown): { items: RawItem[]; track: RawTrack | null } {
  const c = comp as { items?: RawItem[]; tracks?: RawTrack[] } | null;
  if (Array.isArray(c?.items) && c!.items.length) return { items: c!.items, track: null };
  const video = (c?.tracks ?? []).find((t) => (t?.type === 'video' || t?.id === 'video') && !t?.persistent) ?? null;
  const items = (video?.items ?? []).slice().sort((a, b) => (a?.startTime ?? 0) - (b?.startTime ?? 0));
  return { items, track: video };
}

function sourceOf(item: RawItem): string {
  if (typeof item?.inlineShot?.templatePath === 'string') return item.inlineShot.templatePath;
  return typeof item?.source === 'string' ? item.source : '';
}

/** Does this comp play in time (a video) rather than read as pages? */
export function isTimeComp(comp: unknown): boolean {
  const c = comp as { compositionType?: unknown; mode?: unknown } | null;
  if (typeof c?.compositionType === 'string') return c.compositionType === 'motion' || c.compositionType === 'social';
  return c?.mode === 'sequence';
}

/** `02-product_close.dsgn` → `02 product close`, first letter up. */
export function humanStem(file: string): string {
  const stem = (file.split('/').pop() ?? file).replace(/\.[a-z0-9]+$/i, '');
  const spaced = stem.replace(/[-_]+/g, ' ').trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : file;
}

/** A page's path as the comp wrote it, made workspace-relative. */
export function resolvePageFile(projectRel: string, src: string): string {
  const raw = src.replace(/\\/g, '/');
  const base = !raw.includes('/') || raw.startsWith('./') || raw.startsWith('../') ? `${projectRel}/${raw}` : raw;
  const out: string[] = [];
  for (const seg of base.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') out.pop();
    else out.push(seg);
  }
  return out.join('/');
}

/**
 * Every part of a comp, with what a task about it should target.
 *
 *   a VIDEO's shot   → the comp, at `track/item` (what the shot pads spell)
 *   a DECK's page    → the page's own file, when no other page shares it;
 *                      else the comp, at `page-N` — a change to a shared
 *                      layout would change every page built on it
 */
export function compPartsOf(comp: unknown, compRel: string, projectRel: string): CompPartAddress[] {
  const { items, track } = pageItemsOf(comp);
  const time = isTimeComp(comp);
  const sources = items.map(sourceOf);
  const uses = new Map<string, number>();
  for (const s of sources) if (s) uses.set(s, (uses.get(s) ?? 0) + 1);

  return items.map((item, index) => {
    const src = sources[index] ?? '';
    const label = partLabel(typeof item?.label === 'string' && item.label.trim() ? item.label : src, index);
    /* A deck page's `params` become its shot's params when it plays; a shot's
       own `inlineShot.params` win over both, as they do at render. */
    const params = {
      ...((item?.params ?? {}) as Record<string, unknown>),
      ...((item?.inlineShot?.formatProps ?? {}) as Record<string, unknown>),
      ...((item?.inlineShot?.params ?? {}) as Record<string, unknown>),
    };
    const file = {
      ...(src ? { file: resolvePageFile(projectRel, src), src } : {}),
      ...(typeof item?.id === 'string' ? { shot: item.id } : {}),
    };
    if (time && track?.id && typeof item?.id === 'string') {
      return { index, label, target: compRel, at: `${track.id}/${item.id}`, params, ...file };
    }
    /* THE PAGE FILE ONLY WHEN IT IS WHERE THE WORDS ARE. A comp that carries a
       page's words (`inlineShot.params`) draws them over the page's own — so a
       task on the page file changes text nobody sees. Then the comp, at the
       page, is the address: that is where the change has to land. */
    const carries = paramsToHeader(params).length > 0;
    if (!time && src && (uses.get(src) ?? 0) === 1 && !carries) {
      return { index, label, target: resolvePageFile(projectRel, src), params, ...file };
    }
    return { index, label, target: compRel, at: `page-${index + 1}`, params, ...file };
  });
}

/**
 * WHAT A PART IS CALLED IN ITS SOURCE — a name, not a file name.
 *
 * Comps often label an item with its file (`01-cover.dsgn`), and pages often
 * name themselves with their number (`01 — Cover`). The part's number is
 * already its position, so both come out as `Cover`.
 */
export function partLabel(raw: string, index = 0): string {
  const base = (raw.split('/').pop() ?? raw).replace(/\.(dsgn|design|react|component|png|jpe?g|webp|mp4|mov|webm)$/i, '');
  const bare = base.replace(/^\s*\d+\s*[—–\-_.:)]*\s*/, '').replace(/[-_]+/g, ' ').trim();
  return bare ? bare.charAt(0).toUpperCase() + bare.slice(1) : `Part ${index + 1}`;
}

/* ── the words a page already says ─────────────────────────────────────── */

export interface DesignWords {
  /** The page's `@name`, when its header gives one. */
  name: string | null;
  /** The page's `@description`, as one line, without its slot list. */
  description: string | null;
  /** `data-slot` → the words (or the file's path) in it, in the order they appear. */
  slots: Array<[string, string]>;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function textOf(inner: string): string {
  return inner
    .replace(/\{\s*(["'`])([\s\S]*?)\1\s*\}/g, '$2')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#?\w+);/g, (m, e: string) =>
      e.startsWith('#') ? String.fromCharCode(Number(e.slice(1).replace(/^x/i, '0x'))) : ENTITIES[e] ?? m,
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The words a `.dsgn` page carries in its own slots — what a comp's params do
 * not hold when the words were written into the page itself.
 */
export function designWords(dsgn: string): DesignWords {
  const header = dsgn.match(/^\s*<!--([\s\S]*?)-->/)?.[1] ?? '';
  const tag = (key: string) => header.match(new RegExp(`@${key}:\\s*([\\s\\S]*?)(?=\\n\\s*@\\w+:|$)`))?.[1]?.replace(/\s+/g, ' ').trim() || null;
  /* The slot list closes a page's description by convention (`Slots: a, b..3.`);
     it is for the author, and its `..` ranges defeat any sentence rule. */
  const description = tag('description')?.replace(/\s*Slots:.*$/i, '').trim() || null;

  const slots: Array<[string, string]> = [];
  const seen = new Set<string>();
  /* Text slots: `<Text … data-slot="x" …>words</Text>`. */
  const text = /<Text\b([^>]*\bdata-slot=["']([^"']+)["'][^>]*)>([\s\S]*?)<\/Text>/g;
  /* Media slots: a self-closing element with a slot and a `src`. */
  const media = /<(\w+)\b([^>]*\bdata-slot=["']([^"']+)["'][^>]*)\/>/g;
  const found: Array<{ at: number; key: string; value: string }> = [];
  for (const m of dsgn.matchAll(text)) {
    const value = textOf(m[3] ?? '');
    if (value) found.push({ at: m.index ?? 0, key: m[2]!, value });
  }
  for (const m of dsgn.matchAll(media)) {
    const src = m[2]?.match(/\bsrc=["']([^"']+)["']/)?.[1];
    if (src && !src.startsWith('data:')) found.push({ at: m.index ?? 0, key: m[3]!, value: src });
  }
  for (const f of found.sort((a, b) => a.at - b.at)) {
    if (seen.has(f.key)) continue;
    seen.add(f.key);
    slots.push([f.key, f.value]);
  }
  return { name: tag('name'), description, slots };
}

/** A page's own words that are text, as header values: `headline` → `Bring…`. */
export function paramsToHeader(params: Record<string, unknown>): Array<[string, string]> {
  return Object.entries(params).flatMap(([k, v]) => (typeof v === 'string' && v.trim() ? [[k, v.trim()] as [string, string]] : []));
}

/** The comp's own name and description, for a source's head. */
export function compMeta(comp: unknown): { label: string | null; description: string | null } {
  const meta = (comp as { meta?: { label?: unknown; description?: unknown } } | null)?.meta;
  return {
    label: typeof meta?.label === 'string' && meta.label.trim() ? meta.label.trim() : null,
    description: typeof meta?.description === 'string' && meta.description.trim() ? meta.description.trim() : null,
  };
}
