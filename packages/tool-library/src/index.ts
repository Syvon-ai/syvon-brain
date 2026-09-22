/**
 * The Syvon tool library — tool PACKAGES, the addressable units of attribution.
 *
 * The registry (`packages/agent/src/tools/definitions/*`) is where tools are
 * IMPLEMENTED; this leaf package is where each tool's AUDIENCE is decided. A
 * lane (tool-profiles.ts) compiles from packages; a workspace's MCP declaration
 * (organism's `config/mcp/*.json`) lends packages; nothing here executes
 * anything.
 *
 * WHY A LEAF PACKAGE. `@syvon/organism` needs the package map to expand
 * `packages: [...]` in workspace declarations, and `@syvon/agent` needs it to
 * compile lanes — but agent already depends on organism, so the map cannot live
 * in either without a cycle. Zero-dependency data is the only shape both can
 * import, which is also why there are no imports below.
 *
 * The eight customer packages are lifted verbatim from the comment groups that
 * organized MAKE_LAYER — the groups already existed; this makes them
 * addressable. Declaration ORDER is load-bearing: lanes concatenate packages in
 * this order and derived constants must preserve the historical MAKE_LAYER
 * ordering that tests and consumers assert against.
 */
export interface ToolPackage {
  id: string;
  title: string;
  /** One line on what this package is FOR — the attribution record. */
  description: string;
  tools: readonly string[];
  /**
   * Estate tooling: cloud sync, provisioning, publishing — the workspace's
   * ownership itself, never its content. Never lent to a mini-MCP (an owner who
   * is not in the conversation cannot consent to the estate being borrowed) and
   * never loaded by `load_package`.
   */
  estate?: boolean;
}

export const TOOL_PACKAGES = {
  orient: {
    id: 'orient',
    title: 'Orient',
    description: 'Answer "where am I": the skill corpus door, the connection, the workspace layout.',
    tools: [
      'get_syvon_skill', 'connection_info', 'list_directory', 'get_workspace_structure',
      'find_files', 'search_workspace',
      // A workspace's OWN tools. In `orient` because "what can I do here" is
      // the same question as "where am I" — and a job someone already turned
      // into one step should be found before it is redone by hand.
      'list_tools', 'run_tool',
    ],
  },
  see: {
    id: 'see',
    title: 'See',
    description: 'Inspect and display what exists — readers resolved from the file, viewers resolved from the type.',
    tools: [
      'read', 'read_asset', 'read_format', 'show', 'preview_file', 'get_download_url', 'run_diagnostics',
    ],
  },
  reference: {
    id: 'reference',
    title: 'Reference',
    description: 'The pieces to build FROM — this workspace\'s own templates and the shared catalog. Copy-first as a verb.',
    tools: ['list_templates', 'use_template', 'save_template'],
  },
  create: {
    id: 'create',
    title: 'Create',
    description: 'Make new content: hydrate formats, assemble sequences, generate image/video/voice/music, analyze references.',
    tools: [
      'list_formats', 'hydrate_format', 'create_sequence', 'hydrate_template',
      'upload_file', 'generate_image', 'generate_vector', 'generate_video', 'generate_voice',
      'generate_music', 'generate_sound_effect', 'remove_background',
      'describe_image', 'analyze_reference_layout', 'analyze_reference_motion',
      'transcribe_video', 'generate_caption', 'extract_catalog', 'extract_media',
      // Turning a reference INTO material: the shots of a video, as files.
      'cut_shots',
      // The same verb for a web page: HTML in, a .dsgn out. Beside the other
      // reference-readers rather than in `edit`, because what it produces is a
      // new design — and because a page exported by `export_design` comes back
      // through it exactly, which makes the pair a round trip rather than two
      // one-way doors.
      'import_html',
      'render_text_mask',
      // A design composed from a BRIEF rather than hydrated from a template.
      // Here and not in `edit` because what comes out is a new file: it is the
      // answer when `list_formats` has nothing that fits, which is a create
      // question, and the structure it writes is filled by `hydrate_format`
      // next — the two are one motion.
      'compose_design',
      /*
       * The door a person's own BRIEF goes through: the model writes the plan
       * and the words, a typed decision picks the template per page. In `make`
       * rather than `edit` because what comes out is a new piece — and it sits
       * beside `compose_design` deliberately, since choosing between them is
       * the same question ("does the library hold this?") answered by the tool
       * instead of by the model.
       */
      'make_piece',
    ],
  },
  edit: {
    id: 'edit',
    title: 'Edit',
    description: 'Change what exists — surgical slot edits, shot edits, file ops. `apply_diff` lives here so write_file\'s own errors never point at a hidden tool.',
    tools: [
      // The prose door. `edit_sequence` stays beside it as the executor it
      // delegates to, and as the way to send a batch you already know.
      'edit_piece',
      'edit_design_slots', 'edit_sequence', 'write_file', 'apply_diff', 'clean_vector',
      // Beside `write_file` because it answers the same question — how do I put
      // this data in the workspace — and the choice between them is a choice of
      // READER: `.csv` through write_file is what another tool parses, a
      // workbook is what a person opens. Filing it anywhere else would hide it
      // from exactly the turn that needs it.
      'write_spreadsheet',
      // Its counterpart in the other direction: a workbook is what a reader
      // TOTALS, a document is what a reader EDITS. Both sit here because the
      // choice between them and `write_file` is made in the same breath.
      'write_document',
      'delete_file', 'rename_file', 'move_file', 'copy_file',
      // The design runtime's fit pass. An EDIT because it changes a file that
      // already exists, and it belongs next to `edit_design_slots` for the same
      // reason: both settle one authored decision without touching structure.
      'resolve_design',
    ],
  },
  ship: {
    id: 'ship',
    title: 'Ship',
    description:
      'Get it out the door and gate it first — `validate` is the single gate, `check_contrast` the ' +
      'sweep across a folder and every brand, publish/schedule the exits.',
    tools: ['publish_feed', 'create_draft_post', 'schedule_post', 'validate', 'check_contrast'],
  },
  social: {
    id: 'social',
    title: 'Social',
    description:
      'The connected channels themselves — publish to the Instagram account this workspace owns, ' +
      'message its WhatsApp contacts. Separate from `ship` because `ship` ends at the in-product ' +
      'feed: these leave Syvon and reach a live audience, and every one of them is irreversible.',
    tools: [
      'list_social_connections',
      'post_to_instagram',
      'send_whatsapp_message',
      'send_whatsapp_media',
      'list_whatsapp_templates',
      'send_whatsapp_template',
    ],
  },
  brand: {
    id: 'brand',
    title: 'Brand',
    description: 'Extract, propose, apply and present brand DNA — colors, fonts, voice, the onboarding ladder.',
    tools: [
      'analyze_website', 'extract_brand_source', 'compile_design_tokens', 'write_dna',
      // The words half of the same crawl: what the customer's own site SAYS, which
      // is the material every piece written for them starts from.
      'extract_site_content',
      'import_brand_from_url', 'import_logo', 'import_font',
      'propose_brand', 'apply_brand',
      // Filing a reference reading as standing law: meta/design.md (read by
      // every lane), the machine-readable rubric, and the method doc bound to
      // `generate`. Brand DNA, so it belongs here and not with the readers.
      'write_design_rules',
      'list_workspace_fonts', 'present_brand_review',
      'present_brand_bento', 'present_text_styles',
    ],
  },
  notes: {
    id: 'notes',
    title: 'Notes',
    description:
      'Capture and file: keep what the user said as a draft, read the drafts back, and promote ' +
      'one onto the card queue when it becomes work.',
    /**
     * A CUSTOMER package, and that is the decision worth recording.
     *
     * The card tools themselves (`create_card`, `list_cards`, `resolve_card`)
     * are in `build` — the design engineer's surface — because writing findings
     * and working a queue is what that audience does. Capture is not that. "Save
     * this to my Syvon workspace" is said by the person who owns the workspace,
     * in the middle of a conversation happening somewhere else, and the connector
     * is exactly where they say it. Filing it under `build` would put the verb on
     * every lane except the one it is for.
     *
     * `promote_draft` is here rather than in `build` for the same reason: the
     * person deciding a note should be worked is the person who wrote it. It
     * writes to the same one card log, under the same fences as `create_card`
     * (`by: 'agent'`, no rating, never `done`) — so this package widens who can
     * ASK, never who can judge.
     */
    tools: ['save_draft', 'list_drafts', 'promote_draft'],
  },
  settings: {
    id: 'settings',
    title: 'Settings',
    description: 'Generation defaults and the published-agent wrap config.',
    tools: [
      'get_generation_settings', 'update_generation_settings',
      'get_agent_settings', 'update_agent_settings',
      // The door in front of the occasional operations. It lives here because
      // its first inhabitants are these settings — the door itself is generic.
      'script',
    ],
  },
  build: {
    id: 'build',
    title: 'Build',
    description: 'The design engineer\'s authoring surface: formats, flows, solvers, schemas, artifact validation, file metadata — the things makers consume.',
    tools: [
      'create_json_from_schema', 'extract_structured_data',
      'inspect_template', 'list_components', 'manage_autopilot', 'pin_comp',
      'create_workflow', 'run_workflow', 'list_flows', 'run_flow',
      'create_solver_artifact', 'run_solver',
      'query_skill', 'load_skill_file',
      'read_file_meta', 'write_file_meta', 'append_file_history', 'search_file_meta',
      'list_cards', 'create_card', 'card_activity', 'resolve_card', 'list_revisions',
      'validate_artifact', 'validate_plan', 'validate_workflow_graph',
      'review_composition', 'validate_design',
    ],
  },
  'studio-bridge': {
    id: 'studio-bridge',
    title: 'Studio bridge',
    description: 'Tools that drive the RUNNING Studio through the bridge server — they only take effect where Studio is on the other end, so they belong to the studio lane by construction. (`screenshot_design` left here for SUPERSEDED_BY_MERGE — export_design is the verb; the alias stays callable for the allowlists and prose that still name it.)',
    tools: ['open_file', 'refresh_view', 'export_design', 'navigate', 'run_action'],
  },
  workspace: {
    id: 'workspace',
    title: 'Workspace',
    description: 'Estate tooling — cloud sync, provisioning, publishing, local render pipelines. Injected by workspace-sync, not registry entries; master/operator surfaces only, never lent.',
    estate: true,
    tools: [
      'workspace_list', 'workspace_create', 'workspace_pull', 'workspace_push',
      'workspace_health', 'workspace_status', 'workspace_publish',
      'workspace_create_agent', 'workspace_run_flow', 'workspace_generate', 'workspace_mint_key',
      'render_linesheet', 'simulate_react', 'verify_seams', 'hf_import', 'comfy_run',
    ],
  },
} as const satisfies Record<string, ToolPackage>;

export type ToolPackageId = keyof typeof TOOL_PACKAGES;

/** Every package id in declaration order (load-bearing for lane compilation). */
export const PACKAGE_IDS = Object.keys(TOOL_PACKAGES) as ToolPackageId[];

/** The package an id names, or undefined. Estate packages resolve like any other. */
export function packageById(id: string): ToolPackage | undefined {
  return (TOOL_PACKAGES as Record<string, ToolPackage | undefined>)[id];
}

export interface ExpandedPackages {
  /** Tool names from every resolvable, lendable (non-estate) package, in order, de-duplicated. */
  names: string[];
  /** Estate package ids that were refused — lending the estate is not a caller's to do. */
  refused: string[];
  /** Package ids that resolve to nothing — a typo or a renamed package, reported not dropped. */
  unknown: string[];
}

/**
 * Expand package ids to tool names. REFUSED and UNKNOWN are outcomes, not
 * errors: a declaration naming the estate or a ghost id must be reported at the
 * point it is read (see organism's declarationIssues), never silently narrowed.
 */
export function expandPackages(ids: readonly string[]): ExpandedPackages {
  const names: string[] = [];
  const refused: string[] = [];
  const unknown: string[] = [];
  // DECLARATION order, not argument order: lanes concatenate packages and the
  // derived constants they feed must be stable no matter how a caller lists ids.
  const wanted = new Set(ids);
  for (const id of PACKAGE_IDS) {
    if (!wanted.has(id)) continue;
    wanted.delete(id);
    // packageById rather than TOOL_PACKAGES[id]: the literal union from the
    // indexed access has no `estate` on members that omit it, while the
    // widened interface does.
    const pkg = packageById(id)!;
    if (pkg.estate) {
      refused.push(id);
      continue;
    }
    for (const name of pkg.tools) {
      if (!names.includes(name)) names.push(name);
    }
  }
  // Whatever is left resolved to nothing.
  unknown.push(...wanted);
  return { names, refused, unknown };
}

/**
 * The Surface selection — authored in `./surface`, re-exported here so both
 * `@syvon/agent` (the lane) and `@syvon/skills` (the persona) read one list.
 */
export {
  SURFACE_LAYER,
  SURFACE_BRAND_SETUP,
  SURFACE_AUTHORING,
  SURFACE_APP,
  SURFACE_APP_WITHHELD,
} from './surface';

/**
 * The Agent app's two lanes — authored in `./agent`. `AGENT_LAYER` is the brand
 * agent's (Surface's base plus audio), `ADMIN_LAYER` the backend agent's (the
 * workspace's own tools, the record verbs, the report verbs). Same split as
 * above: `@syvon/agent` compiles them, `@syvon/skills` declares personas.
 */
export { AGENT_LAYER, ADMIN_LAYER } from './agent';
