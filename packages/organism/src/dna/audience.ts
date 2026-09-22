/**
 * WHO IS ASKING — the one place an agent's access decision is made.
 *
 * An agent is reachable three ways, and they are not degrees of the same
 * permission; they come from different rows and mean different things.
 *
 *   owner         the account behind the actor           Actor.ownerUserId
 *   same-account  a member of the agent's workspace      WorkspaceMember
 *   subscriber    someone who pays to use it             Subscription
 *
 * ── Why a subscription is not a membership row ────────────────────────────
 * The rule everywhere else in this codebase is absolute: anything that looks
 * like "give X access" must end in a `WorkspaceMember` row. A subscription
 * cannot, and the reason is worth keeping next to the code — sessions live at
 * `workspaces/{ws}/projects/{slug}/sessions/{id}/` with NO user segment, so one
 * membership row hands over projects, media AND conversations at once. That is
 * the whole place, which is exactly what a subscriber must not get.
 *
 * The resolution: a subscriber is granted nothing in the owner's workspace. The
 * AGENT reads there, and did before any subscription existed. What is granted
 * is "you may invoke this agent" — a fact about the agent, which is why it
 * needs no membership row anywhere and why the rule survives untouched.
 *
 * ── Pure, and refusing by default ─────────────────────────────────────────
 * The facts are gathered by the caller (they span three databases) and the
 * decision is made here, so the part worth being sure about needs no fixture to
 * check. Anyone who matches nothing gets `null`, never a fallback to the
 * narrowest tier: an unrecognised caller is "not thought about yet", and the
 * safe reading of that is no access rather than a little.
 */

import type { AgentCard } from './agent-card';
import { resolveSharedTools, type ToolAudience, type ToolDiff } from './archetype-tools';

/** How a caller reaches an agent. Ordered widest first. */
export type Audience = 'owner' | 'same-account' | 'subscriber';

export interface AudienceFacts {
  /** The signed-in account, or null for an anonymous caller. */
  callerUserId: string | null;
  /** `Actor.ownerUserId` — the account behind this agent. */
  ownerUserId: string | null;
  /** Is the caller a `WorkspaceMember` of the workspace this agent reads? */
  isWorkspaceMember: boolean;
  /** Is there a live `Subscription` row for this caller and this agent? */
  hasActiveSubscription: boolean;
}

/**
 * Which door the caller came through, or null if none of them.
 *
 * Owner is checked before membership even though the owner is normally also a
 * member: the two are separate facts, and an owner whose membership row was
 * removed by an admin tool is still the owner. Deciding on the weaker of the
 * two available answers is how someone loses access to their own agent.
 */
export function resolveAudience(f: AudienceFacts): Audience | null {
  // An anonymous caller matches nothing — including an agent whose
  // `ownerUserId` is also null, which is a platform actor rather than an
  // invitation. Without this, `null === null` would make every anonymous
  // request the owner of every unowned agent.
  if (!f.callerUserId) return null;
  if (f.ownerUserId && f.callerUserId === f.ownerUserId) return 'owner';
  if (f.isWorkspaceMember) return 'same-account';
  if (f.hasActiveSubscription) return 'subscriber';
  return null;
}

/**
 * The tool tier an audience is served.
 *
 * Owner and same-account collapse to one surface deliberately: membership
 * already grants the whole workspace, so withholding tools from a member would
 * be a curtain in front of an open door. The distinction between them is worth
 * keeping in `Audience` for logging and for anything that later needs "may this
 * caller change settings", but it is not a capability boundary.
 */
export function toolAudienceFor(audience: Audience): ToolAudience {
  return audience === 'subscriber' ? 'subscriber' : 'same-account';
}

/**
 * The whole decision, end to end: who is asking, and what do they get.
 *
 * Returns an empty list for a caller who matched no door — a refusal and a
 * zero-tool surface are the same observable thing over MCP, and collapsing
 * them here means no caller can be served by a path that forgot to check.
 */
export function toolsForCaller(
  card: AgentCard | null,
  declared: string[] | null,
  facts: AudienceFacts,
  diff?: ToolDiff | null,
): { audience: Audience | null; tools: string[] } {
  const audience = resolveAudience(facts);
  if (!audience) return { audience: null, tools: [] };
  return {
    audience,
    tools: resolveSharedTools(card, declared, toolAudienceFor(audience), diff),
  };
}
