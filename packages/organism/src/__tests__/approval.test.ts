import { describe, it, expect } from 'vitest';
import { parseApproval, approvalCovers, makeApproval, isApprovableFile } from '../approval';
import { approvedEntries, hasApprovals, parseTemplateManifest } from '../dna/template-paths';

/**
 * The stamp that says a PERSON approved a file for the agent to use.
 * Templates are the first consumer; any Syvon file is the next.
 */

const stamp = { by: 'u_1', at: '2026-09-17T10:00:00.000Z' };

describe('parseApproval', () => {
  it('reads a stamp from the entry or from the nested field', () => {
    expect(parseApproval({ approved: stamp })).toMatchObject(stamp);
    expect(parseApproval(stamp)).toMatchObject(stamp);
  });

  it('refuses a stamp with no author or no date — half a record reads as approved', () => {
    expect(parseApproval({ approved: { by: 'u_1' } })).toBeNull();
    expect(parseApproval({ approved: { at: '2026-09-17T10:00:00.000Z' } })).toBeNull();
    expect(parseApproval({ approved: { by: '  ', at: ' ' } })).toBeNull();
  });

  it('is null for anything that is not a stamp', () => {
    expect(parseApproval(null)).toBeNull();
    expect(parseApproval('yes')).toBeNull();
    expect(parseApproval({ slug: 'poster' })).toBeNull();
  });

  it('keeps the optional fields it understands and drops the rest', () => {
    const a = parseApproval({ approved: { ...stamp, note: ' for Q4 ', brand: 'acme', source: 'link', junk: 1 } })!;
    expect(a).toEqual({ ...stamp, note: 'for Q4', brand: 'acme', source: 'link' });
  });

  it('ignores a source it does not know rather than inventing provenance', () => {
    expect(parseApproval({ approved: { ...stamp, source: 'itself' } })!.source).toBeUndefined();
  });
});

describe('approvalCovers', () => {
  it('a workspace-wide stamp covers every brand', () => {
    const a = makeApproval('u_1');
    expect(approvalCovers(a, 'acme')).toBe(true);
    expect(approvalCovers(a, null)).toBe(true);
  });

  it('a brand stamp covers that brand only', () => {
    const a = makeApproval('u_1', { brand: 'acme' });
    expect(approvalCovers(a, 'acme')).toBe(true);
    expect(approvalCovers(a, 'other')).toBe(false);
  });

  it("covers nothing when the caller did not say which brand it is working for", () => {
    // "Approved for the other brand" is the mistake the field exists to stop.
    expect(approvalCovers(makeApproval('u_1', { brand: 'acme' }), null)).toBe(false);
  });

  it('no stamp is never covered — absent means not approved', () => {
    expect(approvalCovers(null, 'acme')).toBe(false);
  });
});

describe('the manifest carries the stamp', () => {
  const manifest = (approved: unknown) => parseTemplateManifest(JSON.stringify({
    $schema: 'catalog-examples/v1',
    title: 'Templates',
    examples: [
      { slug: 'poster', title: 'Poster', type: 'design', open: 'read_design', path: 'templates/poster.dsgn', approved },
      { slug: 'plain', title: 'Plain', type: 'design', open: 'read_design', path: 'templates/plain.dsgn' },
    ],
  }))!;

  it('parses a valid stamp through and drops a malformed one', () => {
    expect(manifest(stamp).examples[0]!.approved).toMatchObject(stamp);
    expect(manifest({ by: 'u_1' }).examples[0]!.approved).toBeUndefined();
  });

  it('filters to the approved set, and can tell "none yet" from "none match"', () => {
    const entries = manifest(stamp).examples;
    expect(approvedEntries(entries).map((e) => e.slug)).toEqual(['poster']);
    expect(hasApprovals(entries)).toBe(true);
    expect(hasApprovals(manifest(undefined).examples)).toBe(false);
  });

  it('a brand-scoped stamp filters by the brand being worked on', () => {
    const entries = manifest({ ...stamp, brand: 'acme' }).examples;
    expect(approvedEntries(entries, { brand: 'acme' })).toHaveLength(1);
    expect(approvedEntries(entries, { brand: 'other' })).toHaveLength(0);
  });
});

describe('isApprovableFile', () => {
  it('covers the four an agent can be pointed at', () => {
    for (const p of ['templates/poster.dsgn', 'a/b.comp', 'x/orbit.react', 'g/thing.gen']) {
      expect(isApprovableFile(p)).toBe(true);
    }
  });

  it('is case-insensitive, because a filename is whatever someone typed', () => {
    expect(isApprovableFile('templates/Poster.DSGN')).toBe(true);
  });

  it('leaves everything else alone — a photo reaches generation another way', () => {
    for (const p of ['assets/imagery/hero.jpg', 'assets/knowledge/note.md', 'config/brand.json', '']) {
      expect(isApprovableFile(p)).toBe(false);
    }
    expect(isApprovableFile(null)).toBe(false);
  });

  it('does not match an extension that merely contains one', () => {
    expect(isApprovableFile('notes.dsgn.bak')).toBe(false);
    expect(isApprovableFile('reactor')).toBe(false);
  });
});
