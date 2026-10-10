import { describe, expect, it } from 'vitest';
import { applyPlan, briefRecord, compPartsOf, newSource, planUpdate, setPart } from './index';

const comp = (sources: string[], params: Record<string, string>[] = []) => ({
  mode: 'deck',
  items: sources.map((source, i) => ({ source, ...(params[i] ? { params: params[i] } : {}) })),
});

const DECK = comp(['a.dsgn', 'b.dsgn'], [{ headline: 'A' }, { headline: 'B' }]);
const PARTS = compPartsOf(DECK, 'projects/x/d.comp', 'projects/x');
const SRC = newSource({
  comp: 'd.comp',
  title: 'D',
  parts: [
    { header: [['name', 'A'], ['page', 'a.dsgn'], ['headline', 'A']], body: 'Calm.' },
    { header: [['name', 'B'], ['page', 'b.dsgn'], ['headline', 'B']], body: 'Loud.' },
  ],
});
const RUN = briefRecord(SRC);

describe('planUpdate — what it costs before it is pressed', () => {
  it('says nothing to do when the two agree', () => {
    const plan = planUpdate({ text: SRC, parts: PARTS, compExists: true, lastBriefs: RUN });
    expect(plan.any).toBe(false);
    expect(plan.costs).toBe(false);
    expect(plan.says).toBe('Everything matches');
  });

  it('a word changed is free', () => {
    const text = setPart(SRC, 0, { header: [['name', 'A'], ['page', 'a.dsgn'], ['headline', 'New']] });
    const plan = planUpdate({ text, parts: PARTS, compExists: true, lastBriefs: briefRecord(text) });
    expect(plan.costs).toBe(false);
    expect(plan.work).toEqual([]);
    expect(plan.steps).toEqual([{ kind: 'slots', page: 0, slots: [['headline', 'New']] }]);
    expect(plan.says).toBe('1 page reworded');
    const next = applyPlan(DECK, plan.steps) as typeof DECK;
    expect(next.items[0]!.params).toEqual({ headline: 'New' });
  });

  it('a brief changed needs a worker', () => {
    const text = setPart(SRC, 1, { body: 'Bolder, and cut to the logo.' });
    const plan = planUpdate({ text, parts: PARTS, compExists: true, lastBriefs: RUN });
    expect(plan.work).toEqual([1]);
    expect(plan.costs).toBe(true);
    expect(plan.says).toBe('1 part to build');
  });

  it('a part naming a page the project has is free; one with no page is a worker', () => {
    const named = newSource({
      title: 'D',
      parts: [
        { header: [['name', 'A'], ['page', 'a.dsgn']], body: '' },
        { header: [['name', 'C'], ['page', 'c.dsgn']], body: '' },
        { header: [['name', 'B'], ['page', 'b.dsgn']], body: '' },
      ],
    });
    const free = planUpdate({ text: named, parts: PARTS, compExists: true, files: ['projects/x/c.dsgn'], lastBriefs: briefRecord(named) });
    expect(free.costs).toBe(false);
    expect(free.steps).toEqual([{ kind: 'add', at: 1, src: 'c.dsgn', name: 'C' }]);
    const next = applyPlan(DECK, free.steps) as typeof DECK;
    expect(next.items.map((i) => i.source)).toEqual(['a.dsgn', 'c.dsgn', 'b.dsgn']);

    const unknown = planUpdate({ text: named, parts: PARTS, compExists: true, lastBriefs: briefRecord(named) });
    expect(unknown.work).toEqual([1]);
    expect(unknown.costs).toBe(true);
  });

  it('a page no part names is LEFT ALONE — never dropped for not being written down', () => {
    const one = newSource({ title: 'D', parts: [{ header: [['name', 'A'], ['page', 'a.dsgn'], ['headline', 'A']], body: 'Calm.' }] });
    const plan = planUpdate({ text: one, parts: PARTS, compExists: true, lastBriefs: briefRecord(one) });
    expect(plan.steps).toEqual([]);
    expect(plan.any).toBe(false);
  });

  it('sees a reorder without touching anything', () => {
    const moved = newSource({
      title: 'D',
      parts: [
        { header: [['name', 'B'], ['page', 'b.dsgn'], ['headline', 'B']], body: 'Loud.' },
        { header: [['name', 'A'], ['page', 'a.dsgn'], ['headline', 'A']], body: 'Calm.' },
      ],
    });
    const plan = planUpdate({ text: moved, parts: PARTS, compExists: true, lastBriefs: briefRecord(moved) });
    expect(plan.reorder).toBe(true);
    expect(plan.steps).toEqual([]);
    expect(plan.costs).toBe(false);
    expect(plan.says).toBe('reordered');
  });

  it('a reorder is never a brief to rebuild — the record follows the page, not the place', () => {
    const moved = newSource({
      title: 'D',
      parts: [
        { header: [['name', 'B'], ['page', 'b.dsgn'], ['headline', 'B']], body: 'Loud.' },
        { header: [['name', 'A'], ['page', 'a.dsgn'], ['headline', 'A']], body: 'Calm.' },
      ],
    });
    const plan = planUpdate({ text: moved, parts: PARTS, compExists: true, lastBriefs: RUN });
    expect(plan.work).toEqual([]);
    expect(plan.costs).toBe(false);
    const edited = setPart(moved, 0, { body: 'Louder.' });
    expect(planUpdate({ text: edited, parts: PARTS, compExists: true, lastBriefs: RUN }).work).toEqual([0]);
  });

  it('a part rated low is another pass, said as one', () => {
    const plan = planUpdate({ text: SRC, parts: PARTS, compExists: true, lastBriefs: RUN, again: [1] });
    expect(plan.work).toEqual([1]);
    expect(plan.costs).toBe(true);
    expect(plan.says).toBe('1 part rated low, another pass');
    const both = planUpdate({ text: setPart(SRC, 0, { body: 'Bolder.' }), parts: PARTS, compExists: true, lastBriefs: RUN, again: [0, 1] });
    expect(both.work).toEqual([0, 1]);
    expect(both.says).toBe('1 part to build, 1 part rated low, another pass');
  });

  it('no comp at all is a build', () => {
    const plan = planUpdate({ text: SRC, parts: [], compExists: false });
    expect(plan.make).toBe(true);
    expect(plan.costs).toBe(true);
    expect(plan.says).toBe('Build 2 pages');
  });

  it('several at once read as one line', () => {
    let text = setPart(SRC, 0, { header: [['name', 'A'], ['page', 'a.dsgn'], ['headline', 'New']] });
    text = setPart(text, 1, { body: 'Bolder.' });
    const plan = planUpdate({ text, parts: PARTS, compExists: true, lastBriefs: RUN });
    expect(plan.says).toBe('1 page reworded, 1 part to build');
    expect(plan.costs).toBe(true);
  });
});
