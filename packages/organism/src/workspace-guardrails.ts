/**
 * The two things an agent has to know before it builds inside a workspace, as
 * data — so the workspace's own `AGENTS.md` and the connector's `start_here`
 * say the same thing and cannot drift apart.
 *
 * WHY THEY EXIST. Both halves come from one measured failure: an agent spent an
 * hour writing its own reference-analysis pipeline — ffmpeg frame extraction,
 * hand-rolled image measurement, eyeballed hex values — beside
 * `analyze_reference_layout`, which already did all of it with the colours
 * matched to the brand's own design tokens; then it wrote the result into a
 * folder no loader reads, so the work steered nothing. Neither half was a bad
 * decision in isolation. Both were discovery failures, and a workspace that
 * says nothing is what makes them the DEFAULT outcome.
 *
 * `organism` is the home because it already owns the workspace contract — the
 * folders, the brand paths — and because both callers depend on it while the
 * agent package deliberately does not depend on workspace-sync.
 */

/** "You were about to build X" → the tool that already does it. */
export interface CapabilitySubstitution {
  /** What the agent is trying to do, in its own terms. */
  instead: string;
  /** The tool(s) to reach for. */
  use: string;
  /** What using it buys that a hand-rolled version cannot get. */
  because?: string;
}

export const CAPABILITY_SUBSTITUTIONS: readonly CapabilitySubstitution[] = [
  {
    instead: 'measure a reference image — text, boxes, colours, composition',
    use: 'analyze_reference_layout',
    because: "it returns OCR with bounding boxes and a colour grid already matched to this brand's tokens",
  },
  { instead: 'pull structure out of a reference video', use: 'analyze_reference_motion' },
  { instead: 'read a brand off a website', use: 'extract_brand_source, analyze_website, extract_site_content' },
  { instead: 'describe or caption an image', use: 'describe_image, generate_caption' },
  {
    instead: 'check a piece before it ships',
    use: 'validate',
    because: 'it covers refs, brand primitives, beat states, motion rules and contrast in one pass',
  },
  { instead: 'run a .react and see whether it paints', use: 'simulate_component' },
  { instead: 'make something from a format that exists', use: 'list_formats, read_format, hydrate_format, use_template' },
  { instead: 'run a saved procedure', use: 'list_flows, run_flow' },
  { instead: 'render a frame or a video', use: 'render_still, render_video' },
];

/** Where an artifact has to land to be read by anything. */
export interface WorkspaceOutputPath {
  artifact: string;
  /** Workspace-relative. */
  path: string;
  readBy: string;
}

export const WORKSPACE_OUTPUT_PATHS: readonly WorkspaceOutputPath[] = [
  { artifact: 'Visual-language brief', path: 'meta/design.md', readBy: 'chat + generation, via readBrandMeta' },
  { artifact: 'Voice / strategy / audience', path: 'meta/voice.md, meta/strategy.md, meta/target-profile.md', readBy: 'chat + generation' },
  { artifact: 'What the brand sells', path: 'meta/product.md', readBy: 'chat + generation — the facts live in config/commerce.json and assets/catalogs/' },
  { artifact: 'How this brand works, per route', path: 'assets/skills/<name>.md + config/skills.json', readBy: 'the route that declares it' },
  { artifact: 'Curation rubric (system-maintained)', path: 'assets/instructions/taste.md', readBy: 'generation, always — it has a carve-out' },
  { artifact: 'Knowledge to ground answers', path: 'assets/knowledge/*.md', readBy: 'grounding, within a character budget' },
  { artifact: 'A repeatable procedure', path: 'workflows/<workflow>/flows/<slug>.flow', readBy: 'run_flow, list_flows' },
  { artifact: 'A finished piece', path: 'projects/<project>/', readBy: 'the feed, publish, the wrapper' },
];

/**
 * The same two rules as a short block for a tool message, where a markdown
 * table would be noise. Kept tight on purpose — a long front door is skimmed.
 */
export function workspaceGuardrailsText(): string {
  const swaps = CAPABILITY_SUBSTITUTIONS.slice(0, 6)
    .map((s) => `  · ${s.instead} → ${s.use}`)
    .join('\n');
  // Five, not four: adding `meta/product.md` pushed the curation rubric out of
  // the list, and a doc that steers every generation is not the one to drop.
  const paths = WORKSPACE_OUTPUT_PATHS.slice(0, 5)
    .map((p) => `  · ${p.artifact} → ${p.path}`)
    .join('\n');
  return (
    'BEFORE YOU BUILD A PROCEDURE, CHECK WHAT EXISTS. Most of it does, and a '
    + 'hand-rolled version misses what the real tool knows:\n'
    + `${swaps}\n`
    + '  · everything else → list_tools, and get_syvon_skill for the method doc\n'
    + '\nWRITE OUTPUT WHERE SOMETHING READS IT. An artifact outside these paths '
    + 'is a file for humans only — it will not reach generation, validation or chat:\n'
    + `${paths}\n`
    + '\nA repeatable procedure is a .flow (validate_workflow_graph, run_flow). Do '
    + 'not invent a second workflow format: nothing runs it and nobody finds it. '
    + 'The workspace root carries AGENTS.md with the full list.'
  );
}
