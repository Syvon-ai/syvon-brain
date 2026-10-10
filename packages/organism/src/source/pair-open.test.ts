import { describe, expect, it } from 'vitest';
import { addPart, compOfPart, compPartsOf, companionOf, joinIntent, projectCompOf, versionOfComp, newSource, parseSource, setPart, projectSourceFromComps, retargetSource, settlePair, sourceFromComp } from './index';
import { intentAfterMove } from './pair-open';

const COMP = { mode: 'deck', items: [{ source: 'a.dsgn', params: { headline: 'Old' } }, { source: 'b.dsgn', params: { headline: 'B' } }] };

function store(files: Record<string, [string, number]>) {
  const writes: string[] = [];
  return {
    writes,
    files,
    io: {
      read: async (p: string) => files[p]?.[0] ?? null,
      write: async (p: string, c: string) => {
        writes.push(p);
        files[p] = [c, Date.now()];
      },
      list: async () => [],
      modified: async (p: string) => files[p]?.[1] ?? null,
    },
  };
}

describe('settlePair — the pair on open', () => {
  const source = sourceFromComp(COMP, 'd.comp', compPartsOf(COMP, 'projects/x/d.comp', 'projects/x'));

  it('a comp written after its source leads: the source follows it', async () => {
    const changed = { ...COMP, items: [{ source: 'a.dsgn', params: { headline: 'New' } }, COMP.items[1]] };
    const s = store({ 'projects/x/d.comp': [JSON.stringify(changed), 20], 'projects/x/d.mdx': [source, 10] });
    expect(await settlePair(s.io, 'projects/x/d.comp')).toBe('source');
    expect(s.files['projects/x/d.mdx']![0]).toContain('New');
  });

  it('a source written after its comp leads: the comp follows it', async () => {
    const edited = source.replace('headline: Old', 'headline: Typed');
    const s = store({ 'projects/x/d.comp': [JSON.stringify(COMP), 10], 'projects/x/d.mdx': [edited, 20] });
    expect(await settlePair(s.io, 'projects/x/d.mdx')).toBe('comp');
    expect(JSON.parse(s.files['projects/x/d.comp']![0]).items[0].params.headline).toBe('Typed');
  });

  it('a pair in step writes nothing; a comp with no source is left alone', async () => {
    const s = store({ 'projects/x/d.comp': [JSON.stringify(COMP), 10], 'projects/x/d.mdx': [source, 20] });
    expect(await settlePair(s.io, 'projects/x/d.comp')).toBe(null);
    const lone = store({ 'projects/x/d.comp': [JSON.stringify(COMP), 10] });
    expect(await settlePair(lone.io, 'projects/x/d.comp')).toBe(null);
    expect(s.writes.concat(lone.writes)).toEqual([]);
  });
});

describe('companionOf — a pair moves together', () => {
  it('a comp takes its source; a source takes its comp', () => {
    expect(companionOf('projects/x/a.comp', 'projects/x/b.comp')).toEqual({ from: 'projects/x/a.mdx', to: 'projects/x/b.mdx' });
    expect(companionOf('projects/x/a.mdx', 'projects/y/a.mdx')).toEqual({ from: 'projects/x/a.comp', to: 'projects/y/a.comp' });
    expect(companionOf('projects/x/a.dsgn', 'projects/x/b.dsgn')).toBe(null);
    expect(companionOf('projects/x/a.comp', 'projects/x/a.mdx')).toBe(null);
  });

  it('the source that followed names its new comp, and nothing else changes', () => {
    const text = newSource({ comp: 'a.comp', title: 'T', parts: [{ header: [['name', 'One']], body: 'Body.' }] });
    const moved = retargetSource(text, 'b.comp');
    expect(moved).toContain('comp: b.comp');
    expect(moved.replace('b.comp', 'a.comp')).toBe(text);
  });
});

describe('intentAfterMove — the project follows its comps', () => {
  const INTENT = projectSourceFromComps({
    project: 'x',
    title: 'X',
    comps: [
      { name: 'a.comp', label: 'Launch' },
      { name: 'b.comp', label: 'Teaser' },
    ],
  });
  const comps = (t: string) => parseSource(t).parts.map((p) => p.header.find(([k]) => k === 'comp')?.[1]);

  it('a comp renamed keeps its part, which names the new file', async () => {
    const s = store({ 'projects/x/intent.mdx': [INTENT, 1] });
    expect(await intentAfterMove(s.io, 'projects/x/a.comp', 'projects/x/launch.comp')).toBe(true);
    expect(comps(s.files['projects/x/intent.mdx']![0])).toEqual(['launch.comp', 'b.comp']);
  });

  it('a rename whose new name already joined keeps the original part, once', async () => {
    const joined = setPart(addPart(INTENT, 'launch'), 2, { header: [['name', 'launch'], ['comp', 'launch.comp']] });
    const s = store({ 'projects/x/intent.mdx': [joined, 1] });
    expect(comps(joined)).toEqual(['a.comp', 'b.comp', 'launch.comp']);
    expect(await intentAfterMove(s.io, 'projects/x/a.comp', 'projects/x/launch.comp')).toBe(true);
    expect(comps(s.files['projects/x/intent.mdx']![0])).toEqual(['launch.comp', 'b.comp']);
  });

  it('a comp deleted leaves the intent; one moved away joins the other project', async () => {
    const s = store({ 'projects/x/intent.mdx': [INTENT, 1], 'projects/y/intent.mdx': [projectSourceFromComps({ project: 'y', title: 'Y', comps: [] }), 1] });
    expect(await intentAfterMove(s.io, 'projects/x/b.comp', null)).toBe(true);
    expect(comps(s.files['projects/x/intent.mdx']![0])).toEqual(['a.comp']);
    expect(await intentAfterMove(s.io, 'projects/x/a.comp', 'projects/y/a.comp')).toBe(true);
    expect(comps(s.files['projects/x/intent.mdx']![0])).toEqual([]);
    expect(comps(s.files['projects/y/intent.mdx']![0])).toEqual(['a.comp']);
  });

  it('a project with no intent is left alone', async () => {
    const s = store({});
    expect(await intentAfterMove(s.io, 'projects/x/a.comp', 'projects/x/b.comp')).toBe(false);
    expect(s.writes).toEqual([]);
  });
});

describe('version folders — a project iterated in rounds', () => {
  const INTENT = projectSourceFromComps({ project: 'x', title: 'X', comps: [{ name: 'hero.comp', label: 'Hero' }] });
  const comps = (t: string) => parseSource(t).parts.map((p) => p.header.find(([k]) => k === 'comp')?.[1]);

  it('a comp in v{n}/ is the project\'s; output/ and sessions/ are not', () => {
    expect(projectCompOf('projects/x/hero.comp')).toEqual({ projectRel: 'projects/x', file: 'hero.comp' });
    expect(projectCompOf('projects/x/v2/hero.comp')).toEqual({ projectRel: 'projects/x', file: 'v2/hero.comp' });
    expect(projectCompOf('projects/x/output/hero.comp')).toBeNull();
    expect(projectCompOf('projects/x/sessions/s1/hero.comp')).toBeNull();
    expect(projectCompOf('projects/x/v2/old/hero.comp')).toBeNull();
    expect(versionOfComp('hero.comp')).toBe(1);
    expect(versionOfComp('v3/hero.comp')).toBe(3);
  });

  it('a part names its comp with the version folder kept', () => {
    expect(compOfPart({ header: [['comp', 'v2/hero.comp']] })).toBe('v2/hero.comp');
    expect(compOfPart({ header: [['comp', 'projects/x/v2/hero.comp']] })).toBe('v2/hero.comp');
    expect(compOfPart({ header: [['comp', 'hero.comp']] })).toBe('hero.comp');
  });

  it('a new round moves its part forward instead of adding a second one', async () => {
    const s = store({ 'projects/x/intent.mdx': [INTENT, 1] });
    expect(await joinIntent(s.io, 'projects/x/v2/hero.comp')).toBe(true);
    expect(comps(s.files['projects/x/intent.mdx']![0])).toEqual(['v2/hero.comp']);
    expect(await joinIntent(s.io, 'projects/x/v3/hero.comp')).toBe(true);
    expect(comps(s.files['projects/x/intent.mdx']![0])).toEqual(['v3/hero.comp']);
  });

  it('an older round never takes the part back; a new piece in a round joins as its own part', async () => {
    const s = store({ 'projects/x/intent.mdx': [INTENT.replace('comp: hero.comp', 'comp: v2/hero.comp'), 1] });
    expect(await joinIntent(s.io, 'projects/x/v1/hero.comp')).toBe(true);
    expect(comps(s.files['projects/x/intent.mdx']![0])).toEqual(['v2/hero.comp', 'v1/hero.comp']);
    expect(await joinIntent(s.io, 'projects/x/v2/story.comp')).toBe(true);
    expect(comps(s.files['projects/x/intent.mdx']![0])).toEqual(['v2/hero.comp', 'v1/hero.comp', 'v2/story.comp']);
  });

  it('a comp renamed inside its round keeps its part', async () => {
    const s = store({ 'projects/x/intent.mdx': [INTENT.replace('comp: hero.comp', 'comp: v2/hero.comp'), 1] });
    expect(await intentAfterMove(s.io, 'projects/x/v2/hero.comp', 'projects/x/v2/launch.comp')).toBe(true);
    expect(comps(s.files['projects/x/intent.mdx']![0])).toEqual(['v2/launch.comp']);
  });
});
