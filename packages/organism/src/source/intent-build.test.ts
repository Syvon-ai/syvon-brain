import { describe, expect, it } from 'vitest';
import { applyStoryAnswer, applyWords, newSource, parseSource, projectSourceFromComps, readWordsAnswer, setStory, storyOf, wordSlotsOf, wordsPrompt } from './index';

const DECK = newSource({
  comp: 'reel.comp',
  title: 'Reel',
  parts: [
    { header: [['name', 'Hook'], ['page', '01-hook.dsgn'], ['kicker', 'WATCH THIS'], ['hook', 'We deleted half our content']], body: 'Stops the scroll.\nInverted ground.' },
    { header: [['name', 'Media'], ['page', '05-media.dsgn'], ['media_bg', '{media_bg}']], body: '' },
  ],
});

describe('the fast build', () => {
  it('asks only for word slots — not addresses, not pictures', () => {
    const d = wordSlotsOf(DECK, 'reel.comp', 'A short reel');
    expect(d.parts).toEqual([{ part: 0, name: 'Hook', job: 'Stops the scroll.', slots: { kicker: 'WATCH THIS', hook: 'We deleted half our content' } }]);
  });

  it('puts the answer back in the slots it has, and nowhere else', () => {
    const next = applyWords(DECK, [{ part: 0, slots: { kicker: 'NEW', hook: 'Carry less', page: 'x.dsgn', extra: 'no' } }, { part: 1, slots: { media_bg: 'photo' } }]);
    const [a, b] = parseSource(next).parts;
    expect(a!.header).toEqual([['name', 'Hook'], ['page', '01-hook.dsgn'], ['kicker', 'NEW'], ['hook', 'Carry less']]);
    expect(b!.header.find(([k]) => k === 'media_bg')?.[1]).toBe('{media_bg}');
    expect(parseSource(next).parts[0]!.body).toBe('Stops the scroll.\nInverted ground.');
  });

  it('fills empty story rows only, and never proof', () => {
    const intent = setStory(projectSourceFromComps({ project: 'x', title: 'X', comps: [] }), { audience: 'Travellers' });
    const next = applyStoryAnswer(intent, readWordsAnswer('```json\n{"story":{"audience":"Other","tone":"calm","proof":"made up"}}\n```'));
    expect(storyOf(next)).toEqual({ audience: 'Travellers', tone: 'calm' });
  });

  it('the ask names the rows to fill and every piece', () => {
    const intent = setStory(projectSourceFromComps({ project: 'x', title: 'X', comps: [] }), { audience: 'Travellers' });
    const { user } = wordsPrompt(intent, [wordSlotsOf(DECK, 'reel.comp', 'A short reel')]);
    const j = JSON.parse(user);
    expect(j.storyToFill).toEqual(['proposition', 'objection', 'tone', 'cta', 'framework']);
    expect(j.pieces[0].comp).toBe('reel.comp');
  });
});
