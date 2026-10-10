import { describe, expect, it } from 'vitest';
import { compOrderFromSource, compPartsOf, newSource, permuteCompPages, setCompSlots } from './index';

const DECK = {
  mode: 'deck',
  items: [{ source: 'a.dsgn', params: { headline: 'Old' } }, { source: 'b.dsgn' }, { source: 'c.dsgn' }],
};
const VIDEO = {
  mode: 'sequence',
  tracks: [
    {
      id: 'video',
      type: 'video',
      items: [
        { id: 'x', startTime: 0, duration: 2, inlineShot: { templatePath: 'x.react', params: { title: 'X' } } },
        { id: 'y', startTime: 2, duration: 5, inlineShot: { templatePath: 'y.react', params: {} } },
      ],
    },
  ],
};

describe('setCompSlots — a header value, straight onto the page it names', () => {
  it("writes a deck page's words on its own item, leaving the others alone", () => {
    const next = setCompSlots(DECK, 1, [['headline', 'New']]) as typeof DECK;
    expect(next.items[1]).toEqual({ source: 'b.dsgn', params: { headline: 'New' } });
    expect(next.items[0]).toEqual(DECK.items[0]);
    expect(DECK.items[1]).toEqual({ source: 'b.dsgn' });
  });

  it("writes a shot's words on its inline shot", () => {
    const next = setCompSlots(VIDEO, 0, [['title', 'Hello']]) as typeof VIDEO;
    expect(next.tracks[0]!.items[0]!.inlineShot.params).toEqual({ title: 'Hello' });
  });

  it('never writes address keys, and says so when nothing changed', () => {
    expect(setCompSlots(DECK, 0, [['headline', 'Old']])).toBeNull();
    expect(setCompSlots(DECK, 0, [['page', 'z.dsgn'], ['name', 'Z']])).toBeNull();
  });

  it("removing a value lets the page's own words show again", () => {
    const next = setCompSlots(DECK, 0, [['headline', null]]) as typeof DECK;
    expect(next.items[0]!.params).toEqual({});
  });
});

describe('permuteCompPages — the parts’ order, onto the pages', () => {
  it("reorders a deck's list", () => {
    const next = permuteCompPages(DECK, [2, 0, 1]) as typeof DECK;
    expect(next.items.map((i) => i.source)).toEqual(['c.dsgn', 'a.dsgn', 'b.dsgn']);
  });

  it("moves a video's shots through slots that keep their timing", () => {
    const next = permuteCompPages(VIDEO, [1, 0]) as typeof VIDEO;
    const items = next.tracks[0]!.items;
    expect(items.map((i) => [i.id, i.startTime, i.duration])).toEqual([
      ['y', 0, 2],
      ['x', 2, 5],
    ]);
  });

  it('refuses an order that is not a permutation, and ignores the identity', () => {
    expect(permuteCompPages(DECK, [0, 0, 1])).toBeNull();
    expect(permuteCompPages(DECK, [0, 1, 2])).toBeNull();
  });
});

describe('compOrderFromSource', () => {
  const parts = compPartsOf(DECK, 'projects/p/d.comp', 'projects/p');
  it('reads the page order the parts are in', () => {
    const src = newSource({
      title: 'T',
      parts: [
        { header: [['name', 'C'], ['page', 'c.dsgn']], body: '' },
        { header: [['name', 'A'], ['page', 'a.dsgn']], body: '' },
        { header: [['name', 'B'], ['page', 'b.dsgn']], body: '' },
      ],
    });
    expect(compOrderFromSource(src, parts)).toEqual([2, 0, 1]);
  });

  it('says nothing when fewer than two pages are named', () => {
    const src = newSource({ title: 'T', parts: [{ header: [['name', 'A'], ['page', 'a.dsgn']], body: '' }] });
    expect(compOrderFromSource(src, parts)).toBeNull();
  });

  it('reorders the pages it names and leaves the others in place', () => {
    const src = newSource({
      title: 'T',
      parts: [
        { header: [['name', 'C'], ['page', 'c.dsgn']], body: '' },
        { header: [['name', 'A'], ['page', 'a.dsgn']], body: '' },
      ],
    });
    /* a and c swap places; b, which the source never names, stays second. */
    expect(compOrderFromSource(src, parts)).toEqual([2, 1, 0]);
  });
});
