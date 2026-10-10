import { describe, expect, it } from 'vitest';
import { afterPageWrite, afterPairWrite, newSource, parseSource, partName } from './index';

function memory(files: Record<string, string>) {
  const writes: string[] = [];
  return {
    files,
    writes,
    io: {
      read: async (p: string) => files[p] ?? null,
      write: async (p: string, c: string) => {
        files[p] = c;
        writes.push(p);
      },
    },
  };
}

const COMP = JSON.stringify({ mode: 'deck', items: [{ source: 'a.dsgn', params: { h: 'A' } }, { source: 'b.dsgn', params: { h: 'B' } }] });
const SRC = newSource({
  title: 'T',
  parts: [
    { header: [['name', 'A'], ['page', 'a.dsgn'], ['h', 'A']], body: '' },
    { header: [['name', 'B'], ['page', 'b.dsgn'], ['h', 'B']], body: '' },
  ],
});

describe('afterPairWrite', () => {
  it('a written comp moves its source', async () => {
    const m = memory({ 'p/x.mdx': SRC });
    const moved = JSON.stringify({ mode: 'deck', items: [{ source: 'b.dsgn', params: { h: 'B' } }, { source: 'a.dsgn', params: { h: 'A' } }] });
    m.files['p/x.comp'] = moved;
    expect(await afterPairWrite(m.io, 'p/x.comp', moved)).toBe('source');
    expect(parseSource(m.files['p/x.mdx']!).parts.map((p, i) => partName(p, i))).toEqual(['B', 'A']);
    /* and the write it caused, seen in turn, stops there */
    expect(await afterPairWrite(m.io, 'p/x.mdx')).toBeNull();
  });

  it('a written source moves its comp', async () => {
    const m = memory({ 'p/x.comp': COMP });
    const text = SRC.replace('h: A', 'h: A!');
    m.files['p/x.mdx'] = text;
    expect(await afterPairWrite(m.io, 'p/x.mdx', text)).toBe('comp');
    expect(JSON.parse(m.files['p/x.comp']!).items[0].params.h).toBe('A!');
    expect(await afterPairWrite(m.io, 'p/x.comp')).toBeNull();
  });

  it('a comp with no source gets one — every comp is half of a pair', async () => {
    const m = memory({ 'p/x.comp': COMP, 'p/a.dsgn': '<!-- @slot h -->' });
    expect(await afterPairWrite(m.io, 'p/x.comp')).toBe('source');
    const doc = parseSource(m.files['p/x.mdx']!);
    expect(doc.parts.map((p) => p.header.find(([k]) => k === 'h')?.[1])).toEqual(['A', 'B']);
    /* and the source it wrote is in step: seen in turn, nothing more */
    expect(await afterPairWrite(m.io, 'p/x.mdx')).toBeNull();
    /* a source alone does not make a comp */
    const lone = memory({ 'p/y.mdx': SRC });
    expect(await afterPairWrite(lone.io, 'p/y.mdx')).toBeNull();
    expect(lone.writes).toEqual([]);
  });

  it('does nothing for other files, or for an old script', async () => {
    expect(await afterPairWrite(memory({}).io, 'p/x.dsgn')).toBeNull();
    const m = memory({ 'p/x.comp': COMP, 'p/x.mdx': '---\n$schema: script/v1\n---\n## Beat 1' });
    expect(await afterPairWrite(m.io, 'p/x.comp')).toBeNull();
    expect(m.writes).toEqual([]);
  });

  it('never throws', async () => {
    const io = { read: async () => { throw new Error('down'); }, write: async () => {} };
    expect(await afterPairWrite(io, 'p/x.comp')).toBeNull();
  });
});

describe('afterPageWrite — a page edited, the sources of its comps follow', () => {
  const PAGED = JSON.stringify({ mode: 'deck', items: [{ source: 'a.dsgn' }, { source: 'b.dsgn' }] });
  const page = (title: string) =>
    `<design>
<Text data-slot="title">${title}</Text>
</design>`;
  function folder(files: Record<string, string>) {
    const m = memory(files);
    return { ...m, io: { ...m.io, list: async (dir: string) => Object.keys(files).filter((k) => k.startsWith(`${dir}/`)).map((k) => k.slice(dir.length + 1)) } };
  }

  it('the new words of the page land in the part that names it; the rest stays', async () => {
    const m = folder({ 'p/x.comp': PAGED, 'p/a.dsgn': page('Old'), 'p/b.dsgn': page('Bee') });
    expect(await afterPairWrite(m.io, 'p/x.comp')).toBe('source');
    const before = m.files['p/x.mdx']!;
    m.files['p/a.dsgn'] = page('New');
    expect(await afterPageWrite(m.io, 'p/a.dsgn')).toEqual(['p/x.mdx']);
    const after = m.files['p/x.mdx']!;
    expect(after).not.toBe(before);
    expect(after).toContain('New');
    expect(after).toContain('Bee');
    /* in step now: the same page again writes nothing */
    expect(await afterPageWrite(m.io, 'p/a.dsgn')).toEqual([]);
  });

  it('a page no comp draws, or a comp with no source, writes nothing', async () => {
    const m = folder({ 'p/x.comp': PAGED, 'p/z.dsgn': page('Z') });
    expect(await afterPageWrite(m.io, 'p/z.dsgn')).toEqual([]);
    expect(await afterPageWrite(m.io, 'p/a.dsgn', page('A'))).toEqual([]);
    expect(m.writes).toEqual([]);
  });
});

describe('a word the page holds, changed in the source', () => {
  it('lands in the comp, which overrides the page; the page is left as it is', async () => {
    const page = '<design>\n<Text data-slot="title">Old</Text>\n</design>';
    const m = memory({ 'p/x.comp': JSON.stringify({ mode: 'deck', items: [{ source: 'a.dsgn' }] }), 'p/a.dsgn': page });
    expect(await afterPairWrite(m.io, 'p/x.comp')).toBe('source');
    const edited = m.files['p/x.mdx']!.replace('title: Old', 'title: New');
    m.files['p/x.mdx'] = edited;
    expect(await afterPairWrite(m.io, 'p/x.mdx', edited)).toBe('comp');
    expect(JSON.parse(m.files['p/x.comp']!).items[0].params.title).toBe('New');
    expect(m.files['p/a.dsgn']).toBe(page);
    expect(await afterPairWrite(m.io, 'p/x.comp')).toBeNull();
  });
});
