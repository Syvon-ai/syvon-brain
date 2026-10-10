/**
 * AFTER A WRITE — the one call every writer makes, whatever it writes with.
 *
 * A comp or its source was just written. Read the other one, reconcile the
 * pair (`reconcilePair`), and write what changed. Every write path in both apps
 * ends here — the agent's tool contexts (R2 and disk), Surface's storage gate,
 * Studio's file watcher — so the pair stays in step no matter who moved it:
 * the board, the panel, an agent, a worker, a person in another editor.
 *
 * Quiet by design: a file that is not half of a pair, a pair with only one
 * half, a comp that will not parse — all end here with nothing written. It
 * never throws; a writer's own write has already happened and must not fail
 * because the other half could not follow.
 *
 * Paths are whatever the store uses (a workspace-relative path, or a bucket
 * key with its workspace prefix): only the pairing and the folder are read
 * from them.
 */

import { addPart, compPathFor, headerValue, isSourceText, parseSource, setPart, sourcePathFor, withHeaderValue } from './source-doc';
import { reconcilePair } from './reconcile';
import { compPartsOf, humanStem, type CompPartAddress } from './comp-parts';
import { rewriteSource, sourceFromComp } from './source-run';
import { compOfPart, isProjectSourceText, projectCompOf, projectSourcePathFor, versionOfComp } from './project-source';

export interface PairIO {
  /** The file's text, or null when there is no such file. */
  read(path: string): Promise<string | null>;
  write(path: string, content: string): Promise<void>;
  /** Project files, for a part naming a page the comp does not draw yet. */
  list?(folder: string): Promise<string[]>;
}

export type PairFile = { kind: 'comp' | 'source'; comp: string; source: string } | null;

/** Is this path half of a comp/source pair? */
export function pairOf(path: string): PairFile {
  const p = path.replace(/\\/g, '/');
  if (/\.(comp|seq)$/i.test(p)) return { kind: 'comp', comp: p, source: sourcePathFor(p) };
  if (/\.mdx$/i.test(p)) return { kind: 'source', comp: compPathFor(p), source: p };
  return null;
}

const dirOf = (p: string) => p.replace(/\/[^/]*$/, '');

/**
 * Bring the other half in line with the file just written. Resolves to what
 * it wrote (`'comp' | 'source'`) or null.
 */
export async function afterPairWrite(
  io: PairIO,
  path: string,
  /** The content just written, when the caller has it — saves a read. */
  written?: string,
  /** `created`: the file did not exist before this write (a new comp). */
  opts?: { created?: boolean },
): Promise<'comp' | 'source' | null> {
  const pair = pairOf(path);
  if (!pair) return null;
  /* ONE LEVEL UP — a comp just MADE in a project that has an intent becomes
     one of its parts. Only on creation: a comp rewritten keeps whatever the
     intent says about it, so a part somebody removed stays removed. */
  if (pair.kind === 'comp' && opts?.created) await joinIntent(io, pair.comp);
  try {
    const [sourceText, compText] = await Promise.all([
      pair.kind === 'source' && written !== undefined ? written : io.read(pair.source),
      pair.kind === 'comp' && written !== undefined ? written : io.read(pair.comp),
    ]);
    /* A COMP IS NEVER WITHOUT ITS SOURCE. The first write of a comp that has
       none writes it — from the comp and its pages, as Write does — so every
       comp, however it was made, is half of a pair from then on. */
    if (pair.kind === 'comp' && sourceText == null && compText != null && !/(^|\/)intent\.mdx$/i.test(pair.source)) {
      return (await firstSourceFor(io, pair.comp, compText)) ? 'source' : null;
    }
    /* Both halves, and the .mdx really a comp's source — not the old
       script/v1, and not a PROJECT's source (`intent.mdx`), whose parts are
       comps rather than pages: a comp named `intent.comp` is not its pair. */
    if (sourceText == null || compText == null || !isSourceText(sourceText) || isProjectSourceText(sourceText)) return null;
    let comp: unknown;
    try {
      comp = JSON.parse(compText);
    } catch {
      return null;
    }
    const projectRel = dirOf(pair.comp);
    const files = pair.kind === 'source' && io.list ? await io.list(projectRel).catch(() => []) : undefined;
    /* The pages, when the source was written: a word changed for a slot the
       page holds is only seen against the page. */
    const pages = pair.kind === 'source' ? await pagesOf(io, compPartsOf(comp, pair.comp, projectRel)) : undefined;
    const out = reconcilePair({
      wrote: pair.kind,
      source: sourceText,
      comp,
      paths: { compRel: pair.comp, projectRel, ...(files ? { files } : {}), ...(pages ? { pages } : {}) },
    });
    if (out.comp !== undefined) {
      await io.write(pair.comp, JSON.stringify(out.comp, null, 2));
      return 'comp';
    }
    if (out.source !== undefined) {
      await io.write(pair.source, out.source);
      return 'source';
    }
    return null;
  } catch {
    return null;
  }
}

/** The pages a comp's parts draw, read — the words most pages keep in their own slots. */
async function pagesOf(io: PairIO, parts: readonly CompPartAddress[]): Promise<Record<string, string>> {
  const pages: Record<string, string> = {};
  const files = [...new Set(parts.map((p) => p.file).filter((f): f is string => !!f && PAGE.test(f)))];
  await Promise.all(
    files.map(async (f) => {
      const t = await io.read(f).catch(() => null);
      if (t != null) pages[f] = t;
    }),
  );
  return pages;
}

/** Write a comp's first source (`sourceFromComp`). Resolves to whether it wrote. */
async function firstSourceFor(io: PairIO, compPath: string, compText: string): Promise<boolean> {
  let comp: unknown;
  try {
    comp = JSON.parse(compText);
  } catch {
    return false;
  }
  const parts = compPartsOf(comp, compPath, dirOf(compPath));
  const name = compPath.replace(/\\/g, '/').split('/').pop() ?? compPath;
  await io.write(sourcePathFor(compPath), sourceFromComp(comp, name, parts, await pagesOf(io, parts)));
  return true;
}

const PAGE = /\.(dsgn|design)$/i;

/**
 * A PAGE WAS WRITTEN — the sources of the comps that draw it say what it says
 * now. A page keeps most of its words in its own slots, so a page edited by
 * hand (or by a tool that writes pages) changes what a comp says without the
 * comp being touched; its source follows here (`rewriteSource`: slot keys take
 * the page's words, the names and the Markdown stay the person's). Comps in
 * the page's own folder only — that is where a comp's pages live. Resolves to
 * the sources it wrote. Never throws.
 */
export async function afterPageWrite(io: PairIO, pagePath: string, written?: string): Promise<string[]> {
  const page = pagePath.replace(/\\/g, '/');
  if (!PAGE.test(page) || !io.list) return [];
  try {
    const folder = dirOf(page);
    const names = await io.list(folder);
    const text = written ?? (await io.read(page));
    if (text == null) return [];
    const out: string[] = [];
    for (const n of names) {
      if (!/\.(comp|seq)$/i.test(n)) continue;
      const compPath = `${folder}/${n.split('/').pop()}`;
      const compText = await io.read(compPath);
      if (compText == null) continue;
      let comp: unknown;
      try {
        comp = JSON.parse(compText);
      } catch {
        continue;
      }
      const parts = compPartsOf(comp, compPath, folder);
      if (!parts.some((p) => p.file === page)) continue;
      const sourcePath = sourcePathFor(compPath);
      const source = await io.read(sourcePath);
      if (source == null || !isSourceText(source) || isProjectSourceText(source)) continue;
      const next = rewriteSource(source, parts, { [page]: text });
      if (next !== source) {
        await io.write(sourcePath, next);
        out.push(sourcePath);
      }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * AFTER ANY WRITE — the one call a writer makes: a comp or a source → its
 * pair (`afterPairWrite`); a page → the sources of the comps that draw it
 * (`afterPageWrite`). Anything else, nothing.
 */
export async function afterWrite(io: PairIO, path: string, written?: string, opts?: { created?: boolean }): Promise<void> {
  if (pairOf(path)) await afterPairWrite(io, path, written, opts);
  else if (PAGE.test(path)) await afterPageWrite(io, path, written);
}

/**
 * A NEW COMP JOINS ITS PROJECT'S INTENT — a part naming it, added at the end,
 * when the project has an `intent.mdx` and no part names the comp yet. Only a
 * comp in the project folder or one of its version folders (`v2/`); one in any
 * other subfolder (an output, a template copy) is not one of the project's
 * compositions. Never throws.
 *
 * A NEW ROUND OF A PART IS STILL THAT PART. `v2/deck.comp` arriving where a
 * part names `deck.comp` or `v1/deck.comp` moves that part to the new round —
 * the intent names what the project delivers now, and the earlier round stays
 * on disk as the record. A part never moves back to an older round.
 */
export async function joinIntent(io: PairIO, compPath: string): Promise<boolean> {
  try {
    const at0 = projectCompOf(compPath);
    if (!at0) return false;
    const { projectRel, file } = at0;
    const intentPath = projectSourcePathFor(projectRel);
    const text = await io.read(intentPath);
    if (text == null || !isProjectSourceText(text)) return false;
    const doc = parseSource(text);
    if (doc.parts.some((p) => compOfPart(p) === file)) return false;
    const base = file.split('/').pop()!.toLowerCase();
    const earlier = doc.parts.findIndex((p) => {
      const c = compOfPart(p);
      return !!c && c.split('/').pop()!.toLowerCase() === base && versionOfComp(c) < versionOfComp(file);
    });
    if (earlier >= 0) {
      const p = doc.parts[earlier]!;
      await io.write(intentPath, setPart(text, earlier, { header: withHeaderValue(p.header, 'comp', file) }));
      return true;
    }
    /* A PART WAITING FOR IT — named like it and naming no comp yet (a Build
       whose worker made the comp before writing the part): that part is it. */
    const name = humanStem(file).toLowerCase();
    const waiting = doc.parts.findIndex((p) => !compOfPart(p) && String(headerValue(p.header, 'name') ?? '').trim().toLowerCase() === name);
    if (waiting >= 0) {
      const p = doc.parts[waiting]!;
      await io.write(intentPath, setPart(text, waiting, { header: withHeaderValue(p.header, 'comp', file) }));
      return true;
    }
    const added = addPart(text, humanStem(file));
    const at = parseSource(added).parts.length - 1;
    const part = parseSource(added).parts[at]!;
    await io.write(intentPath, setPart(added, at, { header: withHeaderValue(part.header, 'comp', file) }));
    return true;
  } catch {
    return false;
  }
}
