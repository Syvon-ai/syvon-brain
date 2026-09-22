/**
 * `config/agent-persona.json` — the agent card.
 *
 * This file already existed and already meant something: `{ "agentPersona":
 * true }` is the marker `apps/scroll/src/lib/workspace.ts#isAgentPersona` reads
 * to build the honeycomb roster. So there was already a directory of agents,
 * and it listed HOW THEY LOOK (accent, logo, env map) rather than what they can
 * do. An orchestrator cannot route to an agent it cannot describe.
 *
 * The card adds the missing half to the file that already says "this workspace
 * is an agent", rather than introducing a second one. Every consequence of that
 * choice is a feature: it ships with `ws push` already, scroll already
 * discovers it, and a workspace that never opts in keeps behaving exactly as
 * before.
 *
 * ```json
 * {
 *   "agentPersona": true,
 *   "archetype": "assistant",
 *   "does": "Runs your day. Holds the thread, asks the right agent, reports back.",
 *   "delegatesTo": ["syvon", "builder"]
 * }
 * ```
 *
 * ── The archetype is not flavour ───────────────────────────────────────────
 * It decides POSTURE, and there are exactly three. `assistant` delegates and
 * keeps a small tool surface; `maker` executes over workspace content;
 * `engineer` executes over a git repo on a machine, which is a different trust
 * domain and why `repos` exists (see `SY-PLAN.md` §3.3 — that bound is enforced
 * at the spawn, never in a prompt).
 *
 * Parsing is TOLERANT in the same way `parseMcpDeclaration` is — a card with a
 * misspelled archetype loses the archetype, not the agent. What it must never
 * do is quietly repair a card into something the author did not write, so
 * problems are REPORTED by `checkAgentCard` rather than patched here. The file
 * mirrors authored intent; that is the property the whole reconcile depends on.
 */

/** The file, workspace-relative. Pre-existing — scroll reads it for the roster. */
export const AGENT_CARD_FILE = 'config/agent-persona.json';

/**
 * The three postures. Adding a fourth is a real design decision, not a config
 * change: each one implies a different answer to "may this agent delegate" and
 * "what is it bounded by".
 */
import type { AgentPermissions } from './agent-permissions';

export const AGENT_ARCHETYPES = ['assistant', 'maker', 'engineer'] as const;
export type AgentArchetype = (typeof AGENT_ARCHETYPES)[number];

export interface AgentCard {
  /** Always true — this is the roster marker, and the reason the file exists. */
  agentPersona: true;
  /** Posture. Absent is legal: an un-archetyped agent is simply not routed to. */
  archetype?: AgentArchetype;
  /** One line, written for ANOTHER AGENT to read when deciding who to ask. */
  does?: string;
  /**
   * Workspace slugs this agent may delegate to. Meaningful for `assistant`
   * ONLY — the star rule (`SY-PLAN.md` §3.2): one head delegates, executors
   * execute. Enforcement is `ask_agent` being absent from an executor's
   * allowlist; this field is the authored half of the same statement.
   */
  delegatesTo?: string[];
  /**
   * Absolute repo roots an `engineer` may be spawned in. THE SECURITY BOUNDARY,
   * and the reason it is data rather than prose: Builder's allowlist includes
   * `run_terminal_command`, so "builds only in its assigned repo" written into
   * a system prompt is an honour system with a shell behind it.
   */
  repos?: string[];
  /**
   * WHAT IT MAY DO WITHOUT BEING ASKED, per capability class.
   *
   * Projected from the manifest because the reader is von-node's commit gate,
   * which loads this column and cannot see the workspace file. Absent means the
   * archetype's defaults — `resolvePermissions` answers all seven classes for
   * every agent, so no reader has to re-derive a default and no two readers can
   * disagree. See `agent-permissions.ts`.
   */
  permissions?: AgentPermissions;

  // ── How it LOOKS ──────────────────────────────────────────────────────────
  //
  // Every field below is an OVERRIDE of something the platform already decides
  // by convention. That framing is the whole design: absent means exactly
  // today's behaviour, so adding these breaks no existing agent, and setting
  // one replaces a guess with a statement.
  //
  // They live here, beside `archetype` and `does`, because this file is already
  // the answer to "what is this agent" — and this module's own opening note
  // records that the file listed HOW THEY LOOK before it ever said what they
  // could do. The look was never authored though: it was derived in one app and
  // hardcoded in another, and the two halves never met. `AgentPersonaEntry`
  // (scroll) and `SyvonOrb`'s props (@syvon/ui) are a 1:1 mirror of each other
  // that no code path joins.

  /**
   * The orb's halo tint / accent. Overrides design-tokens `color.primary`,
   * which is the right default (an agent should look like its brand) and the
   * wrong one when the brand's primary is unreadable as a light source.
   */
  accent?: string;
  /**
   * Workspace-relative path to the mark on the orb. Overrides the
   * `assets/logo.svg` convention — for an agent whose face is not its logo.
   */
  logo?: string;
  /**
   * Workspace-relative path to the sphere's environment map. Overrides
   * `assets/visuals/sky.jpg`, which is currently a HARDCODED string in scroll
   * with no way to change it: every agent reflects the same sky, and the only
   * alternative is the procedural fallback that fires when the file is absent.
   * This is the field that actually gives an agent a distinct surface.
   */
  envMap?: string;
  /**
   * Workspace-relative path to the `.comp` that IS this agent — the persistent
   * companion baked into every answer, and the idle loop shown between them.
   *
   * Overrides the filename convention: today the companion is found by
   * matching `/(^|[-_])idle([-_.]|$)/i` against comp names, so an agent's face
   * is decided by whether someone remembered to put "idle" in a filename. That
   * works and should keep working; naming it here makes it deliberate.
   */
  avatarComp?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map((v) => v.trim());
}

/** A non-empty trimmed string, or undefined. Blank is absent, not empty. */
function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Is this a workspace-relative asset path, rather than a URL or an escape?
 *
 * Checked because these paths are resolved against a TENANT'S OWN asset route
 * and handed to a renderer. An absolute URL here would make one agent's face
 * load from somewhere the workspace does not control, and `..` would reach out
 * of the prefix that is the whole boundary. Neither is a use case; both are
 * quietly bad, so they are dropped and reported rather than resolved.
 */
function isWorkspacePath(value: string): boolean {
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return false; // http:, data:, file:, …
  if (value.startsWith('/') || value.startsWith('\\')) return false;
  return !value.split(/[\\/]/).includes('..');
}

function assetPath(value: unknown): string | undefined {
  const raw = text(value);
  return raw && isWorkspacePath(raw) ? raw : undefined;
}

export function isAgentArchetype(value: unknown): value is AgentArchetype {
  return typeof value === 'string' && (AGENT_ARCHETYPES as readonly string[]).includes(value);
}

/**
 * Narrow raw JSON to a card. Returns null when the file is not an agent marker
 * at all — which keeps ONE definition of "is this workspace an agent" and makes
 * this function a drop-in for the boolean check scroll already does.
 */
export function parseAgentCard(raw: unknown): AgentCard | null {
  if (!isRecord(raw) || raw.agentPersona !== true) return null;

  const delegatesTo = stringList(raw.delegatesTo);
  const repos = stringList(raw.repos);

  const accent = text(raw.accent);
  const logo = assetPath(raw.logo);
  const envMap = assetPath(raw.envMap);
  const avatarComp = assetPath(raw.avatarComp);

  return {
    agentPersona: true,
    ...(isAgentArchetype(raw.archetype) ? { archetype: raw.archetype } : {}),
    ...(typeof raw.does === 'string' && raw.does.trim() ? { does: raw.does.trim() } : {}),
    ...(delegatesTo.length ? { delegatesTo } : {}),
    ...(repos.length ? { repos } : {}),
    ...(accent ? { accent } : {}),
    ...(logo ? { logo } : {}),
    ...(envMap ? { envMap } : {}),
    ...(avatarComp ? { avatarComp } : {}),
  };
}

/**
 * What is wrong with an otherwise-parseable card, in the author's terms.
 *
 * Separate from parsing on purpose. `parseAgentCard` must not silently drop a
 * `delegatesTo` from a maker — the column would then disagree with the file it
 * is projected from, which is exactly the property `reconcile-exposed-tools`
 * exists to preserve. So the data survives and the discrepancy is reported at
 * push, to the person who wrote it.
 */
export function checkAgentCard(card: AgentCard, raw?: unknown): string[] {
  const problems: string[] = [];

  if (isRecord(raw) && raw.archetype !== undefined && !isAgentArchetype(raw.archetype)) {
    problems.push(
      `archetype "${String(raw.archetype)}" is not one of ${AGENT_ARCHETYPES.join(' | ')} — the card will carry none`,
    );
  }

  if (card.delegatesTo?.length && card.archetype && card.archetype !== 'assistant') {
    problems.push(
      `delegatesTo is set on a "${card.archetype}", but only an assistant delegates — ` +
        'the star rule keeps orchestration in one head (SY-PLAN.md §3.2)',
    );
  }

  if (card.repos?.length && card.archetype && card.archetype !== 'engineer') {
    problems.push(`repos is set on a "${card.archetype}", but only an engineer is repo-bound`);
  }

  if (card.archetype === 'engineer' && !card.repos?.length) {
    problems.push(
      'an engineer with no repos can be spawned nowhere — the host refuses every cwd until this names one',
    );
  }

  if (card.archetype && !card.does) {
    problems.push('no `does` line — an orchestrator picks who to ask by reading this');
  }

  // The visual overrides. Reported rather than repaired, for the same reason
  // everything else here is: a card that silently became something the author
  // did not write would disagree with the column it is projected into.
  if (isRecord(raw)) {
    for (const field of ['logo', 'envMap', 'avatarComp'] as const) {
      const written = raw[field];
      if (written !== undefined && card[field] === undefined) {
        problems.push(
          typeof written === 'string'
            ? `${field} "${written}" is not a workspace-relative path — a URL or a \`..\` cannot be ` +
              'resolved against this workspace\'s own asset route, so the card will carry none'
            : `${field} must be a workspace-relative path string — the card will carry none`,
        );
      }
    }
    if (raw.accent !== undefined && card.accent === undefined) {
      problems.push('accent must be a non-empty string (a CSS colour) — the card will carry none');
    }
  }

  return problems;
}

/** Does this card permit delegating to `slug`? Assistants only, by construction. */
export function mayDelegateTo(card: AgentCard | null, slug: string): boolean {
  if (!card || card.archetype !== 'assistant') return false;
  return (card.delegatesTo ?? []).includes(slug);
}
