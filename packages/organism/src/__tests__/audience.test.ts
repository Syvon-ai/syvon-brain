import { describe, expect, it } from 'vitest';
import { resolveAudience, toolAudienceFor, toolsForCaller, type AudienceFacts } from '../dna/audience';
import { MAKER_TOOLS, MAKER_SHARED } from '../dna/archetype-tools';
import type { AgentCard } from '../dna/agent-card';

const facts = (over: Partial<AudienceFacts> = {}): AudienceFacts => ({
  callerUserId: 'user_1',
  ownerUserId: 'user_owner',
  isWorkspaceMember: false,
  hasActiveSubscription: false,
  ...over,
});

const maker = { agentPersona: true, archetype: 'maker' } as AgentCard;

describe('resolveAudience', () => {
  it('recognises the owner', () => {
    expect(resolveAudience(facts({ callerUserId: 'user_owner' }))).toBe('owner');
  });

  it('recognises a workspace member', () => {
    expect(resolveAudience(facts({ isWorkspaceMember: true }))).toBe('same-account');
  });

  it('recognises a subscriber', () => {
    expect(resolveAudience(facts({ hasActiveSubscription: true }))).toBe('subscriber');
  });

  it('REFUSES a caller who matched no door', () => {
    // Never a fallback to the narrowest tier. An unrecognised caller is "not
    // thought about yet", and the safe reading of that is none.
    expect(resolveAudience(facts())).toBeNull();
  });

  it('refuses an anonymous caller even against an UNOWNED agent', () => {
    // The null === null trap: without the explicit guard, every anonymous
    // request would come out as the owner of every platform actor.
    expect(resolveAudience(facts({ callerUserId: null, ownerUserId: null }))).toBeNull();
    expect(resolveAudience(facts({ callerUserId: null, isWorkspaceMember: true }))).toBeNull();
  });

  it('prefers OWNER over membership when both are true', () => {
    expect(
      resolveAudience(facts({ callerUserId: 'user_owner', isWorkspaceMember: true })),
    ).toBe('owner');
  });

  it('still recognises an owner whose membership row is gone', () => {
    // The two are separate facts. Deciding on the weaker available answer is
    // how someone loses access to their own agent.
    expect(
      resolveAudience(facts({ callerUserId: 'user_owner', isWorkspaceMember: false })),
    ).toBe('owner');
  });

  it('prefers membership over a subscription when both are true', () => {
    // Someone who subscribed and was later added to the workspace should not
    // stay on the narrow surface.
    expect(
      resolveAudience(facts({ isWorkspaceMember: true, hasActiveSubscription: true })),
    ).toBe('same-account');
  });
});

describe('toolAudienceFor', () => {
  it('collapses owner and same-account onto one surface', () => {
    // Membership already grants the whole workspace, so withholding tools from
    // a member would be a curtain in front of an open door.
    expect(toolAudienceFor('owner')).toBe('same-account');
    expect(toolAudienceFor('same-account')).toBe('same-account');
  });

  it('keeps subscriber separate', () => {
    expect(toolAudienceFor('subscriber')).toBe('subscriber');
  });
});

describe('toolsForCaller', () => {
  it('gives the owner the full lent surface', () => {
    const out = toolsForCaller(maker, null, facts({ callerUserId: 'user_owner' }));
    expect(out.audience).toBe('owner');
    expect(out.tools).toEqual([...MAKER_TOOLS]);
  });

  it('gives a subscriber the narrow one', () => {
    const out = toolsForCaller(maker, null, facts({ hasActiveSubscription: true }));
    expect(out.audience).toBe('subscriber');
    expect(out.tools).toEqual([...MAKER_SHARED]);
    expect(out.tools).not.toContain('list_directory');
  });

  it('gives a stranger NOTHING, and says so', () => {
    // A refusal and a zero-tool surface are the same observable thing over
    // MCP, so collapsing them means no caller is served by a path that forgot
    // to check.
    const out = toolsForCaller(maker, null, facts());
    expect(out.audience).toBeNull();
    expect(out.tools).toEqual([]);
  });

  it('applies the node’s tool diff on top of the audience', () => {
    const out = toolsForCaller(maker, null, facts({ hasActiveSubscription: true }), {
      disabled: ['generate_image'],
    });
    expect(out.tools).not.toContain('generate_image');
    expect(out.tools).toContain('search_workspace');
  });

  it('cannot be WIDENED by a diff — a local tool reaches no subscriber', () => {
    // `local` adds to the full surface; the subscriber tier is then intersected
    // with it. A workspace script is not automatically part of what it sells.
    const out = toolsForCaller(maker, null, facts({ hasActiveSubscription: true }), {
      local: ['my_private_tool'],
    });
    expect(out.tools).not.toContain('my_private_tool');
  });
});
