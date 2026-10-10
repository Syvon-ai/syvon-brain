/**
 * THE PAIR, WHATEVER HAPPENED WHILE NOBODY WAS LOOKING.
 *
 * `afterPairWrite` keeps a comp and its source in step at every write that
 * goes through a door that calls it. Some writes do not: a comp made by a raw
 * storage put, a file that arrived through sync, an edit on disk while Studio
 * was closed. Hooking each of those is a list that is never finished. So the
 * pair is also settled when it is OPENED — the half written last leads, the
 * same rule a write follows, and a pair already in step writes nothing.
 *
 * And a comp MOVED or COPIED takes its source with it: the pair is a naming
 * rule (same stem), so a comp renamed alone loses its source, and a copy of a
 * comp starts with no source at all. `companionOf` says what goes along.
 */

import { afterPairWrite, joinIntent, pairOf, type PairIO } from './after-write';
import { headerValue, parseSource, removePart, serializeSource, setPart, withHeaderValue } from './source-doc';
import { isProjectSourceText, partIndexForComp, projectCompOf, projectSourcePathFor } from './project-source';

export interface PairOpenIO extends PairIO {
  /** When the file was last written (ms since epoch), or null when it is not there. */
  modified(path: string): Promise<number | null>;
}

/**
 * Settle a pair on open. Resolves to the half it wrote, or null — nothing to
 * do, one half missing, or the two already agree. Never throws.
 */
export async function settlePair(io: PairOpenIO, path: string): Promise<'comp' | 'source' | null> {
  const pair = pairOf(path);
  if (!pair) return null;
  try {
    const [comp, source] = await Promise.all([io.modified(pair.comp), io.modified(pair.source)]);
    if (comp == null || source == null) return null;
    /* THE LATER WRITE LEADS. A tie is the comp's: it is what is drawn, and a
       source that disagrees with it at the same instant is the one to follow. */
    return await afterPairWrite(io, source > comp ? pair.source : pair.comp);
  } catch {
    return null;
  }
}

/**
 * What goes along when `from` moves (or is copied) to `to`: the other half of
 * its pair, to the other half of the new name. Null when `from` is not half of
 * a pair, or the move is not one a pair can follow (a comp becoming a source).
 */
export function companionOf(from: string, to: string): { from: string; to: string } | null {
  const a = pairOf(from);
  const b = pairOf(to);
  if (!a || !b || a.kind !== b.kind) return null;
  return a.kind === 'comp' ? { from: a.source, to: b.source } : { from: a.comp, to: b.comp };
}

/**
 * A source that followed its comp to a new name says the new name: its
 * `comp:` line, when it has one, names the comp it is now beside. The rest of
 * the file is untouched.
 */
export function retargetSource(text: string, compFile: string): string {
  const doc = parseSource(text);
  if (typeof headerValue(doc.frontmatter, 'comp') !== 'string') return text;
  const raw = doc.frontmatterRaw.replace(/^comp:.*$/m, `comp: ${compFile}`);
  return raw === doc.frontmatterRaw ? text : serializeSource({ ...doc, frontmatterRaw: raw });
}

/* ── one level up: the project's intent ─────────────────────────────────── */

/**
 * THE INTENT FOLLOWS ITS COMPS. A comp renamed in its project keeps its part,
 * which now names the new file; a comp deleted (`to` null) or moved to another
 * project leaves this one's intent, and joins the other's. A comp MADE joins
 * already (`joinIntent`, on creation). Resolves to whether the intent changed.
 * Never throws.
 */
export async function intentAfterMove(io: PairIO, from: string, to: string | null): Promise<boolean> {
  try {
    const a = projectCompOf(from);
    if (!a) return false;
    const { projectRel, file: oldFile } = a;
    const b = to ? projectCompOf(to) : null;
    const intentPath = projectSourcePathFor(projectRel);
    const text = await io.read(intentPath);
    if (text == null || !isProjectSourceText(text)) return b ? joinIntent(io, to!) : false;
    const i = partIndexForComp(parseSource(text), oldFile);
    if (b && b.projectRel === projectRel) {
      if (i < 0) return false;
      /* The new name may have joined already — a write of a new comp does
         that (`joinIntent`). The part it had keeps its place; the one that
         just joined at the end goes, so the comp is named once. */
      let next = text;
      let at = i;
      const joined = partIndexForComp(parseSource(next), b.file);
      if (joined >= 0 && joined !== at) {
        next = removePart(next, joined);
        if (joined < at) at -= 1;
      }
      const part = parseSource(next).parts[at]!;
      await io.write(intentPath, setPart(next, at, { header: withHeaderValue(part.header, 'comp', b.file) }));
      return true;
    }
    if (i >= 0) await io.write(intentPath, removePart(text, i));
    if (b) await joinIntent(io, to!);
    return i >= 0;
  } catch {
    return false;
  }
}
