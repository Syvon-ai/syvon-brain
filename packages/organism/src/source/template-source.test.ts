import { describe, expect, it } from 'vitest';
import { describeTemplateSource, newSource, parseSource, sampleWordsLeft, templateSourcePathFor, withTemplateSource } from './index';

const TEMPLATE = newSource({
  comp: 'boardroom.comp',
  title: 'Boardroom deck',
  treatment: 'A calm board deck for quarterly updates.\n\nBest for: board meeting, quarterly review',
  parts: [
    { header: [['name', 'Cover'], ['page', '01-cover.dsgn'], ['title', 'Built for What Comes Next']], body: 'Opens the deck with the one line.\nCentered cover.' },
    { header: [['name', 'Stat'], ['page', '06-stat.dsgn'], ['value', '42%']], body: 'One number that carries the point.\nBig numeral.' },
  ],
});

describe('withTemplateSource — the account of the template comes along', () => {
  it('a project with no source takes the one of the template, pointed at its deck, without the Best for line', () => {
    const text = withTemplateSource(null, TEMPLATE, 'board-update.comp', new Map([['06-stat.dsgn', '06-stat-2.dsgn']]));
    const doc = parseSource(text);
    expect(text).toContain('comp: board-update.comp');
    expect(doc.treatment).toBe('A calm board deck for quarterly updates.');
    expect(doc.parts.map((p) => p.header.find(([k]) => k === 'page')?.[1])).toEqual(['01-cover.dsgn', '06-stat-2.dsgn']);
    expect(doc.parts[1]!.body).toContain('One number that carries the point.');
  });

  it('a project source keeps its own words; empty parts take the job of the page', () => {
    const project = newSource({
      comp: 'board-update.comp',
      title: 'Board update',
      treatment: 'Next week, for the board.',
      parts: [
        { header: [['name', 'Cover'], ['page', '01-cover.dsgn'], ['title', 'Board update']], body: '' },
        { header: [['name', 'Stat'], ['page', '06-stat-2.dsgn'], ['value', '42%']], body: 'My own note.' },
      ],
    });
    const doc = parseSource(withTemplateSource(project, TEMPLATE, 'board-update.comp', new Map([['06-stat.dsgn', '06-stat-2.dsgn']])));
    expect(doc.treatment).toBe('Next week, for the board.');
    expect(doc.parts[0]!.body).toContain('Opens the deck with the one line.');
    expect(doc.parts[0]!.header.find(([k]) => k === 'title')?.[1]).toBe('Board update');
    expect(doc.parts[1]!.body).toBe('My own note.');
  });

  it('a part holding only the page note takes the job above it', () => {
    const project = newSource({
      comp: 'b.comp',
      title: 'B',
      parts: [{ header: [['name', 'Cover'], ['page', '01-cover.dsgn']], body: 'Centered cover.' }],
    });
    const doc = parseSource(withTemplateSource(project, TEMPLATE, 'b.comp'));
    expect(doc.parts[0]!.body).toBe('Opens the deck with the one line.\nCentered cover.');
  });
});

describe('describeTemplateSource — what a template is for, written when it is saved', () => {
  it('sets the title, the purpose with its Best for line, and each page job above its note', () => {
    const doc = parseSource(
      describeTemplateSource(TEMPLATE, {
        title: 'Board update deck',
        purpose: 'A short deck for a quarterly board update.',
        bestFor: ['board update', 'quarterly review'],
        pageJobs: { '06-stat': 'The one number the quarter turns on.' },
      }),
    );
    expect(doc.title).toBe('Board update deck');
    expect(doc.treatment).toBe('A short deck for a quarterly board update.\n\nBest for: board update, quarterly review');
    expect(doc.parts[1]!.body.split('\n')[0]).toBe('The one number the quarter turns on.');
    expect(doc.parts[1]!.header.find(([k]) => k === 'value')?.[1]).toBe('42%');
    expect(doc.parts[0]!.body).toContain('Opens the deck');
  });

  it('given nothing, changes nothing', () => {
    expect(describeTemplateSource(TEMPLATE, {})).toBe(TEMPLATE);
  });
});

describe('sampleWordsLeft and templateSourcePathFor', () => {
  it('finds the template source from any template: spelling', () => {
    expect(templateSourcePathFor('social.reels.reels')).toBe('catalog/templates/social/reels/reels.mdx');
    expect(templateSourcePathFor('templates/rf-social-reel/reel')).toBe('templates/rf-social-reel/reel.mdx');
    expect(templateSourcePathFor('catalog/templates/a/b/c.comp')).toBe('catalog/templates/a/b/c.mdx');
    expect(templateSourcePathFor('')).toBeNull();
  });

  it('flags a part still wholly in the template words, not one written or half-kept', () => {
    const deck = newSource({
      title: 'Deck',
      parts: [
        { header: [['name', 'Cover'], ['page', '01-cover.dsgn'], ['title', 'Built for What Comes Next']], body: '' },
        { header: [['name', 'Stat'], ['page', '06-stat.dsgn'], ['value', '38%']], body: '' },
      ],
    });
    expect(sampleWordsLeft(deck, TEMPLATE)).toEqual([{ part: 0, name: 'Cover', slots: ['title'] }]);
  });
});
