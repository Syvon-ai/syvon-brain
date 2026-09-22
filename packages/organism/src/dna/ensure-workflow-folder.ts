/**
 * Ensure a workflow's folder structure exists in storage — the from-scratch
 * counterpart to `addWorkflowToWorkspace` (which copies a catalog Flow).
 *
 * Storage-agnostic: callers wire `readFile` / `writeFile` to R2 (studio + web)
 * or local fs (desktop) — same contract as `ensureBrandFolderStructureV7`.
 * Idempotent; existing files are never overwritten so repeated calls are safe
 * (self-healing on open).
 *
 * This seeds FILES ONLY. The `Workflow` DB row is the caller's job — it needs
 * `@syvon/database`, which this package deliberately does not depend on. The
 * two sanctioned ways a folder becomes a row:
 *   - the caller creates it directly (see the create-workflow brain route), or
 *   - `reconcileWorkflowsFromR2` mints it on the next `ws push`.
 * Either way `{slug}.flow` is the reserved entry graph that reconcile lifts
 * into `Workflow.graph`, so seeding it is what makes the workflow runnable.
 *
 * ── Two genres, two scaffolds ────────────────────────────────────────────
 * Real workspaces contain two distinct shapes of workflow, and seeding one
 * shape for the other produces a graph nothing can run:
 *
 *   'agent'   — the director genre (blackcodex/instagram, fortys/*). Prompt
 *               blocks + exemplar `file.*` nodes bound to one unnamed
 *               `io.workflow-root`. Carries `system.md` / `config.json` /
 *               `suggestions.json`. Exemplars are wired by the author later;
 *               a root with no bound exemplars falls back to "keep all".
 *   'utility' — the pipeline genre (genai/veo-clip, idyl/idyl). A small
 *               `io.variable`/`io.prompt` → generator → `io.output-asset`
 *               chain, NO root and none of the director furniture.
 *
 * The R6 spine (`io.context-in` → `agent.director` → `io.save-to-project`) is
 * deliberately NOT persisted — editors auto-mount it render-only, exactly as
 * `scripts/generate-catalog-flow-graph.ts` documents for catalog graphs.
 *
 * See `.schema/organism-map-v7.md` and `workflow-paths.ts`.
 */

import {
  getWorkflowItemPath,
  getWorkflowEntryGraphPath,
} from './workflow-paths';

type LogFn = (msg: string, meta?: Record<string, unknown>) => void;

export type WorkflowKind = 'agent' | 'utility';

export interface WorkflowFolderSeedData {
  /** Which scaffold to seed. See the genre notes above. */
  kind: WorkflowKind;
  /**
   * Director system prompt — written verbatim to `system.md` and mirrored as a
   * SINGLE `io.prompt` block so compile-parity holds by construction (no
   * section splitting; the author splits it in the editor when they want to).
   * `agent` kind only. Defaults to `DEFAULT_AGENT_SYSTEM_MD`.
   */
  systemPrompt?: string;
  /** Chat starter chips — `suggestions.json`. `agent` kind only; omitted when empty. */
  suggestions?: string[];
  /** Overrides merged over `DEFAULT_EDITING` in `config.json`. `agent` kind only. */
  editing?: Record<string, unknown>;
  /**
   * JSON-safe snapshot of the `io.workflow-root` node spec, stored as
   * `data.spec` — every director graph on disk carries one. Supplied by the
   * caller (`getNode('io.workflow-root')` from `@syvon/workflow-nodes`) so
   * this package needs no dependency on the node registry. Omitted when
   * absent; editors then hydrate from the live registry.
   */
  workflowRootSpec?: unknown;
}

export interface EnsureWorkflowFolderResult {
  /** Workspace-relative paths written by this call. */
  written: string[];
  /** Paths that already existed and were left untouched. */
  skipped: string[];
}

/**
 * Editing defaults for a new agent flow — the `config.json#editing` knobs the
 * composer's settings sheet reads and every generation inherits (merged over
 * this, then overridden per-request by `GenerateSettings`).
 *
 * The narrate/subtitle/music switches are seeded at their SEMANTIC defaults
 * (narrate on, subtitles on, music on, motion) so behaviour is unchanged AND the
 * seeded file is self-documenting — an author sees every knob it can flip. A
 * silent feed-post flow overrides `medium:'still', voiceEnabled:false,
 * musicEnabled:false` via the `editing` seed (create_workflow's `editing` param).
 *
 * The subtitle knobs are seeded at their neutral values rather than omitted:
 * `captionPosition:'auto'` IS the renderer's top-if-companion-else-center
 * derivation (same behaviour as leaving it out, but the author can see the knob
 * and pin an edge), and `captionStyle` names the brand block text style the
 * caption is typeset in — so subtitle type is a per-flow default like every
 * other editing choice, not a constant baked into the overlay.
 */
export const DEFAULT_EDITING: Record<string, unknown> = {
  medium: 'motion',
  pacing: 'relaxed',
  maxShots: 12,
  minShots: 5,
  tailHoldSec: 1.0,
  fallbackShotDurationSec: 5,
  minShotDurationSec: 2.0,
  transitionStyle: 'cut',
  voiceEnabled: true,
  voiceCaption: true,
  captionPosition: 'auto',
  captionStyle: 'h3-label',
  musicEnabled: true,
};

export const DEFAULT_AGENT_SYSTEM_MD = `# Director

You direct short branded pieces for this workflow.

## Voice

Follow the brand's voice. Do not invent claims the brand has not made.

## Structure

Open on the strongest idea, develop it once, and end on the brand mark.

## Output

Return ONE JSON object with a top-level \`shots\` array — even a single-frame
post is \`{ "shots": [ { "chosenExemplar": "<exact exemplar name>", "text": { "<slot>": "<copy>" } } ] }\`.
Never return a bare shot object. (The engine also enforces this envelope, but it
is stated here so the contract is legible in the prompt.)
`;

/**
 * The exposure block a NEW flow is seeded with: every knob is the user's.
 *
 * A motion flow is what the scaffold builds, and this is exactly what such a
 * flow gets when it declares nothing — seeded explicitly so the author can SEE
 * the five knobs and turn one off, rather than having to learn that the block
 * exists. A flow that becomes a still declares `off` here.
 *
 * A literal, not `synthesizeSettingsDecl`: organism depends on schema-engine
 * alone, and one seed constant is not worth a dependency on the contract
 * package. The two must agree — the motion branch of that function is this.
 */
export const DEFAULT_SETTINGS: Record<string, unknown> = {
  format: { mode: 'user', quality: 'hd' },
  voice: { mode: 'user' },
  captions: { mode: 'user' },
  music: { mode: 'user' },
  pacing: { mode: 'user' },
};

/**
 * `config.json` carries two blocks about generation, and they answer different
 * questions:
 *
 *   `editing`  — the flow's generation DEFAULTS: what a knob is SET to (merged
 *                over `DEFAULT_EDITING`, overridden per-request by
 *                `GenerateSettings`).
 *   `settings` — the flow's EXPOSURE: whether a knob can be set at all
 *                (`user` | `fixed` | `off`). Read by the composer's sheet to
 *                decide which rows exist, and enforced by the brain.
 *
 * `editing.voiceEnabled` / `musicEnabled` are legitimate flow-level ON/OFF
 * defaults (a silent feed-post flow sets them false). What stays brand-owned is
 * the voice IDENTITY — WHICH ElevenLabs voice speaks — read off the Brand row by
 * `assemble-agent-context`; the demo Flow's `audio.voice` block is therefore NOT
 * seeded (a per-flow copy would be a lie on disk).
 */
function buildConfig(editing?: Record<string, unknown>): string {
  return JSON.stringify(
    { editing: { ...DEFAULT_EDITING, ...(editing ?? {}) }, settings: DEFAULT_SETTINGS },
    null,
    2,
  ) + '\n';
}

interface GraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data?: Record<string, unknown>;
}

/** The director scaffold: one prompt block + one unnamed workflow-root. */
function buildAgentGraph(systemPrompt: string, rootSpec: unknown): string {
  const nodes: GraphNode[] = [
    {
      id: 'prompt:block-0',
      type: 'io.prompt',
      position: { x: -640, y: 0 },
      data: { text: systemPrompt, order: 0 },
    },
    {
      id: 'var:wf-root',
      type: 'io.workflow-root',
      position: { x: 440, y: 120 },
      // No exemplars are bound yet — the author wires `file.*` nodes into
      // `in` as they add them. An unbound root keeps all exemplars.
      data: rootSpec === undefined ? {} : { spec: rootSpec },
    },
  ];
  return JSON.stringify({ version: 1, nodes, edges: [] }, null, 2) + '\n';
}

/**
 * The pipeline scaffold: an input and an output, INTENTIONALLY UNWIRED.
 *
 * `io.prompt` emits a prompt and `io.output-asset` accepts an asset, so a
 * direct edge between them would be a type mismatch the graph validator
 * rejects. The author drops a generator in the middle and wires both sides.
 */
function buildUtilityGraph(): string {
  const nodes: GraphNode[] = [
    { id: 'prompt', type: 'io.prompt', position: { x: 0, y: 0 }, data: { text: '' } },
    { id: 'out', type: 'io.output-asset', position: { x: 700, y: 0 }, data: { name: 'output' } },
  ];
  return JSON.stringify({ version: 1, nodes, edges: [] }, null, 2) + '\n';
}

export async function ensureWorkflowFolderStructure(
  workspacePrefix: string,
  slug: string,
  data: WorkflowFolderSeedData,
  opts: {
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<void>;
    warn?: LogFn;
  },
): Promise<EnsureWorkflowFolderResult> {
  const prefix = workspacePrefix.replace(/\/+$/, '');
  const abs = (rel: string) => (prefix ? `${prefix}/${rel}` : rel);

  const result: EnsureWorkflowFolderResult = { written: [], skipped: [] };

  const systemPrompt = data.systemPrompt?.trim()
    ? `${data.systemPrompt.trim()}\n`
    : DEFAULT_AGENT_SYSTEM_MD;

  const files: Array<{ rel: string; content: string }> = [];

  if (data.kind === 'agent') {
    files.push({ rel: getWorkflowItemPath(slug, 'system.md'), content: systemPrompt });
    files.push({ rel: getWorkflowItemPath(slug, 'config.json'), content: buildConfig(data.editing) });
    if (data.suggestions && data.suggestions.length > 0) {
      files.push({
        rel: getWorkflowItemPath(slug, 'suggestions.json'),
        content: JSON.stringify({ suggestions: data.suggestions }, null, 2) + '\n',
      });
    }
    files.push({
      rel: getWorkflowEntryGraphPath(slug),
      content: buildAgentGraph(systemPrompt.trimEnd(), data.workflowRootSpec),
    });
  } else {
    files.push({ rel: getWorkflowEntryGraphPath(slug), content: buildUtilityGraph() });
  }

  for (const file of files) {
    const key = abs(file.rel);
    // Idempotent: an existing file is authored content, never clobbered.
    let exists = false;
    try {
      const current = await opts.readFile(key);
      exists = typeof current === 'string' && current.length > 0;
    } catch {
      exists = false;
    }
    if (exists) {
      result.skipped.push(file.rel);
      continue;
    }
    try {
      await opts.writeFile(key, file.content);
      result.written.push(file.rel);
    } catch (err) {
      opts.warn?.(`ensureWorkflowFolderStructure: failed to write ${key}`, { error: String(err) });
      throw err;
    }
  }

  return result;
}
