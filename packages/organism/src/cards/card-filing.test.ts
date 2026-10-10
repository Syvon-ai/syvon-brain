import { describe, expect, it } from 'vitest';
import {
  CARD_KIND_ICON,
  FILING_ACTION_ICON,
  cardFilingFor,
  deriveFilingAction,
  feedbackFilingFor,
  filingActionKind,
  type FilingSpot,
} from './card-filing';

/**
 * THE FILING RULE, AS A TEST — the shared copy. Studio's `derive-action.test`
 * states the verb table in full through its wrapper; this pins what both apps
 * rely on from here: the brief's shape, the worst-of rating, where the card
 * lands, and that the chips wear the kinds' own glyphs.
 */

const dials = { rating: null as null | 1 | 2 | 3 | 4 | 5, urgency: 3 as const, power: 2 as const };

function spot(path: string, at = '', extra: Partial<FilingSpot> = {}): FilingSpot {
  return { path, at, label: at, ...extra };
}

describe('the chips wear the kinds\' glyphs', () => {
  it('every action but make draws as its kind', () => {
    for (const action of ['change', 'repair', 'correction', 'variations'] as const) {
      expect(FILING_ACTION_ICON[action]).toBe(CARD_KIND_ICON[filingActionKind(action)]);
    }
    expect(FILING_ACTION_ICON.make).toBe('add');
  });
});

describe('deriveFilingAction', () => {
  it('reads the selection: void → make, verdict alone → correction, else change', () => {
    expect(deriveFilingAction({ count: 0, isVoid: true, hasLog: false, hasWords: true, hasRating: false }).chosen).toBe('make');
    expect(deriveFilingAction({ count: 1, isVoid: false, hasLog: false, hasWords: false, hasRating: true }).chosen).toBe('correction');
    expect(deriveFilingAction({ count: 1, isVoid: false, hasLog: true, hasWords: true, hasRating: false }).chosen).toBe('repair');
    expect(deriveFilingAction({ count: 2, isVoid: false, hasLog: false, hasWords: true, hasRating: false }).chosen).toBe('change');
  });
});

describe('cardFilingFor', () => {
  it('one pin: the file is the target, the part is `at`, the words are the brief', () => {
    const [card] = cardFilingFor({
      action: 'change',
      spots: [spot('ws/projects/deck/01.dsgn', 'headline')],
      standing: null,
      words: 'Tighten it.',
      dials,
    });
    expect(card).toMatchObject({
      target: 'ws/projects/deck/01.dsgn',
      at: 'headline',
      kind: 'change',
      instruction: 'Tighten it.\n- headline',
      urgency: 3,
      power: 2,
    });
  });

  it("pins in one file: one task on the file, the parts in the brief, the worst verdict is the task's", () => {
    const [card, extra] = cardFilingFor({
      action: 'change',
      spots: [
        spot('ws/projects/deck/01.dsgn', 'headline', { rating: 4, note: 'too tight' }),
        spot('ws/projects/deck/01.dsgn', 'kicker', { rating: 2, name: 'the kicker' }),
      ],
      standing: null,
      words: 'Tighten the strip.',
      dials,
    });
    expect(extra).toBeUndefined();
    expect(card!.target).toBe('ws/projects/deck/01.dsgn');
    expect(card!.at).toBeUndefined();
    expect(card!.rating).toBe(2);
    expect(card!.instruction).toBe('Tighten the strip.\n- headline (4/5): too tight\n- the kicker (2/5)');
  });

  it('pins across files: one task per file, each with its own parts and the same direction', () => {
    const cards = cardFilingFor({
      action: 'change',
      spots: [
        spot('ws/projects/deck/01.dsgn', 'headline', { rating: 4 }),
        spot('ws/projects/deck/02.dsgn', 'kicker', { rating: 2 }),
        spot('ws/projects/deck/01.dsgn', 'caption'),
      ],
      standing: null,
      words: 'Tighten.',
      dials,
    });
    expect(cards.map((c) => c.target)).toEqual(['ws/projects/deck/01.dsgn', 'ws/projects/deck/02.dsgn']);
    expect(cards[0]!.instruction).toBe('Tighten.\n- headline (4/5)\n- caption');
    expect(cards[0]!.rating).toBe(4);
    expect(cards[1]).toMatchObject({ at: 'kicker', rating: 2, instruction: 'Tighten.\n- kicker (2/5)' });
  });

  it('a make lands where the person is standing and carries no rating', () => {
    const [card] = cardFilingFor({
      action: 'make',
      spots: [],
      standing: 'projects/deck',
      words: 'A closing page.',
      dials: { ...dials, rating: 3 },
    });
    expect(card).toEqual({ target: 'projects/deck', kind: 'change', instruction: 'A closing page.', urgency: 3, power: 2 });
  });

  it('files nothing when nothing was said', () => {
    expect(cardFilingFor({ action: 'change', spots: [spot('a.dsgn')], standing: null, words: '  ', dials })).toEqual([]);
    expect(cardFilingFor({ action: 'make', spots: [], standing: null, words: 'x', dials })).toEqual([]);
  });

  it('a verdict with no words is a complete brief', () => {
    const [card] = cardFilingFor({ action: 'correction', spots: [spot('a.dsgn')], standing: null, words: '', dials: { ...dials, rating: 2 } });
    expect(card!.instruction).toBe('Rated 2/5 — make this better.');
    expect(card!.rating).toBe(2);
  });
});

describe('feedbackFilingFor', () => {
  it('is a note: kind feedback, middle urgency, no power, the parts as nodes', () => {
    const [card] = feedbackFilingFor({
      spots: [spot('a.dsgn', 'headline'), spot('a.dsgn', 'kicker')],
      standing: null,
      words: 'Reads well.',
      dials,
    });
    expect(card).toMatchObject({ target: 'a.dsgn', kind: 'feedback', urgency: 3, nodes: ['headline', 'kicker'] });
    expect(card!.power).toBeUndefined();
    expect(card!.at).toBeUndefined();
  });
});

describe('notes across files', () => {
  it('are one note per file', () => {
    const notes = feedbackFilingFor({ spots: [spot('a.dsgn', 'x'), spot('b.dsgn', 'y')], standing: null, words: 'Reads well.', dials });
    expect(notes.map((n) => [n.target, n.at, n.kind])).toEqual([['a.dsgn', 'x', 'feedback'], ['b.dsgn', 'y', 'feedback']]);
  });
});
