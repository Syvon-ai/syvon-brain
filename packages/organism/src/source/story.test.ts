import { describe, expect, it } from 'vitest';
import {
  addPart,
  intentFromSuggestion,
  parseSource,
  projectSourceFromComps,
  setHeadRows,
  setPart,
  setStory,
  storyGaps,
  storyHash,
  storyOf,
  storyRewriteFilingFor,
} from './index';

const INTENT = projectSourceFromComps({
  project: 'launch',
  title: 'Backpack launch',
  intent: 'We launch our new travel backpack next month.',
  comps: [
    { name: 'deck.comp', label: 'Board deck' },
    { name: 'reel.comp', label: 'Launch reel' },
  ],
});

describe('setHeadRows — rows in the file header', () => {
  it('adds, changes and removes rows; the intent and the parts stay byte for byte', () => {
    const next = setHeadRows(INTENT, { audience: 'Frequent travellers', tone: 'calm' });
    expect(parseSource(next).treatment).toBe(parseSource(INTENT).treatment);
    expect(parseSource(next).parts.map((p) => p.raw)).toEqual(parseSource(INTENT).parts.map((p) => p.raw));
    expect(next).toContain('audience: Frequent travellers');
    const removed = setHeadRows(next, { tone: '' });
    expect(removed).not.toContain('tone:');
    expect(removed).toContain('audience: Frequent travellers');
    expect(removed).toContain('project: launch');
  });

  it('changes nothing when nothing changes, and never touches the schema', () => {
    expect(setHeadRows(INTENT, { $schema: 'x' })).toBe(INTENT);
    expect(setHeadRows(INTENT, { title: 'Backpack launch' })).toBe(INTENT);
  });
});

describe('the story', () => {
  it('reads what is set, lists what is missing, and says when it moved', () => {
    const a = setStory(INTENT, { audience: 'Frequent travellers', proposition: 'One backpack for every stop' });
    expect(storyOf(a)).toEqual({ audience: 'Frequent travellers', proposition: 'One backpack for every stop' });
    expect(storyGaps(a)).toEqual(['proof', 'objection', 'tone', 'cta', 'framework']);
    expect(storyHash(a)).toBe(storyHash(a));
    expect(storyHash(setStory(a, { proposition: 'Pack less' }))).not.toBe(storyHash(a));
    /* media is not the message: changing it rewrites nothing */
    expect(storyHash(setStory(a, { media: 'placeholders' }))).toBe(storyHash(a));
  });

  it('a suggestion arrives with the story rows it knows', () => {
    const text = intentFromSuggestion(
      { title: 'Launch', intent: 'Launch a product.', story: { tone: 'confident', framework: 'PAS' }, parts: [{ name: 'Reel', lines: ['Hook'] }] },
      { project: 'new' },
    );
    expect(storyOf(text)).toEqual({ tone: 'confident', framework: 'PAS' });
    expect(parseSource(text).parts).toHaveLength(1);
  });

  it('a story change files one task over every piece already made — none when nothing is made', () => {
    const f = storyRewriteFilingFor({ text: INTENT, sourceRel: 'projects/launch/intent.mdx', projectRel: 'projects/launch' });
    expect(f?.instruction).toContain('projects/launch/deck.comp');
    expect(f?.instruction).toContain('projects/launch/reel.comp');
    expect(f?.files).toHaveLength(2);
    const unmade = setPart(addPart(projectSourceFromComps({ project: 'x', title: 'X', comps: [] }), 'Reel'), 0, { header: [['name', 'Reel']] });
    expect(storyRewriteFilingFor({ text: unmade, sourceRel: 'projects/x/intent.mdx', projectRel: 'projects/x' })).toBeNull();
  });
});
