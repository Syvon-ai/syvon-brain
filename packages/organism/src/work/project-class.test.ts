import { describe, expect, it } from 'vitest';
import {
  PROJECT_CLASS_SCHEMA,
  classifyTemplateRef,
  parseProjectClass,
  projectClassPath,
  projectKind,
  resolveProjectClass,
  FALLBACK_PROJECT_ICON,
  type ProjectClass,
} from './project-class';

function cls(over: Partial<ProjectClass> = {}): ProjectClass {
  return { schema: PROJECT_CLASS_SCHEMA, kind: 'social-content', ...over };
}

describe('project classification', () => {
  it('round trips a classified project', () => {
    const v = cls({ subtype: 'reel', axes: { behavior: 'motion', ratios: ['9:16'] }, styleRef: 'catalog/templates/social/reels' });
    const r = parseProjectClass(JSON.stringify(v));
    expect(r).toEqual({ ok: true, value: v });
    expect(projectClassPath('spring-launch')).toBe('projects/spring-launch/project.json');
  });

  it('rejects unknown fields and a wrong schema version', () => {
    expect(parseProjectClass({ ...cls(), extra: true }).ok).toBe(false);
    expect(parseProjectClass({ ...cls(), schema: 'project-class/v2' }).ok).toBe(false);
  });

  it('keeps a kind this build has never heard of, resolved as unknown', () => {
    const r = parseProjectClass(cls({ kind: 'holodeck-sim' }));
    expect(r.ok).toBe(true);
    const resolved = resolveProjectClass((r as { ok: true; value: ProjectClass }).value);
    expect(resolved.kind).toBeNull();
    expect(resolved.icon).toBe(FALLBACK_PROJECT_ICON);
  });

  it('rejects malformed kinds, subtypes, axes and refs', () => {
    for (const bad of [
      cls({ kind: 'Presentation' }),
      cls({ subtype: 'Reel' }),
      cls({ axes: { behavior: 'Motion' } }),
      { ...cls(), axes: { mood: 'playful' } as never },
      cls({ axes: { ratios: ['16:9x'] } }),
      cls({ styleRef: '../escape' }),
      cls({ styleRef: 'https://example.com/a' }),
    ]) expect(parseProjectClass(bad).ok).toBe(false);
    expect(parseProjectClass(null).ok).toBe(false);
    expect(parseProjectClass('{').ok).toBe(false);
  });

  it('derives icon from subtype then kind, explicit wins', () => {
    expect(resolveProjectClass(cls({ subtype: 'reel' })).icon).toBe('share');
    expect(resolveProjectClass(cls({ icon: 'bolt' })).icon).toBe('bolt');
    expect(resolveProjectClass(cls({ subtype: 'reel' })).axes).toEqual({ behavior: 'motion', unit: 'sequence', surface: 'vertical-video' });
  });

  it('classifies catalog refs onto kinds and subtypes', () => {
    expect(classifyTemplateRef('catalog/templates/social/reels')).toEqual({ kind: 'social-content', subtype: 'reel' });
    expect(classifyTemplateRef('catalog/templates/documents/report')).toEqual({ kind: 'document', subtype: 'report' });
    expect(classifyTemplateRef('catalog/templates/social/instagram-ads')).toEqual({ kind: 'social-content', subtype: 'social-ad' });
    expect(classifyTemplateRef('catalog/templates/advertising/amazon-listing')).toEqual({ kind: 'advertising', subtype: 'retail-media' });
    expect(classifyTemplateRef('catalog/templates/brand/brand-guidelines')).toEqual({ kind: 'brand-guideline' });
    // A presentation theme is a language, not a subtype.
    expect(classifyTemplateRef('catalog/templates/presentations/monolith')).toEqual({ kind: 'presentation' });
  });

  it('classifies nothing outside the catalog the registry knows', () => {
    expect(classifyTemplateRef('templates/my-poster')).toBeNull();
    expect(classifyTemplateRef('catalog/templates/unknown-thing')).toBeNull();
  });

  it('registers every kind with an icon and a unique id', () => {
    const ids = new Set<string>();
    for (const key of ['presentation', 'social-content', 'video', 'motion-design', 'document']) {
      const k = projectKind(key);
      expect(k?.icon).toBeTruthy();
      ids.add(key);
    }
    expect(ids.size).toBe(5);
  });
});
