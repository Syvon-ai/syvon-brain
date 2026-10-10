import { describe, expect, it } from 'vitest';
import {
  afterPairWrite,
  intentFromSuggestion,
  partsToMake,
  intentFilingFor,
  addressFor,
  projectPartsOf,
  compOfPart,
  compsOutsideSource,
  healLinks,
  isProjectSourceText,
  isSourceText,
  linkedFiles,
  movePart,
  parseSource,
  partIndexForComp,
  projectSourceFromComps,
  projectSourcePathFor,
  setPart,
} from './index';

const written = projectSourceFromComps({
  project: 'weekly',
  title: 'Share my ideas every week',
  intent: 'Turn my latest ideas into social content. From [notes](notes/ideas-sep.md).',
  type: 'social',
  timing: 'weekly',
  comps: [
    { name: 'linkedin-deck.comp', label: 'LinkedIn deck', parts: ['What Syvon does', 'Close on the demo'] },
    { name: 'carousel.comp', label: 'Instagram carousel' },
  ],
});

describe('project source', () => {
  it('lives at the project root', () => {
    expect(projectSourcePathFor('projects/weekly/')).toBe('projects/weekly/intent.mdx');
  });

  it('writes a first draft from the comps: intent on top, one part per comp, subparts in the body', () => {
    /* The same schema as a comp's source — only the header's `project:` differs. */
    expect(isProjectSourceText(written)).toBe(true);
    expect(isSourceText(written)).toBe(true);
    expect(isProjectSourceText('---\n$schema: source/v1\ncomp: a.comp\n---\n')).toBe(false);
    expect(isProjectSourceText('---\n$schema: project-source/v1\n---\n')).toBe(true);
    const doc = parseSource(written);
    expect(doc.title).toBe('Share my ideas every week');
    expect(doc.treatment).toContain('Turn my latest ideas');
    expect(doc.parts.map(compOfPart)).toEqual(['linkedin-deck.comp', 'carousel.comp']);
    expect(doc.parts[0]!.body).toBe('- What Syvon does\n- Close on the demo');
    expect(doc.parts[1]!.body).toBe('');
  });

  it('keeps a part on its comp when it is renamed or moved', () => {
    const renamed = setPart(written, 0, { header: [['name', 'LinkedIn slides'], ['comp', 'linkedin-deck.comp']] });
    const moved = movePart(renamed, 0, 1);
    const doc = parseSource(moved);
    expect(partIndexForComp(doc, 'linkedin-deck.comp')).toBe(1);
    expect(doc.parts[1]!.body).toBe('- What Syvon does\n- Close on the demo');
  });

  it('names the comps no part is about', () => {
    expect(compsOutsideSource(written, ['linkedin-deck.comp', 'video.comp', 'carousel.comp'])).toEqual(['video.comp']);
  });

  it('addresses a part by its comp, wherever it sits', () => {
    const parts = projectPartsOf('projects/weekly', [
      { name: 'carousel.comp', label: 'Instagram carousel' },
      { name: 'linkedin-deck.comp', label: 'LinkedIn deck' },
    ]);
    const doc = parseSource(written);
    expect(addressFor(doc.parts[0]!, 0, parts)?.src).toBe('linkedin-deck.comp');
    expect(addressFor(doc.parts[1]!, 1, parts)?.src).toBe('carousel.comp');
  });

  it('a part with no comp is not made yet', () => {
    expect(compOfPart({ header: [['name', 'Short video']] })).toBeNull();
  });
});

describe('links', () => {
  it('lists the project files a source links to, not the web', () => {
    expect(linkedFiles('[a](notes/a.md) [b](https://x.io/b) ![c](assets/c%20d.png) [a](notes/a.md)')).toEqual([
      'notes/a.md',
      'assets/c d.png',
    ]);
  });

  it('heals a moved file by its name', () => {
    const r = healLinks('See [notes](notes/ideas-sep.md).', ['inputs/ideas-sep.md', 'logo.svg']);
    expect(r.text).toBe('See [notes](inputs/ideas-sep.md).');
    expect(r.healed).toEqual([['notes/ideas-sep.md', 'inputs/ideas-sep.md']]);
  });

  it('leaves a link alone when the name is ambiguous or gone, and says so', () => {
    const text = '[a](x/a.md) [b](b.md)';
    const r = healLinks(text, ['one/a.md', 'two/a.md']);
    expect(r.text).toBe(text);
    expect(r.broken).toEqual(['x/a.md', 'b.md']);
  });

  it('touches nothing that is there', () => {
    const text = '[a](a.md) and [site](https://syvon.ai)';
    expect(healLinks(text, ['a.md']).text).toBe(text);
  });
});

describe('a comp made in a project joins its intent', () => {
  const intent = projectSourceFromComps({ project: 'w', title: 'W', comps: [{ name: 'deck.comp', label: 'Deck' }] });
  const io = (files: Record<string, string>) => ({
    read: async (p: string) => files[p] ?? null,
    write: async (p: string, c: string) => {
      files[p] = c;
    },
  });

  it('adds a part naming a NEW comp', async () => {
    const files: Record<string, string> = { 'projects/w/intent.mdx': intent };
    await afterPairWrite(io(files), 'projects/w/short-video.comp', '{}', { created: true });
    const doc = parseSource(files['projects/w/intent.mdx']!);
    expect(doc.parts.map(compOfPart)).toEqual(['deck.comp', 'short-video.comp']);
    expect(doc.parts[1]!.header.find(([k]) => k === 'name')?.[1]).toBe('Short video');
  });

  it('leaves the intent alone for a comp rewritten, one already named, or one in a subfolder', async () => {
    const files: Record<string, string> = { 'projects/w/intent.mdx': intent };
    await afterPairWrite(io(files), 'projects/w/other.comp', '{}');
    await afterPairWrite(io(files), 'projects/w/deck.comp', '{}', { created: true });
    await afterPairWrite(io(files), 'projects/w/output/copy.comp', '{}', { created: true });
    expect(files['projects/w/intent.mdx']).toBe(intent);
  });

  it('a project with no intent gets none', async () => {
    const files: Record<string, string> = {};
    await afterPairWrite(io(files), 'projects/w/a.comp', '{}', { created: true });
    expect(files['projects/w/intent.mdx']).toBeUndefined();
  });

  it('intent.mdx is never taken for the source of a comp named intent.comp', async () => {
    const files: Record<string, string> = { 'projects/w/intent.mdx': intent, 'projects/w/intent.comp': '{"items":[]}' };
    expect(await afterPairWrite(io(files), 'projects/w/intent.mdx', intent)).toBeNull();
    expect(files['projects/w/intent.comp']).toBe('{"items":[]}');
  });
});

describe('build', () => {
  const text = [
    '---', '$schema: source/v1', 'project: w', 'title: W', '---', 'Share my ideas.', '',
    '---', 'name: Deck', 'comp: deck.comp', '---', '- five slides', '',
    '---', 'name: Short video', '---', '- 20 seconds', '',
  ].join('\n');
  const parts = projectPartsOf('projects/w', [{ name: 'deck.comp', label: 'Deck' }]);

  it('files one task for the parts no comp answers to', () => {
    expect(partsToMake(text, parts)).toEqual([1]);
    const f = intentFilingFor({ text, sourceRel: 'projects/w/intent.mdx', projectRel: 'projects/w', parts })!;
    expect(f.target).toBe('projects/w');
    expect(f.instruction).toContain('"Short video"');
    expect(f.instruction).toContain('    - 20 seconds');
    expect(f.files).toEqual(['projects/w/intent.mdx:14-17']);
  });

  it('nothing to build, no task', () => {
    const all = projectPartsOf('projects/w', [{ name: 'deck.comp', label: 'Deck' }, { name: 'short-video.comp', label: 'Short video' }]);
    const named = text.replace('name: Short video', 'name: Short video\ncomp: short-video.comp');
    expect(intentFilingFor({ text: named, sourceRel: 'x', projectRel: 'projects/w', parts: all })).toBeNull();
  });

  it('a comp the worker made first takes the part waiting for it, not a second one', async () => {
    const files: Record<string, string> = { 'projects/w/intent.mdx': text };
    await afterPairWrite(
      { read: async (p) => files[p] ?? null, write: async (p, c) => { files[p] = c; } },
      'projects/w/short-video.comp', '{}', { created: true },
    );
    const doc = parseSource(files['projects/w/intent.mdx']!);
    expect(doc.parts.map(compOfPart)).toEqual(['deck.comp', 'short-video.comp']);
  });
});

describe('a part with no comp is never another comp', () => {
  it('is not addressed by its position', () => {
    const text = ['---', '$schema: source/v1', 'project: w', '---', '', '---', 'name: New one', '---', '', '---', 'name: Deck', 'comp: deck.comp', '---', ''].join('\n');
    const parts = projectPartsOf('projects/w', [{ name: 'deck.comp', label: 'Deck' }]);
    const doc = parseSource(text);
    expect(addressFor(doc.parts[0]!, 0, parts)).toBeUndefined();
    expect(addressFor(doc.parts[1]!, 1, parts)?.src).toBe('deck.comp');
    expect(partsToMake(text, parts)).toEqual([0]);
  });
});

describe('material filed outside the project', () => {
  it('a workspace-rooted link is neither healed nor broken', () => {
    const text = 'Notes: [n](/assets/uploads/notes.pdf)';
    const r = healLinks(text, ['notes.pdf']);
    expect(r.text).toBe(text);
    expect(r.broken).toEqual([]);
  });
});

describe('a suggested intent', () => {
  it('is a project source: title and timing on top, one part per composition, the first taking a comp', () => {
    const text = intentFromSuggestion(
      { title: 'Launch', intent: 'Everything a launch needs.', timing: 'one-off', parts: [{ name: 'Deck', lines: ['What it is'] }, { name: 'Video', lines: ['30 seconds'] }] },
      { project: 'launch', firstComp: 'launch.comp' },
    );
    expect(isProjectSourceText(text)).toBe(true);
    const doc = parseSource(text);
    expect(doc.title).toBe('Launch');
    expect(doc.treatment).toBe('Everything a launch needs.');
    expect(doc.parts.map(compOfPart)).toEqual(['launch.comp', null]);
    expect(doc.parts[1]!.body).toBe('- 30 seconds');
  });

  it('arrives with its templates: each part names the one it starts from', () => {
    const text = intentFromSuggestion(
      { title: 'Launch', intent: 'x', parts: [{ name: 'Deck', lines: [], template: 'presentations.keynote.keynote' }, { name: 'Video', lines: [] }] },
      { project: 'new' },
    );
    const tpl = parseSource(text).parts.map((p) => p.header.find(([k]) => k === 'template')?.[1] ?? null);
    expect(tpl).toEqual(['presentations.keynote.keynote', null]);
  });
});
