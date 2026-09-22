/**
 * Route-declared skill selection.
 *
 * The two rejected alternatives are the reason this file exists: always-on puts
 * a chat tone note into an ad render, and ranking-by-prompt drops "how to write
 * a hook" from every brief that doesn't say "hook". Declared beats both.
 */
import { describe, it, expect } from 'vitest';
import { resolveSkillsForRoute, allReferencedSkills } from '../dna/skills-config';

const cfg = {
  $schema: 'skills/v1',
  routes: {
    all: ['brand-voice'],
    chat: ['conversation-manners'],
    generate: ['ad-anatomy', 'hook-formulas'],
  },
  workflows: { 'syvon-media': ['product-shot-copy'] },
};

describe('resolveSkillsForRoute', () => {
  it('gives each route the brand-wide guides plus its own', () => {
    expect(resolveSkillsForRoute(cfg, 'chat')).toEqual(['brand-voice', 'conversation-manners']);
    expect(resolveSkillsForRoute(cfg, 'generate')).toEqual(['brand-voice', 'ad-anatomy', 'hook-formulas']);
    // narrate declares none of its own — it still gets the brand-wide one.
    expect(resolveSkillsForRoute(cfg, 'narrate')).toEqual(['brand-voice']);
  });

  it('does not leak one route\'s skill into another', () => {
    expect(resolveSkillsForRoute(cfg, 'generate')).not.toContain('conversation-manners');
    expect(resolveSkillsForRoute(cfg, 'chat')).not.toContain('ad-anatomy');
  });

  it('adds the flow-specific guide only for that flow', () => {
    expect(resolveSkillsForRoute(cfg, 'generate', 'syvon-media')).toContain('product-shot-copy');
    expect(resolveSkillsForRoute(cfg, 'generate', 'other-flow')).not.toContain('product-shot-copy');
  });

  it('orders all → route → workflow, because prompt position carries weight', () => {
    expect(resolveSkillsForRoute(cfg, 'generate', 'syvon-media')).toEqual([
      'brand-voice', 'ad-anatomy', 'hook-formulas', 'product-shot-copy',
    ]);
  });

  it('dedupes when a skill is named twice', () => {
    const dup = { routes: { all: ['brand-voice'], generate: ['brand-voice', 'ad-anatomy'] } };
    expect(resolveSkillsForRoute(dup, 'generate')).toEqual(['brand-voice', 'ad-anatomy']);
  });

  it('tolerates the .md the author can see in the folder', () => {
    const withExt = { routes: { all: ['brand-voice.md'] } };
    expect(resolveSkillsForRoute(withExt, 'chat')).toEqual(['brand-voice']);
  });

  it('is inert for a brand that has not opted in', () => {
    // The parity guarantee: no config, junk config, empty config → no skills,
    // which is byte-identical to every brand's behaviour today.
    expect(resolveSkillsForRoute(null, 'chat')).toEqual([]);
    expect(resolveSkillsForRoute('nonsense', 'chat')).toEqual([]);
    expect(resolveSkillsForRoute({}, 'chat')).toEqual([]);
    expect(resolveSkillsForRoute({ routes: { chat: [1, null] } }, 'chat')).toEqual([]);
  });
});

describe('allReferencedSkills', () => {
  it('collects every name across routes and workflows', () => {
    expect(allReferencedSkills(cfg).sort()).toEqual(
      ['ad-anatomy', 'brand-voice', 'conversation-manners', 'hook-formulas', 'product-shot-copy']);
  });
});

/**
 * `assets/skills/_proposed/` — where an agent writes about its own behaviour.
 *
 * A skill file the model authored and that then reaches its own prompt
 * unreviewed is a prompt-injection surface with a very short supply chain. The
 * guard is in the ONE resolver every caller goes through rather than in each
 * loader, so there is no second place to forget it.
 */
describe('proposed skills are unreachable', () => {
  it('refuses a nested path, so _proposed can never be routed', () => {
    const cfg = { routes: { chat: ['_proposed/experiment', 'brand-voice'] } };
    expect(resolveSkillsForRoute(cfg, 'chat')).toEqual(['brand-voice']);
  });

  it('refuses traversal out of the folder, either separator', () => {
    const cfg = { routes: { all: ['../../../etc/passwd', '..\\windows\\system32'] } };
    expect(resolveSkillsForRoute(cfg, 'chat')).toEqual([]);
  });

  it('refuses a path in a workflow override too — every entry point, one filter', () => {
    const cfg = { workflows: { 'syvon-media': ['_proposed/sneaky'] } };
    expect(resolveSkillsForRoute(cfg, 'generate', 'syvon-media')).toEqual([]);
  });

  it('still accepts an ordinary flat name with the extension written out', () => {
    expect(resolveSkillsForRoute({ routes: { chat: ['brand-voice.md'] } }, 'chat')).toEqual(['brand-voice']);
  });

  it('excludes paths from allReferencedSkills, so the eval does not chase them', () => {
    expect(allReferencedSkills({ routes: { chat: ['_proposed/x', 'real'] } })).toEqual(['real']);
  });
});

describe('the orchestrate route', () => {
  it('resolves like any other route', () => {
    const cfg = { routes: { all: ['voice'], orchestrate: ['when-to-delegate'] } };
    expect(resolveSkillsForRoute(cfg, 'orchestrate')).toEqual(['voice', 'when-to-delegate']);
    // And does not leak into the others.
    expect(resolveSkillsForRoute(cfg, 'chat')).toEqual(['voice']);
  });
});
