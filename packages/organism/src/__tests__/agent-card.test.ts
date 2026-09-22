import { describe, it, expect } from 'vitest';
import {
  AGENT_ARCHETYPES,
  checkAgentCard,
  mayDelegateTo,
  parseAgentCard,
  type AgentCard,
} from '../dna/agent-card';

describe('parseAgentCard', () => {
  it('reads the full card', () => {
    expect(
      parseAgentCard({
        agentPersona: true,
        archetype: 'assistant',
        does: 'Holds the thread.',
        delegatesTo: ['syvon', 'builder'],
      }),
    ).toEqual({
      agentPersona: true,
      archetype: 'assistant',
      does: 'Holds the thread.',
      delegatesTo: ['syvon', 'builder'],
    });
  });

  it('accepts the bare pre-existing marker — every agent workspace shipped this', () => {
    // The file predates the card. A workspace that never opts in must keep
    // behaving exactly as it did, so this cannot become an error.
    expect(parseAgentCard({ agentPersona: true })).toEqual({ agentPersona: true });
  });

  it('is NOT a card when the marker is absent or false', () => {
    expect(parseAgentCard({ archetype: 'maker' })).toBeNull();
    expect(parseAgentCard({ agentPersona: false, archetype: 'maker' })).toBeNull();
    expect(parseAgentCard(null)).toBeNull();
    expect(parseAgentCard('nonsense')).toBeNull();
    expect(parseAgentCard([{ agentPersona: true }])).toBeNull();
  });

  it('drops an unknown archetype rather than the whole agent', () => {
    const card = parseAgentCard({ agentPersona: true, archetype: 'wizard', does: 'x' });
    expect(card).toEqual({ agentPersona: true, does: 'x' });
  });

  it('drops unknown keys, so `_comment` never reaches the column', () => {
    const card = parseAgentCard({ agentPersona: true, archetype: 'maker', _comment: ['why'] });
    expect(card).not.toHaveProperty('_comment');
  });

  it('ignores non-string and blank list entries', () => {
    expect(
      parseAgentCard({ agentPersona: true, archetype: 'assistant', delegatesTo: ['a', 1, null, '  ', ' b '] }),
    ).toEqual({ agentPersona: true, archetype: 'assistant', delegatesTo: ['a', 'b'] });
  });

  it('omits empty lists rather than storing []', () => {
    const card = parseAgentCard({ agentPersona: true, archetype: 'maker', delegatesTo: [], repos: [] })!;
    expect(card).not.toHaveProperty('delegatesTo');
    expect(card).not.toHaveProperty('repos');
  });
});

describe('checkAgentCard', () => {
  const card = (over: Partial<AgentCard>): AgentCard => ({ agentPersona: true, does: 'x', ...over });

  it('is silent on a well-formed assistant', () => {
    expect(checkAgentCard(card({ archetype: 'assistant', delegatesTo: ['syvon'] }))).toEqual([]);
  });

  it('is silent on the bare marker — no archetype, nothing to be wrong about', () => {
    expect(checkAgentCard({ agentPersona: true })).toEqual([]);
  });

  it('flags delegatesTo on an executor — this is the star rule', () => {
    const problems = checkAgentCard(card({ archetype: 'maker', delegatesTo: ['builder'] }));
    expect(problems.join(' ')).toMatch(/only an assistant delegates/);
    expect(checkAgentCard(card({ archetype: 'engineer', delegatesTo: ['sy'], repos: ['/r'] })).join(' '))
      .toMatch(/only an assistant delegates/);
  });

  it('flags an engineer bounded to no repo — it can be spawned nowhere', () => {
    expect(checkAgentCard(card({ archetype: 'engineer' })).join(' ')).toMatch(/spawned nowhere/);
  });

  it('flags repos on a non-engineer', () => {
    expect(checkAgentCard(card({ archetype: 'maker', repos: ['/r'] })).join(' ')).toMatch(/only an engineer is repo-bound/);
  });

  it('reports a misspelled archetype, which parsing silently dropped', () => {
    const raw = { agentPersona: true, archetype: 'wizard', does: 'x' };
    const parsed = parseAgentCard(raw)!;
    // Parsing alone would leave no trace of the typo — this is why `raw` is
    // passed through, and why the check is separate from the parse.
    expect(parsed.archetype).toBeUndefined();
    expect(checkAgentCard(parsed, raw).join(' ')).toMatch(/is not one of assistant \| maker \| engineer/);
  });

  it('flags an archetyped agent with no `does` — nobody can route to it', () => {
    expect(checkAgentCard({ agentPersona: true, archetype: 'maker' }).join(' ')).toMatch(/`does` line/);
  });
});

describe('mayDelegateTo', () => {
  const sy: AgentCard = { agentPersona: true, archetype: 'assistant', delegatesTo: ['syvon'] };

  it('permits only what the card names', () => {
    expect(mayDelegateTo(sy, 'syvon')).toBe(true);
    expect(mayDelegateTo(sy, 'builder')).toBe(false);
  });

  it('refuses for every non-assistant, whatever the card says', () => {
    // Belt and braces with `checkAgentCard`: a maker that somehow carries
    // delegatesTo still cannot delegate. The star rule is enforced, not advised.
    const maker: AgentCard = { agentPersona: true, archetype: 'maker', delegatesTo: ['builder'] };
    expect(mayDelegateTo(maker, 'builder')).toBe(false);
    expect(mayDelegateTo({ agentPersona: true, delegatesTo: ['x'] }, 'x')).toBe(false);
    expect(mayDelegateTo(null, 'syvon')).toBe(false);
  });
});

describe('AGENT_ARCHETYPES', () => {
  it('is exactly three — a fourth is a design decision, not a config change', () => {
    expect([...AGENT_ARCHETYPES]).toEqual(['assistant', 'maker', 'engineer']);
  });
});

/**
 * How an agent LOOKS.
 *
 * Every one of these is an override of something the platform already decides
 * by convention, so the property that matters most is that ABSENT changes
 * nothing — otherwise adding the fields would restyle every agent that has not
 * authored them.
 */
describe('the visual fields', () => {
  it('reads all four', () => {
    const card = parseAgentCard({
      agentPersona: true,
      archetype: 'assistant',
      accent: '#7C5CFF',
      logo: 'assets/faces/sy.svg',
      envMap: 'assets/visuals/dusk.jpg',
      avatarComp: 'workflows/orchestrate/agent_idle.comp',
    });
    expect(card).toMatchObject({
      accent: '#7C5CFF',
      logo: 'assets/faces/sy.svg',
      envMap: 'assets/visuals/dusk.jpg',
      avatarComp: 'workflows/orchestrate/agent_idle.comp',
    });
  });

  it('leaves a card without them EXACTLY as it was', () => {
    // The compatibility guarantee, as an assertion. An agent that authored
    // none of this must parse to the same object it did before the fields
    // existed — absent keys, not empty strings.
    const card = parseAgentCard({ agentPersona: true, archetype: 'maker', does: 'Builds.' });
    expect(card).toEqual({ agentPersona: true, archetype: 'maker', does: 'Builds.' });
  });

  it('treats blank as absent', () => {
    const card = parseAgentCard({ agentPersona: true, accent: '   ', logo: '' });
    expect(card).toEqual({ agentPersona: true });
  });

  it('REFUSES a URL where a workspace path belongs', () => {
    // These are resolved against a tenant's own asset route. An absolute URL
    // would load one agent's face from somewhere the workspace does not
    // control, which is not a use case — it is a way in.
    for (const bad of ['https://evil.example/x.svg', 'data:image/svg+xml,<svg/>', 'file:///etc/passwd']) {
      expect(parseAgentCard({ agentPersona: true, logo: bad })).toEqual({ agentPersona: true });
    }
  });

  it('REFUSES a path that climbs out of the workspace', () => {
    for (const bad of ['../other-tenant/logo.svg', 'assets/../../x.jpg', '/etc/hosts', '\\server\share']) {
      expect(parseAgentCard({ agentPersona: true, envMap: bad })).toEqual({ agentPersona: true });
    }
  });

  it('keeps a path that merely CONTAINS two dots', () => {
    // `..` is a path SEGMENT, not a substring. Refusing on substring would
    // reject an ordinary filename and teach people the field is broken.
    const card = parseAgentCard({ agentPersona: true, envMap: 'assets/visuals/sky..hdr.jpg' });
    expect(card?.envMap).toBe('assets/visuals/sky..hdr.jpg');
  });

  it('reports a dropped field to its author instead of repairing it', () => {
    const raw = { agentPersona: true, archetype: 'maker', does: 'x', logo: 'https://cdn.example/a.svg' };
    const problems = checkAgentCard(parseAgentCard(raw)!, raw);
    expect(problems.join(' ')).toMatch(/logo .*is not a workspace-relative path/);
  });

  it('reports a non-string too', () => {
    const raw = { agentPersona: true, archetype: 'maker', does: 'x', avatarComp: 42 };
    const problems = checkAgentCard(parseAgentCard(raw)!, raw);
    expect(problems.join(' ')).toMatch(/avatarComp must be a workspace-relative path string/);
  });

  it('says nothing about fields the author never wrote', () => {
    const raw = { agentPersona: true, archetype: 'maker', does: 'Builds.' };
    expect(checkAgentCard(parseAgentCard(raw)!, raw)).toEqual([]);
  });
});
