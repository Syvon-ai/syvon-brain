import { describe, expect, it } from 'vitest';
import { headerValue, newSource, parseSource, partName, reconcilePair } from './index';

const paths = { compRel: 'projects/x/d.comp', projectRel: 'projects/x', files: ['a.dsgn', 'b.dsgn', 'c.dsgn', 'z.dsgn'] };
const deck = (items: Array<{ source: string; params?: Record<string, string> }>) => ({ mode: 'deck', items });
const pages = (c: unknown) => (c as { items: Array<{ source: string; params?: Record<string, string> }> }).items;
const order = (t: string) => parseSource(t).parts.map((p, i) => partName(p, i));

const COMP = deck([
  { source: 'a.dsgn', params: { headline: 'A' } },
  { source: 'b.dsgn', params: { headline: 'B' } },
  { source: 'c.dsgn', params: { headline: 'C' } },
]);
const SRC = newSource({
  title: 'D',
  parts: [
    { header: [['name', 'A'], ['page', 'a.dsgn'], ['headline', 'A']], body: 'Keep this prose.' },
    { header: [['name', 'B'], ['page', 'b.dsgn'], ['headline', 'B']], body: '' },
    { header: [['name', 'C'], ['page', 'c.dsgn'], ['headline', 'C']], body: '' },
  ],
});

describe('reconcilePair — the comp follows a written source', () => {
  it('takes its words and its order', () => {
    const src = newSource({
      title: 'D',
      parts: [
        { header: [['name', 'C'], ['page', 'c.dsgn'], ['headline', 'C!']], body: '' },
        { header: [['name', 'A'], ['page', 'a.dsgn'], ['headline', 'A']], body: '' },
        { header: [['name', 'B'], ['page', 'b.dsgn'], ['headline', 'B']], body: '' },
      ],
    });
    const { comp } = reconcilePair({ wrote: 'source', source: src, comp: COMP, paths });
    expect(pages(comp).map((p) => p.source)).toEqual(['c.dsgn', 'a.dsgn', 'b.dsgn']);
    expect(pages(comp)[0]!.params).toEqual({ headline: 'C!' });
  });

  it('draws a page the source names and the project has', () => {
    const src = newSource({
      title: 'D',
      parts: [
        { header: [['name', 'A'], ['page', 'a.dsgn']], body: '' },
        { header: [['name', 'Z'], ['page', 'z.dsgn']], body: '' },
        { header: [['name', 'B'], ['page', 'b.dsgn']], body: '' },
        { header: [['name', 'C'], ['page', 'c.dsgn']], body: '' },
      ],
    });
    const { comp } = reconcilePair({ wrote: 'source', source: src, comp: COMP, paths });
    expect(pages(comp).map((p) => p.source)).toEqual(['a.dsgn', 'z.dsgn', 'b.dsgn', 'c.dsgn']);
  });

  it('never drops a page the source does not name', () => {
    const src = newSource({ title: 'D', parts: [{ header: [['name', 'A'], ['page', 'a.dsgn'], ['headline', 'A']], body: '' }] });
    expect(reconcilePair({ wrote: 'source', source: src, comp: COMP, paths })).toEqual({});
  });
});

describe('reconcilePair — the source follows a written comp', () => {
  it("takes the comp's order and words, and keeps the prose", () => {
    const moved = deck([
      { source: 'b.dsgn', params: { headline: 'B, reworded' } },
      { source: 'a.dsgn', params: { headline: 'A' } },
      { source: 'c.dsgn', params: { headline: 'C' } },
    ]);
    const { source } = reconcilePair({ wrote: 'comp', source: SRC, comp: moved, paths });
    expect(order(source!)).toEqual(['B', 'A', 'C']);
    const doc = parseSource(source!);
    expect(headerValue(doc.parts[0]!.header, 'headline')).toBe('B, reworded');
    expect(doc.parts[1]!.body).toBe('Keep this prose.');
  });

  it('gets a part for a page it did not have, where the page sits', () => {
    const more = deck([...pages(COMP).slice(0, 1), { source: 'z.dsgn', params: { headline: 'New' } }, ...pages(COMP).slice(1)]);
    const { source } = reconcilePair({ wrote: 'comp', source: SRC, comp: more, paths });
    const doc = parseSource(source!);
    expect(doc.parts.map((p) => headerValue(p.header, 'page'))).toEqual(['a.dsgn', 'z.dsgn', 'b.dsgn', 'c.dsgn']);
    expect(headerValue(doc.parts[1]!.header, 'headline')).toBe('New');
  });

  it('never deletes a part whose page is gone', () => {
    const fewer = deck(pages(COMP).slice(0, 2));
    expect(reconcilePair({ wrote: 'comp', source: SRC, comp: fewer, paths })).toEqual({});
  });
});

describe('converges', () => {
  it('reconciling its own output changes nothing, both ways', () => {
    const moved = deck([
      { source: 'c.dsgn', params: { headline: 'C' } },
      { source: 'a.dsgn', params: { headline: 'A2' } },
      { source: 'b.dsgn', params: { headline: 'B' } },
    ]);
    const { source } = reconcilePair({ wrote: 'comp', source: SRC, comp: moved, paths });
    expect(reconcilePair({ wrote: 'source', source: source!, comp: moved, paths })).toEqual({});
    expect(reconcilePair({ wrote: 'comp', source: source!, comp: moved, paths })).toEqual({});
  });
});
