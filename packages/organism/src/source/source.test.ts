import { describe, expect, it } from 'vitest';
import {
  addPart,
  addressFor,
  changedParts,
  compPartsOf,
  designWords,
  headerValue,
  isSourceText,
  movePart,
  newSource,
  orderLikeComp,
  compOrderKey,
  parseHeader,
  parseSource,
  partHashes,
  partLabel,
  partName,
  removePart,
  rewritePart,
  rewriteSource,
  serializeSource,
  setHead,
  setPart,
  sourceFilingFor,
  sourceFromComp,
  sourcePathFor,
  writeHeader,
} from './index';

const SRC = [
  '---',
  '$schema: source/v1',
  'comp: "launch.comp"',
  'title: Product introduction',
  '---',
  'Calm pacing.  Our brand.',
  '',
  '---',
  'name: Opening',
  'page: 01-opening.dsgn',
  'headline: "Bring your work to life: now"',
  '---',
  'Slow push in.',
  '',
  '## A heading inside a part is just Markdown',
  '',
  '---',
  'name: Demonstration',
  'tags:',
  '  - a',
  '  - b',
  '---',
  'One source, two results.',
  '```',
  '---',
  '```',
  '',
  '',
  '---',
  'The closing, with no header.',
].join('\n');

describe('parseSource', () => {
  it('reads the file header, the treatment, and parts set off by lines', () => {
    const doc = parseSource(SRC);
    expect(headerValue(doc.frontmatter, '$schema')).toBe('source/v1');
    expect(headerValue(doc.frontmatter, 'comp')).toBe('launch.comp');
    expect(doc.title).toBe('Product introduction');
    expect(doc.treatment).toBe('Calm pacing.  Our brand.');
    expect(doc.parts.map((p, i) => partName(p, i))).toEqual(['Opening', 'Demonstration', 'Part 3']);
    expect(doc.parts[0]!.header).toEqual([
      ['name', 'Opening'],
      ['page', '01-opening.dsgn'],
      ['headline', 'Bring your work to life: now'],
    ]);
    expect(doc.parts[0]!.body).toBe('Slow push in.\n\n## A heading inside a part is just Markdown');
    expect(doc.parts[1]!.headerExtra).toEqual(['tags:', '  - a', '  - b']);
    expect(doc.parts[1]!.body).toContain('```\n---\n```');
    expect(doc.parts[2]!.header).toEqual([]);
    expect(doc.parts[2]!.body).toBe('The closing, with no header.');
  });

  it('gives every part its lines in the file', () => {
    const doc = parseSource(SRC);
    const lines = SRC.split('\n');
    for (const p of doc.parts) {
      expect(lines[p.line - 1]).toBe('---');
      expect(lines[p.lineEnd - 1]!.trim()).not.toBe('');
    }
    expect(doc.parts[0]!.line).toBe(8);
    expect(doc.parts[0]!.lineEnd).toBe(15);
  });

  it('round-trips byte for byte', () => {
    expect(serializeSource(parseSource(SRC))).toBe(SRC);
    expect(serializeSource(parseSource('---\nname: A\n---\nx'))).toBe('---\nname: A\n---\nx');
    expect(serializeSource(parseSource(''))).toBe('');
  });

  it('knows a source from a script', () => {
    expect(isSourceText(SRC)).toBe(true);
    expect(isSourceText('---\n$schema: script/v1\n---\n## Beat 1')).toBe(false);
  });
});

describe('the header YAML', () => {
  it('reads scalars, quoted strings and blocks, and writes them back readable', () => {
    const { header, extra } = parseHeader([
      'a: plain words',
      'b: "quoted: yes"',
      "c: 'it''s'",
      'd: 42',
      'e: true',
      'f: |',
      '  two',
      '  lines',
      'g: words # a comment',
    ]);
    expect(header).toEqual([
      ['a', 'plain words'],
      ['b', 'quoted: yes'],
      ['c', "it's"],
      ['d', 42],
      ['e', true],
      ['f', 'two\nlines'],
      ['g', 'words'],
    ]);
    expect(extra).toEqual([]);
    expect(writeHeader(header)).toEqual([
      'a: plain words',
      'b: "quoted: yes"',
      "c: it's",
      'd: 42',
      'e: true',
      'f: "two\\nlines"',
      'g: words',
    ]);
    expect(parseHeader(writeHeader([['x', 'true'], ['y', '- dash'], ['z', 'a #b']])).header).toEqual([
      ['x', 'true'],
      ['y', '- dash'],
      ['z', 'a #b'],
    ]);
  });
});

describe('editing', () => {
  it('changes one part and leaves every other byte alone', () => {
    const next = setPart(SRC, 0, { body: 'Hard cut.' });
    const before = parseSource(SRC);
    const after = parseSource(next);
    expect(after.parts[0]!.body).toBe('Hard cut.');
    expect(after.parts[1]!.raw).toBe(before.parts[1]!.raw);
    expect(after.parts[2]!.raw).toBe(before.parts[2]!.raw);
    expect(next.endsWith(SRC.slice(SRC.indexOf('---\nname: Demonstration')))).toBe(true);
  });

  it('edits a header key, keeping lines it could not read', () => {
    const doc = parseSource(SRC);
    const next = setPart(SRC, 1, { header: [...doc.parts[1]!.header, ['mood', 'bright']] });
    const p = parseSource(next).parts[1]!;
    expect(headerValue(p.header, 'mood')).toBe('bright');
    expect(p.headerExtra).toEqual(['tags:', '  - a', '  - b']);
  });

  it('is a no-op when nothing changed', () => {
    expect(setPart(SRC, 0, { body: parseSource(SRC).parts[0]!.body })).toBe(SRC);
  });

  it('edits the title and the treatment without touching the parts', () => {
    const next = setHead(SRC, { title: 'Intro', treatment: 'Fast.' });
    const doc = parseSource(next);
    expect(doc.title).toBe('Intro');
    expect(doc.treatment).toBe('Fast.');
    expect(doc.parts.map((p) => p.raw)).toEqual(parseSource(SRC).parts.map((p) => p.raw));
  });

  it('moves the last part up and keeps parts apart', () => {
    const next = movePart(SRC, 2, 0);
    const doc = parseSource(next);
    expect(doc.parts.map((p, i) => partName(p, i))).toEqual(['Part 1', 'Opening', 'Demonstration']);
    expect(next).toContain('The closing, with no header.\n\n---\nname: Opening');
  });

  it('adds and removes parts', () => {
    const added = addPart(SRC, 'Outro');
    expect(parseSource(added).parts.map((p, i) => partName(p, i))).toEqual(['Opening', 'Demonstration', 'Part 3', 'Outro']);
    expect(added).toContain('no header.\n\n---\nname: Outro\n---');
    const between = addPart(SRC, 'Middle', 1);
    expect(parseSource(between).parts.map((p, i) => partName(p, i))[1]).toBe('Middle');
    expect(parseSource(removePart(SRC, 1)).parts.map((p, i) => partName(p, i))).toEqual(['Opening', 'Part 2']);
  });
});

describe('paths', () => {
  it('pairs a comp with its source', () => {
    expect(sourcePathFor('projects/x/launch.comp')).toBe('projects/x/launch.mdx');
  });
});

const DECK = {
  $schema: 'seq/v2',
  mode: 'deck',
  meta: { label: 'Launch deck', description: 'For the board.' },
  items: [
    { source: 'cover.dsgn', inlineShot: { params: { headline: 'Hello', picture: 'assets/a.png' } } },
    { source: 'layout.dsgn' },
    { source: 'layout.dsgn' },
    { source: 'plain.dsgn' },
  ],
};

const MOTION = {
  $schema: 'seq/v2',
  mode: 'sequence',
  compositionType: 'motion',
  tracks: [
    { id: 'music', type: 'audio', items: [] },
    {
      id: 'video',
      type: 'video',
      items: [
        { id: 'b', startTime: 3, label: 'Second', inlineShot: { templatePath: 'shot.react' } },
        { id: 'a', startTime: 0, inlineShot: { templatePath: '../../templates/hook.react', params: { title: 'Hi' } } },
      ],
    },
  ],
};

describe('compPartsOf', () => {
  it('points a deck page at its own file, a shared layout or a page whose words the comp carries at the comp', () => {
    const parts = compPartsOf(DECK, 'projects/x/deck.comp', 'projects/x');
    expect(parts[3]).toMatchObject({ target: 'projects/x/plain.dsgn', label: 'Plain', src: 'plain.dsgn' });
    expect(parts[3]!.at).toBeUndefined();
    /* The comp draws its own copy of the cover's words over the page's. */
    expect(parts[0]).toMatchObject({ target: 'projects/x/deck.comp', at: 'page-1', src: 'cover.dsgn' });
    expect(parts[1]).toMatchObject({ target: 'projects/x/deck.comp', at: 'page-2' });
    expect(parts[2]).toMatchObject({ target: 'projects/x/deck.comp', at: 'page-3' });
  });

  it('points a video shot at the comp, by track and item, in time order', () => {
    const parts = compPartsOf(MOTION, 'projects/x/reel.comp', 'projects/x');
    expect(parts.map((p) => p.at)).toEqual(['video/a', 'video/b']);
    expect(parts.map((p) => p.label)).toEqual(['Hook', 'Second']);
  });
});

const COVER = [
  '<!--',
  '  @name: 01 — Cover',
  '  @category: brand',
  '  @description: Swiss cover. Inverted ground.',
  '                Slots: kicker, brand_name, index_1..7.',
  '-->',
  '<FormatCanvas width={100} height={100}>',
  '  <Text textStyle="kicker" data-slot="kicker" expose="color">Brand &amp; Book</Text>',
  '  <Text data-slot="brand_name">{"Syvon"}</Text>',
  '  <Asset data-slot="logo" src="assets/logo.svg" />',
  '  <Text data-slot="kicker">second copy is ignored</Text>',
  '</FormatCanvas>',
].join('\n');

describe('the words a page already says', () => {
  it('reads the name, the look and the slots from a design', () => {
    const w = designWords(COVER);
    expect(w.name).toBe('01 — Cover');
    expect(w.description).toBe('Swiss cover. Inverted ground.');
    expect(w.slots).toEqual([
      ['kicker', 'Brand & Book'],
      ['brand_name', 'Syvon'],
      ['logo', 'assets/logo.svg'],
    ]);
  });

  it('names a part, not a file', () => {
    expect(partLabel('01-cover.dsgn')).toBe('Cover');
    expect(partLabel('01 — Cover')).toBe('Cover');
    expect(partLabel('07-colour-application.dsgn')).toBe('Colour application');
    expect(partLabel('', 2)).toBe('Part 3');
  });
});

describe('sourceFromComp', () => {
  it('writes one part per page: named, pointed at its page, its slots in the header, its look below', () => {
    const comp = { mode: 'document', items: [{ source: '01-cover.dsgn', label: '01-cover.dsgn' }] };
    const parts = compPartsOf(comp, 'projects/b/book.comp', 'projects/b');
    const text = sourceFromComp(comp, 'book.comp', parts, { 'projects/b/01-cover.dsgn': COVER });
    expect(text).toBe(
      [
        '---',
        '$schema: source/v1',
        'comp: book.comp',
        'title: Book',
        '---',
        '',
        '---',
        'name: Cover',
        'page: 01-cover.dsgn',
        'kicker: Brand & Book',
        'brand_name: Syvon',
        'logo: assets/logo.svg',
        '---',
        'Swiss cover. Inverted ground.',
        '',
      ].join('\n'),
    );
    expect(isSourceText(text)).toBe(true);
  });

  it("the comp's own words come first, and a video part names its shot", () => {
    const deck = parseSource(sourceFromComp(DECK, 'deck.comp', compPartsOf(DECK, 'projects/x/deck.comp', 'projects/x')));
    expect(deck.title).toBe('Launch deck');
    expect(deck.treatment).toBe('For the board.');
    expect(deck.parts[0]!.header).toEqual([
      ['name', 'Cover'],
      ['page', 'cover.dsgn'],
      ['headline', 'Hello'],
      ['picture', 'assets/a.png'],
    ]);
    const reel = parseSource(sourceFromComp(MOTION, 'reel.comp', compPartsOf(MOTION, 'projects/x/reel.comp', 'projects/x')));
    expect(reel.parts.map((p) => headerValue(p.header, 'shot'))).toEqual(['a', 'b']);
  });
});

describe('sourceFilingFor', () => {
  const parts = compPartsOf(DECK, 'projects/x/deck.comp', 'projects/x');
  const text = sourceFromComp(DECK, 'deck.comp', parts);
  const base = { text, sourceRel: 'projects/x/deck.mdx', compRel: 'projects/x/deck.comp', projectRel: 'projects/x', parts };

  it('files ONE task for a whole run, on the comp', () => {
    const f = sourceFilingFor({ ...base, scope: 'whole', mode: 'run' })!;
    expect(f.target).toBe('projects/x/deck.comp');
    expect(f.at).toBeUndefined();
    expect(f.files).toEqual(['projects/x/deck.mdx']);
    expect(f.instruction).toContain('1. Cover');
  });

  it('files a part on its page, quoting its section and pointing at its lines', () => {
    const f = sourceFilingFor({ ...base, scope: 3, mode: 'run' })!;
    const p = parseSource(text).parts[3]!;
    expect(f.target).toBe('projects/x/plain.dsgn');
    expect(f.files).toEqual([`projects/x/deck.mdx:${p.line}-${p.lineEnd}`]);
    expect(f.instruction).not.toContain('inlineShot.params');
    expect(f.power).toBeUndefined();
  });

  it('sends a part whose words the comp carries to the comp, and says so', () => {
    const f = sourceFilingFor({ ...base, scope: 0, mode: 'run' })!;
    expect(f.target).toBe('projects/x/deck.comp');
    expect(f.at).toBe('page-1');
    expect(f.instruction).toContain('headline: Hello');
    expect(f.instruction).toContain('inlineShot.params');
  });

  it('follows a part to its page when the source was reordered', () => {
    const moved = movePart(text, 3, 0);
    const f = sourceFilingFor({ ...base, text: moved, scope: 0, mode: 'run' })!;
    expect(f.target).toBe('projects/x/plain.dsgn');
    expect(addressFor(parseSource(moved).parts[1]!, 1, parts)?.index).toBe(0);
  });

  it('realign is the cheap one', () => {
    const f = sourceFilingFor({ ...base, scope: 1, mode: 'realign' })!;
    expect(f.power).toBe(1);
    expect(f.instruction).toMatch(/^Realign only/);
  });

  it('a part the comp does not have yet asks for it to be added', () => {
    const more = addPart(text, 'Extra');
    const f = sourceFilingFor({ ...base, text: more, scope: 4, mode: 'run' })!;
    expect(f.target).toBe('projects/x/deck.comp');
    expect(f.instruction).toContain('Add part 5');
    expect(sourceFilingFor({ ...base, text: more, scope: 4, mode: 'realign' })).toBeNull();
  });

  it('no comp yet: make it in the project', () => {
    const f = sourceFilingFor({ ...base, compRel: null, parts: [], scope: 'whole', mode: 'run' })!;
    expect(f.target).toBe('projects/x');
    expect(f.instruction).toContain('projects/x/deck.comp');
  });
});

describe('rewrite — the comp back into the source', () => {
  const comp = { mode: 'document', items: [{ source: '01-cover.dsgn' }, { source: '02-next.dsgn' }] };
  const parts = compPartsOf(comp, 'projects/b/book.comp', 'projects/b');

  it("refreshes a part's slot words and keeps the person's name, keys and prose", () => {
    const mine = newSource({
      comp: 'book.comp',
      title: 'Book',
      parts: [{ header: [['name', 'My cover'], ['page', '01-cover.dsgn'], ['kicker', 'old'], ['mood', 'quiet']], body: 'Keep this.' }],
    });
    const next = parseSource(rewritePart(mine, 0, parts, { 'projects/b/01-cover.dsgn': COVER })).parts[0]!;
    expect(next.header).toEqual([
      ['name', 'My cover'],
      ['page', '01-cover.dsgn'],
      ['kicker', 'Brand & Book'],
      ['mood', 'quiet'],
      ['brand_name', 'Syvon'],
      ['logo', 'assets/logo.svg'],
    ]);
    expect(next.body).toBe('Keep this.');
  });

  it('adds a part for every page no part names yet', () => {
    const one = newSource({ comp: 'book.comp', title: 'Book', parts: [{ header: [['name', 'Cover'], ['page', '01-cover.dsgn']], body: '' }] });
    const next = parseSource(rewriteSource(one, parts));
    expect(next.parts.map((p) => headerValue(p.header, 'page'))).toEqual(['01-cover.dsgn', '02-next.dsgn']);
  });
});

describe('the first shape, healed', () => {
  const comp = { mode: 'document', items: [{ source: '01-cover.dsgn' }] };
  const parts = compPartsOf(comp, 'projects/b/book.comp', 'projects/b');
  const OLD = ['---', '$schema: source/v1', 'comp: "book.comp"', '---', '# Book', 'Why it exists.', '', '## Cover', 'Kicker: Old', ''].join('\n');

  it('replaces the old ## sections instead of writing the parts under them', () => {
    const doc = parseSource(rewriteSource(OLD, parts));
    expect(doc.title).toBe('Book');
    expect(doc.treatment).toBe('Why it exists.');
    expect(doc.parts.map((p) => headerValue(p.header, 'page'))).toEqual(['01-cover.dsgn']);
  });

  it('heals a source that was already rewritten once on top of the old shape', () => {
    /* The first rewrite ran before this healing existed: title in the header,
       old sections still in the treatment, new parts under them. */
    const once = OLD.replace('---\n# Book', 'title: Book\n---\n# Book') + '\n---\nname: Cover\npage: 01-cover.dsgn\n---\n';
    const doc = parseSource(rewriteSource(once, parts));
    expect(doc.treatment).not.toContain('## Cover');
    expect(doc.parts).toHaveLength(1);
  });
});

describe('the comp reordered, the source follows', () => {
  const comp = (order: string[]) => ({ mode: 'document', items: order.map((source) => ({ source })) });
  const before = compPartsOf(comp(['a.dsgn', 'b.dsgn', 'c.dsgn']), 'projects/x/x.comp', 'projects/x');
  const src = newSource({
    title: 'T',
    parts: [
      { header: [['name', 'A'], ['page', 'a.dsgn']], body: 'about a' },
      { header: [['name', 'Note']], body: 'no page — rides with A' },
      { header: [['name', 'B'], ['page', 'b.dsgn']], body: 'about b' },
      { header: [['name', 'C'], ['page', 'c.dsgn']], body: 'about c' },
    ],
  });
  const names = (t: string) => parseSource(t).parts.map((p, i) => partName(p, i));

  it("puts the parts in the comp's new order, each with its own text", () => {
    const after = compPartsOf(comp(['c.dsgn', 'a.dsgn', 'b.dsgn']), 'projects/x/x.comp', 'projects/x');
    const next = orderLikeComp(src, after);
    expect(names(next)).toEqual(['C', 'A', 'Note', 'B']);
    const byName = new Map(parseSource(next).parts.map((p, i) => [partName(p, i), p.body]));
    expect(byName.get('C')).toBe('about c');
    expect(compOrderKey(after)).not.toBe(compOrderKey(before));
  });

  it('matches pages built on one layout in the order they appear', () => {
    const twice = compPartsOf(comp(['l.dsgn', 'l.dsgn']), 'projects/x/x.comp', 'projects/x');
    const two = newSource({ title: 'T', parts: [
      { header: [['name', 'First'], ['page', 'l.dsgn']], body: '' },
      { header: [['name', 'Second'], ['page', 'l.dsgn']], body: '' },
    ] });
    expect(orderLikeComp(two, twice)).toBe(two);
  });

  it('leaves the text alone when it is already in order', () => {
    expect(orderLikeComp(src, before)).toBe(src);
  });
});

describe('Live', () => {
  it('finds exactly the parts that changed', () => {
    const src = newSource({ title: 'T', parts: [{ header: [['name', 'A']], body: 'a' }, { header: [['name', 'B']], body: 'b' }] });
    const last = partHashes(src);
    expect(changedParts(src, last)).toEqual([]);
    expect(changedParts(setPart(src, 1, { body: 'b!' }), last)).toEqual([1]);
    expect(changedParts(setPart(src, 1, { body: 'b  ' }), last)).toEqual([]);
    expect(changedParts(addPart(src, 'C'), last)).toEqual([2]);
  });
});
