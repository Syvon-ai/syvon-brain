/**
 * WHAT AN AGENT MAY DO WITHOUT BEING ASKED — the third axis.
 *
 * ── The two that already existed ──────────────────────────────────────────
 * An agent's reach is bounded twice, and both bounds are real and enforced:
 *
 *   VERBS   `exposedTools` — the archetype's central list plus this
 *           workspace's exceptions. Which tools exist for this agent at all.
 *   PATHS   `scope` — the roots and files those verbs may touch. A catalogue
 *           agent cannot read `admin/` whatever tools it holds.
 *
 * ── The third, which did not ──────────────────────────────────────────────
 * Neither of them says whether the agent may ACT ALONE. That question was
 * answered, but nowhere anybody could see or set: the harness gates a tool when
 * `destructive || requiresConfirmation`, publishes an attest, and waits for an
 * `authorize` event. On an attended surface a person sends it. On an unattended
 * one nothing does, and the timeout is a refusal — so every write silently
 * failed, in a turn that otherwise read as working.
 *
 * That is a safe default and an unusable product. The fix is not to remove the
 * gate; it is to let the agent's own configuration answer it, which is what
 * this file is. `permissions` in `agents/{slug}/agent.json` states an authority
 * per capability class, the gate looks the tool up here, and the answer is
 * `allow` (authorize, and still attest — the receipt is the point), `ask` (wait
 * for a person, as today) or `deny` (refuse, naming the class).
 *
 * ── Why classes and not tool names ────────────────────────────────────────
 * The same reason `exposedTools` is an archetype plus a diff rather than a
 * copy: a per-tool permission list is stale the day a tool is added. A class is
 * stable — `write` means the same thing in a year — and a new tool joins its
 * class centrally, here, so every agent's answer for it is already correct.
 *
 * ── Why it lives in the organism ──────────────────────────────────────────
 * Three readers, no shared deployment: the harness inside von-node decides,
 * `ws push` projects it onto the actor, and the app draws it on the agent
 * screen. Beside the manifest is the only place all three can reach.
 */

import type { AgentArchetype, AgentCard } from './agent-card';

/**
 * WHAT A TOOL DOES, in the terms a person granting permission thinks in.
 *
 * Seven, and the boundaries are drawn where the CONSEQUENCE differs rather
 * than where the implementation does:
 *
 *   read       changes nothing. Listing, reading, previewing, validating,
 *              judging. Always safe to do alone; an agent that must ask before
 *              looking cannot answer anything.
 *   create     makes something that did not exist. A new design, a render, a
 *              generated image. Nothing is lost if it is wrong — you delete it.
 *   write      changes something that did exist. This is the class that
 *              deserves a decision: an edit overwrites work, and the previous
 *              version is gone unless the workspace kept one.
 *   delete     removes something. Separated from `write` because the mistake is
 *              not recoverable by editing back.
 *   publish    makes something PUBLIC or sends it. The consequence leaves the
 *              workspace and cannot be taken back by any local action.
 *   configure  changes how the workspace itself behaves — the brand's DNA,
 *              generation settings, a workflow. One of these silently changes
 *              every later render, which is why it is not `write`.
 *   run        executes something whose effects this file cannot see: a
 *              workspace `.tool` script, a shell, a solver.
 */
export const CAPABILITY_CLASSES = [
  'read',
  'create',
  'write',
  'delete',
  'publish',
  'configure',
  'run',
] as const;
export type Capability = (typeof CAPABILITY_CLASSES)[number];

/** One line for a person reading the agent screen. */
export const CAPABILITY_LABELS: Record<Capability, { label: string; hint: string }> = {
  read: { label: 'Read', hint: 'Look at what is here. Changes nothing.' },
  create: { label: 'Create', hint: 'Make something new. Nothing is lost if it is wrong.' },
  write: { label: 'Write', hint: 'Change a file that already exists.' },
  delete: { label: 'Delete', hint: 'Remove a file. Not undone by editing back.' },
  publish: { label: 'Publish', hint: 'Send it out. Leaves the workspace.' },
  configure: { label: 'Configure', hint: 'Change the brand or how the workspace works.' },
  run: { label: 'Run', hint: "Execute a script — effects this list cannot see." },
};

/** May it act alone? */
export const AUTHORITIES = ['allow', 'ask', 'deny'] as const;
export type Authority = (typeof AUTHORITIES)[number];

export const AUTHORITY_LABELS: Record<Authority, string> = {
  allow: 'on its own',
  ask: 'asks first',
  deny: 'never',
};

/**
 * THE CLASS OF EACH TOOL, where the fallback would get it wrong.
 *
 * Deliberately NOT exhaustive. `destructive` already separates the reads from
 * everything else and is maintained beside each tool, so the fallback below is
 * right for most of the registry; this map exists for the tools whose class is
 * a JUDGEMENT the metadata cannot carry — the difference between making a file
 * and overwriting one, between editing a design and repainting the brand.
 *
 * A tool absent from here is classified by `classify`'s fallback, so adding a
 * tool centrally never leaves an agent with an unanswerable permission.
 */
const EXPLICIT: Record<string, Capability> = {
  // ── create: new files, nothing overwritten ──
  hydrate_format: 'create',
  hydrate_template: 'create',
  use_template: 'create',
  create_sequence: 'create',
  generate_image: 'create',
  generate_vector: 'create',
  generate_video: 'create',
  generate_voice: 'create',
  generate_music: 'create',
  generate_sound_effect: 'create',
  render_text_mask: 'create',
  render_sequence: 'create',
  screenshot_design: 'create',
  export_design: 'create',
  upload_file: 'create',
  cut_shots: 'create',
  extract_media: 'create',
  remove_background: 'create',
  clean_vector: 'create',
  write_spreadsheet: 'create',
  write_document: 'create',
  /* A ticket is a NEW line in an append-only log — nothing it can overwrite,
     which the `destructive` flag alone cannot say. The tool itself refuses the
     rating and the status; what it writes is always marked `by: 'agent'`. */
  create_card: 'create',

  // ── write: an existing file changes ──
  write_file: 'write',
  apply_diff: 'write',
  edit_design_slots: 'write',
  edit_sequence: 'write',
  save_template: 'write',
  rename_file: 'write',
  move_file: 'write',
  copy_file: 'write',
  write_file_meta: 'write',
  // A card's status only — the tool itself refuses rating, urgency and
  // `reviewed`, which stay a person's.
  resolve_card: 'write',
  // A draft Post is a row pointing at a render — nothing leaves until a person
  // publishes or schedules it, which is why this is not `publish`.
  create_draft_post: 'write',

  // ── delete ──
  delete_file: 'delete',

  // ── publish: it leaves ──
  publish_feed: 'publish',
  schedule_post: 'publish',

  // ── configure: every later render changes ──
  write_dna: 'configure',
  apply_brand: 'configure',
  compile_design_tokens: 'configure',
  import_brand_from_url: 'configure',
  import_logo: 'configure',
  import_font: 'configure',
  update_generation_settings: 'configure',
  update_agent_settings: 'configure',
  create_workflow: 'configure',
  manage_autopilot: 'configure',
  save_workflow: 'configure',

  // ── run: effects this file cannot see ──
  run_tool: 'run',
  run_terminal_command: 'run',
  run_workflow: 'run',
  run_flow: 'run',
  run_solver: 'run',
  create_solver_artifact: 'run',
  run_parallel_tasks: 'run',
  script: 'run',
};

/**
 * Verbs that only ever LOOK — the name-only fallback.
 *
 * Used when a caller has a tool name and no registry entry, which is the agent
 * SCREEN's situation: it lists what an agent holds and has no executor to ask.
 * A prefix rule is a weak signal and it is used for exactly one thing — telling
 * a reader apart from a writer on a screen — never for a permission decision,
 * which always has `destructive` to hand (see `authorityForGatedTool`).
 */
const READ_PREFIXES = [
  'read_', 'list_', 'get_', 'search_', 'find_', 'show', 'preview_', 'describe_',
  'analyze_', 'inspect_', 'query_', 'validate', 'review_', 'extract_', 'transcribe_',
  'connection_', 'run_diagnostics',
];

/**
 * A tool's capability class.
 *
 * Three answers, in order:
 *
 *  1. `EXPLICIT` — the judgements the metadata cannot carry.
 *  2. the registry's `destructive`, when the caller has it: not destructive is
 *     `read`, destructive is `write`. Conservative on the second, because an
 *     unclassified tool that changes state is likelier to overwrite than to
 *     publish, and `write` is the class every making agent already grants.
 *  3. a NAME prefix, when there is no metadata at all.
 *
 * ## Step 3 does not default to `read`, and that was a real bug
 *
 * It did. The commit gate calls this with a tool name and nothing else, so an
 * unclassified tool — every tool not in `EXPLICIT`, including a customer's own
 * `.tool` script and every tool added centrally tomorrow — resolved to `read`,
 * whose authority is `allow` everywhere. The gate then authorized it. A widening
 * by OMISSION, which is the one thing a permission model must never do; caught
 * by the two existing gate tests, whose synthetic `write_thing` sailed through a
 * gate that had always held it.
 *
 * So an unrecognised name that does not look like a reader is `write`, and the
 * gate does not rely on this path at all — see `authorityForGatedTool`.
 *
 * A remote server's tool arrives as `{server}__{tool}`; the prefix is stripped
 * before the lookup so a customer's endpoint classifies like anything else.
 */
export function classifyTool(
  toolName: string,
  metadata?: { destructive?: boolean; requiresConfirmation?: boolean },
): Capability {
  const bare = toolName.includes('__') ? (toolName.split('__').pop() ?? toolName) : toolName;
  const explicit = EXPLICIT[bare];
  if (explicit) return explicit;
  if (metadata) {
    return !metadata.destructive && !metadata.requiresConfirmation ? 'read' : 'write';
  }
  return READ_PREFIXES.some((p) => bare.startsWith(p)) ? 'read' : 'write';
}

/** What an agent states. Absent classes fall to the archetype's default. */
export type AgentPermissions = Partial<Record<Capability, Authority>>;
/** Every class answered — what a gate and a screen both read. */
export type ResolvedPermissions = Record<Capability, Authority>;

/**
 * WHAT EACH ARCHETYPE MAY DO BY DEFAULT — so no workspace has to write this out,
 * and so a change of policy reaches every agent at once.
 *
 * The shape of all three: **an agent may do its own job alone, and asks before
 * anything it cannot take back.** That is the line the commit gate was always
 * for; what was missing was anybody saying which side of it a given verb sits.
 *
 * `deny` appears nowhere in the defaults. A capability an agent should not have
 * at all is expressed by not lending it the TOOLS — `deny` is for an agent that
 * holds a tool for a reason and must never fire it unattended, which is a real
 * case and a rare one.
 */
export const DEFAULT_PERMISSIONS: Record<AgentArchetype, ResolvedPermissions> = {
  /**
   * A MAKER makes things in its own workspace. Creating and editing IS the job,
   * so asking before each one is asking someone to sit through their own
   * commission. What it does not do alone is destroy, ship or repaint.
   */
  maker: {
    read: 'allow',
    create: 'allow',
    write: 'allow',
    delete: 'ask',
    publish: 'ask',
    configure: 'ask',
    run: 'ask',
  },
  /**
   * An ENGINEER edits a repo and runs commands — that is the whole posture, and
   * it is already bounded by `repos`, a checked list. `run` is `allow` here and
   * nowhere else for that reason: a shell inside a declared repo is the job; a
   * shell anywhere else is not reachable.
   */
  engineer: {
    read: 'allow',
    create: 'allow',
    write: 'allow',
    delete: 'ask',
    publish: 'ask',
    configure: 'ask',
    run: 'allow',
  },
  /**
   * An ASSISTANT answers and delegates. It should not be quietly writing: when
   * it holds a write tool at all, that is worth a person seeing.
   */
  assistant: {
    read: 'allow',
    create: 'ask',
    write: 'ask',
    delete: 'ask',
    publish: 'ask',
    configure: 'ask',
    run: 'ask',
  },
};

/**
 * The floor for an agent with no archetype.
 *
 * Read-only, and matching `resolveExposedTools`: no archetype means no tools,
 * so this is the permission table for an agent that can do nothing anyway. It
 * exists so every caller gets a complete table rather than an optional one.
 */
export const NO_ARCHETYPE_PERMISSIONS: ResolvedPermissions = {
  read: 'allow',
  create: 'ask',
  write: 'ask',
  delete: 'ask',
  publish: 'ask',
  configure: 'ask',
  run: 'ask',
};

function isAuthority(v: unknown): v is Authority {
  return typeof v === 'string' && (AUTHORITIES as readonly string[]).includes(v);
}

export function isCapability(v: unknown): v is Capability {
  return typeof v === 'string' && (CAPABILITY_CLASSES as readonly string[]).includes(v);
}

/** Parse the manifest's `permissions` block. Unknown classes and unknown
 *  authorities are DROPPED, not defaulted — `checkAgentPermissions` reports
 *  them, and a typo must never quietly widen what an agent may do. */
export function parseAgentPermissions(raw: unknown): AgentPermissions | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const out: AgentPermissions = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (isCapability(key) && isAuthority(value)) out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Names in a `permissions` block that mean nothing — the report a typo needs.
 *  A misspelt class or authority is silently dropped by the parser, and an
 *  agent whose author believes it said `"write": "ask"` and did not is exactly
 *  the failure this exists to surface. */
export function checkAgentPermissions(raw: unknown): string[] {
  if (raw === undefined) return [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return ['`permissions` must be an object of capability → allow | ask | deny'];
  }
  const problems: string[] = [];
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isCapability(key)) {
      problems.push(
        `\`permissions.${key}\` is not a capability — one of ${CAPABILITY_CLASSES.join(', ')}`,
      );
      continue;
    }
    if (!isAuthority(value)) {
      problems.push(
        `\`permissions.${key}\` is "${String(value)}" — must be ${AUTHORITIES.join(' | ')}`,
      );
    }
  }
  return problems;
}

/**
 * THE TABLE, complete: the archetype's defaults with the agent's own statements
 * over them.
 *
 * Every caller gets all seven classes answered, because a partial table forces
 * each reader to re-derive the default and that is how two of them come to
 * disagree — the same failure `resolveExposedTools` exists to prevent for
 * tools.
 */
export function resolvePermissions(
  card: AgentCard | null | undefined,
  stated?: AgentPermissions | null,
): ResolvedPermissions {
  const base = card?.archetype ? DEFAULT_PERMISSIONS[card.archetype] : NO_ARCHETYPE_PERMISSIONS;
  return { ...base, ...(stated ?? {}) };
}

/** What the agent may do about ONE tool call, given whatever the caller knows. */
export function authorityForTool(
  permissions: ResolvedPermissions,
  toolName: string,
  metadata?: { destructive?: boolean; requiresConfirmation?: boolean },
): { capability: Capability; authority: Authority } {
  const capability = classifyTool(toolName, metadata);
  return { capability, authority: permissions[capability] };
}

/**
 * THE GATE'S OWN ENTRY POINT — for a tool the harness has ALREADY decided is
 * gated.
 *
 * The harness gates on `destructive || requiresConfirmation`, so by the time a
 * call reaches the commit boundary that fact is known by construction. Saying
 * so here is what keeps an unrecognised tool out of `read`: whatever the name
 * looks like, a gated tool is at least a `write`, and the authority for the
 * class it lands in is the answer.
 *
 * A separate function rather than a flag, because the guarantee is the point: a
 * caller that reaches this one cannot accidentally ask the weaker question.
 */
export function authorityForGatedTool(
  permissions: ResolvedPermissions,
  toolName: string,
): { capability: Capability; authority: Authority } {
  return authorityForTool(permissions, toolName, { destructive: true });
}

/** Which classes an agent's tool list actually reaches — so a screen shows the
 *  permissions that MEAN something here and says the rest are moot. A `delete`
 *  row on an agent holding no delete tool is a question nobody has to answer. */
export function capabilitiesInUse(
  tools: readonly string[],
  metadataFor?: (name: string) => { destructive?: boolean; requiresConfirmation?: boolean } | undefined,
): Record<Capability, string[]> {
  const out = Object.fromEntries(CAPABILITY_CLASSES.map((c) => [c, [] as string[]])) as Record<
    Capability,
    string[]
  >;
  for (const tool of tools) out[classifyTool(tool, metadataFor?.(tool))].push(tool);
  return out;
}
