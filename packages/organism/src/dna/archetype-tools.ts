/**
 * What each ARCHETYPE lends — the central capability list.
 *
 * ── The problem this solves ───────────────────────────────────────────────
 * Capability used to be authored per workspace: every agent shipped its own
 * `config/mcp*.json` naming its own tools. That is fine for one hand-built
 * workspace and wrong for a thousand customers, because it makes a tool list a
 * COPY. Add a tool, fix a dangerous one, and a thousand copies stay stale until
 * someone re-pushes each of them. The syvon workspace is the proof: its list sat
 * at 108 tools, 43 destructive, for months, because nothing propagates to a copy.
 *
 * So capability is DERIVED, not copied. A workspace declares one word — its
 * archetype — and the tool list comes from here, versioned in the repo, diffed
 * in review, shipped with the app. Change this file, deploy, and every workspace
 * of that archetype has the new surface on its next request. No push, no
 * migration, no stale copy.
 *
 * ── Why a DIFF, and not a replacement ─────────────────────────────────────
 * A workspace states its EXCEPTIONS — `disabled` and `local` — and never a copy
 * of the list.
 *
 * The first cut of this file did the opposite: a declaration replaced the
 * archetype default entirely, on the reasoning that an add/remove algebra puts
 * the effective list in two places and makes it readable in neither. That
 * objection was right about files and wrong about the system, because
 * REPLACEMENT FREEZES. A workspace that declares its own list stops receiving
 * new central tools forever — which is precisely the staleness the archetype
 * exists to end, re-entered through the escape hatch. A diff cannot freeze: a
 * tool added here reaches every workspace unless one explicitly turned it off.
 *
 * And the readability objection dies the moment there is a view that computes
 * the result (`/sandbox/agent-shape`). A toggle panel showing the effective
 * surface makes a diff strictly better than a copy.
 *
 * ── `declared`, and why it is still here ──────────────────────────────────
 * DEPRECATED. Nothing in production needs it: syvon's 28 and builder's 13 are
 * byte-identical to MAKER_TOOLS and ENGINEER_TOOLS, so both files are deletions
 * rather than migrations. It stays only until those two workspace files are
 * removed — a `ws push`, which is a production write and therefore its own
 * deliberate step. Delete this parameter with them.
 */

import type { AgentCard } from './agent-card';

/**
 * A MAKER's hands: read the workspace, and make things in it.
 *
 * Measured against the live registry 2026-08-16. Twenty-one reads that answer
 * straight back, and seven makes that DO run — but never on the borrowed path:
 * an orchestrator's commit gate refuses a write and republishes it as a signed
 * job, so these are carried to make the intent expressible, not to be executed
 * by a stranger in-process.
 *
 * DELIBERATELY ABSENT, and each for its own reason:
 *   run_terminal_command — a shell in someone else's workspace. An engineer has
 *     it and answers for it with a checked `repos` bound; a maker has no such
 *     bound.
 *   write_file / apply_diff / delete_file / move_file / rename_file /
 *   copy_file / upload_file — hand-editing another agent's tree. A change worth
 *     making is worth asking its owner to make.
 *   write_dna / apply_brand / import_* / compile_design_tokens — the brand IS
 *     the workspace, and a borrowed hand that repaints it is the one mistake
 *     nothing downstream detects: every later render looks internally
 *     consistent.
 *   update_*_settings / manage_autopilot / create_workflow — configuration has
 *     an owner.
 *   schedule_post — publishes on a clock, so the mistake surfaces later and
 *     somewhere else.
 *   run_solver / create_solver_artifact — agentic, unbounded, expensive.
 */
export const MAKER_TOOLS = [
  // Orient
  'get_workspace_structure', 'list_directory', 'find_files', 'search_workspace',
  // Read
  'read_file', 'read_file_meta', 'search_file_meta',
  'read_design', 'read_comp', 'read_sequence', 'read_format', 'read_react', 'read_asset',
  // Enumerate
  'list_sequences', 'list_formats', 'list_components', 'list_flows', 'list_workspace_fonts',
  // Judge
  'review_composition', 'validate_design',
  // Hand over
  'get_download_url',
  // Make — carried so the intent is expressible; delegated, never borrowed.
  'generate_image', 'generate_video', 'screenshot_design', 'render_sequence',
  'export_design', 'run_workflow', 'publish_feed',
] as const;

/**
 * An ENGINEER's hands: read a repo, edit it, run commands, report.
 *
 * NO `delete_file`, on purpose. Deletes in the content root are blocked and
 * deletes elsewhere are real with no undo outside git — an agent that can remove
 * a file it was asked to edit is a worse trade than one that has to ask.
 *
 * `apply_diff` is listed before `write_file` deliberately: rewriting a file
 * whole is how concurrent edits get clobbered, and more than one session works a
 * tree at a time.
 */
export const ENGINEER_TOOLS = [
  'run_terminal_command',
  'find_files', 'search_workspace', 'list_directory', 'read_file',
  'apply_diff', 'write_file',
  'move_file', 'rename_file', 'copy_file',
  'run_parallel_tasks', 'run_diagnostics', 'validate',
] as const;

/**
 * An ASSISTANT lends NOTHING, and that is the correct answer rather than an
 * unfinished one.
 *
 * An orchestrator's mini-MCP would be a way to make it work for you. Nothing it
 * can do is a capability another agent should borrow, and a delegation verb in
 * particular is refused by the mini-MCP factory anyway — lending hands must
 * never lend the authority to borrow someone else's.
 *
 * The consequence is deliberate: an assistant is served a reachable, honest,
 * inert server that lists zero tools.
 */
export const ASSISTANT_TOOLS = [] as const;

/**
 * What a maker lends to a SUBSCRIBER — someone who pays to use this agent but
 * does not own it.
 *
 * A strict subset of MAKER_TOOLS, and the difference is not "fewer reads" but a
 * different KIND of read.
 *
 * ── Enumerable vs semantic ────────────────────────────────────────────────
 * `list_directory` + `read_file` in a loop is a download of someone's
 * workspace. `search_workspace("brand voice for launch posts")` is an answer.
 * Both are reads; only one hands over the corpus. So the file tree —
 * `list_directory`, `get_workspace_structure`, `find_files`, `read_file`,
 * `get_download_url`, the sidecar searches — is absent, and what remains is
 * CATALOG enumeration (which formats exist) plus semantic search.
 *
 * That is what makes "a subscriber cannot browse the agent app" a real boundary
 * rather than a UI curtain: blocking the file browser while lending full
 * traversal would be a speed bump, not a wall.
 *
 * ── The makes are the product ─────────────────────────────────────────────
 * A subscriber is here to make things IN this brand. They are carried in full,
 * because the whole proposition is context from the owner, content to the
 * caller: reads resolve against the OWNER's workspace, writes land in the
 * SUBSCRIBER's, and the spend meters to whoever called. That binding is the
 * piece a subscription needs that same-account borrowing does not.
 *
 * ── OPEN: read_design / read_comp ────────────────────────────────────────
 * Absent here, and it is the one genuinely contested line. A subscriber wants
 * an exemplar to start from; handing over `read_design` hands over the source
 * of every design you have. Excluded on the bet that `hydrate_format` and
 * `run_workflow` give them a filled template without the source. Revisit if
 * "learn from my designs" turns out to be part of the product rather than the
 * thing being protected.
 */
export const MAKER_SHARED = [
  // Discover WHAT EXISTS — a catalog, not a file tree.
  'list_formats', 'list_components', 'list_workspace_fonts', 'list_sequences', 'list_flows',
  // Ask, rather than walk.
  'search_workspace',
  // Make. Reads bind to the owner's workspace; writes and spend to the caller's.
  'generate_image', 'generate_video', 'screenshot_design', 'render_sequence',
  'export_design', 'run_workflow', 'publish_feed',
] as const;

/**
 * Cross-account surfaces, per archetype.
 *
 * Only a maker has one. An assistant lends nothing to anyone; an engineer holds
 * a shell and is refused by cloud nodes entirely, so lending it across accounts
 * is not a narrower list but a category error; a validator judges work inside
 * one account and has no cross-account meaning yet.
 */
export const ARCHETYPE_SHARED: Partial<
  Record<NonNullable<AgentCard['archetype']>, readonly string[]>
> = {
  maker: MAKER_SHARED,
};

/**
 * A workspace's EXCEPTIONS to its archetype's surface — never a copy of it.
 *
 * Lives on the NODE rather than the workspace, and that is one mechanism doing
 * two jobs on purpose: a workspace's own agent IS a node, so "off for my
 * workspace" is that node's diff and "off for this mission" is a mission node's
 * diff. No second table, and no precedence rule to get wrong later.
 */
export interface ToolDiff {
  /** Archetype tools to withhold. Names not in the base are reported, not silently ignored. */
  disabled?: string[];
  /** Workspace-authored `.tool` scripts. ADDITIVE — alongside the base, never instead of it. */
  local?: string[];
}

/** Who is asking. Determines which of an agent's surfaces they see. */
export type ToolAudience = 'same-account' | 'subscriber';

/**
 * The tools an agent lends to a given audience.
 *
 * An audience with no declared surface gets NOTHING — never a fallback to the
 * wider list. A missing entry means "not thought about yet", and the safe
 * reading of that is zero.
 */
export function resolveSharedTools(
  card: AgentCard | null,
  declared: string[] | null,
  audience: ToolAudience,
  diff?: ToolDiff | null,
): string[] {
  const full = resolveExposedTools(card, declared, diff);
  if (audience === 'same-account') return full;
  const archetype = card?.archetype;
  if (!archetype) return [];
  const shared = ARCHETYPE_SHARED[archetype];
  if (!shared) return [];
  // Intersected with the effective list, so a workspace that narrowed its own
  // surface cannot have it widened again by the cross-account default.
  const allowed = new Set(full);
  return shared.filter((t) => allowed.has(t));
}

export const ARCHETYPE_TOOLS: Record<NonNullable<AgentCard['archetype']>, readonly string[]> = {
  maker: MAKER_TOOLS,
  engineer: ENGINEER_TOOLS,
  assistant: ASSISTANT_TOOLS,
};

/**
 * The tools an agent actually lends.
 *
 * @param card      its agent card — `archetype` is the only field read here
 * @param declared  what its own `config/mcp*.json` resolved to, or null when it
 *                  ships none. An EMPTY array is not null: a workspace that
 *                  deliberately declares nothing lends nothing, and must not
 *                  silently inherit an archetype's surface.
 *
 * No archetype means no default. An agent nothing routes to should not acquire
 * a capability surface by omission — that is how a workspace ends up lending
 * tools its owner never chose.
 */
export function resolveExposedTools(
  card: AgentCard | null,
  declared: string[] | null,
  diff?: ToolDiff | null,
): string[] {
  if (declared !== null) return [...declared]; // DEPRECATED — see the header.
  const archetype = card?.archetype;
  if (!archetype) return [];
  const base = ARCHETYPE_TOOLS[archetype] ?? [];
  if (!diff) return [...base];
  const off = new Set(diff.disabled ?? []);
  const kept = base.filter((t) => !off.has(t));
  // `local` is appended, and deduped against the base rather than shadowing it:
  // a workspace script sharing a registry tool's name must not silently take
  // over the call. Collisions are surfaced by `unknownDiffNames`.
  const have = new Set(kept);
  return [...kept, ...(diff.local ?? []).filter((t) => !have.has(t))];
}

/**
 * Names in a diff that refer to nothing — the report `unknownTools` should have
 * had for declarations, applied to the mechanism replacing them.
 *
 * `disabled: ['read_fil']` currently withholds nothing and says nothing, and the
 * gap only surfaces when someone wonders why a tool they turned off is still
 * being served. An exception that cannot be honoured should say so at the point
 * it is read — this is the same failure `sy` already demonstrates from the other
 * direction, declaring four names of which one resolves.
 */
export function unknownDiffNames(card: AgentCard | null, diff?: ToolDiff | null): string[] {
  if (!diff?.disabled?.length) return [];
  const archetype = card?.archetype;
  const base = new Set<string>(archetype ? (ARCHETYPE_TOOLS[archetype] ?? []) : []);
  return diff.disabled.filter((t) => !base.has(t));
}

/** Where a resolved list came from — for a report a human reads. */
export function exposedToolsSource(
  card: AgentCard | null,
  declared: string[] | null,
  diff?: ToolDiff | null,
): 'declared' | 'archetype' | 'archetype+diff' | 'none' {
  if (declared !== null) return 'declared';
  if (!card?.archetype) return 'none';
  const touched = (diff?.disabled?.length ?? 0) + (diff?.local?.length ?? 0);
  return touched > 0 ? 'archetype+diff' : 'archetype';
}
