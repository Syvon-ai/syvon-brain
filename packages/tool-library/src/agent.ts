/**
 * The Agent app's tool selections — authored ONCE, here, for the same reason
 * `./surface.ts` is: `@syvon/agent` compiles them and `@syvon/skills` declares
 * personas from them, and neither may import the other.
 *
 * ── TWO KINDS OF AGENT ──────────────────────────────────────────────────────
 *
 * Since 2026-09-01 the agent app is a WORKSPACE BROWSER: you hold workspaces,
 * some of them are agents, you switch between them. What makes a workspace an
 * agent is that it carries `tools/` — its own `.tool` files. And the KIND of
 * agent is read off the workspace, never declared:
 *
 *   brand agent   — the front-end department. A brand's DNA, its material,
 *                   the pieces made from it. Every workspace that exists today.
 *   backend agent — the company's own records: `admin/` (employees, the
 *                   accounting artifacts, the structured ledger) plus the
 *                   `.tool`s that post into it. Payroll is the first one.
 *
 * Each kind gets its own persona (`syvon-agent`, `syvon-admin` in
 * `@syvon/skills`) and its own lane below. The lanes are what "discriminate
 * about where in the workspace they look": both personas see the whole
 * workspace context, but a brand turn never gets the ledger verbs and an admin
 * turn never gets the media generators.
 */

import { SURFACE_APP } from './surface';

/**
 * THE BRAND AGENT'S LANE — what `apps/agent`'s `/api/agent/work` serves by
 * default.
 *
 * `SURFACE_APP` is the proven base: the same context builder
 * (`@syvon/agent-server`'s `buildR2Context`) serves both apps' work routes,
 * so every name Surface has already audited as "backed by what the context can
 * serve" holds here too. On top of it, the verbs this app is FOR and Surface
 * deliberately is not — the audio side of motion/social. Surface v1 is decks;
 * the agent app is reels, posts and the cycle that queues them.
 *
 * Deliberately absent, like Surface: `render_sequence` (credit holds this lane
 * has no ledger for), `publish_feed` / `schedule_post` (delivery goes through
 * `run_action` behind a confirmation), and the first-time brand intake
 * (`SURFACE_APP_WITHHELD` — onboarding's, not a chat turn's).
 *
 * The four app-local tools (`generate`, `navigate`, `run_action`,
 * `search_web`) are appended by the route, not listed here: they belong to no
 * package and two of them are shaped per app.
 */
export const AGENT_LAYER: readonly string[] = [
  ...SURFACE_APP,
  // The route used to serve `read_file` by name (its V1 list); `read` resolves
  // the reader from the file and supersedes it, but transcripts and the
  // persona prompts that grew up on `read_file` still name it.
  'read_file',
  // Audio — a reel has a voice, a bed and a hit. Surface never needed them.
  'generate_voice', 'generate_music', 'generate_sound_effect',
  // A `.docx` when someone asks for the brief, the proposal or the one-pager
  // itself rather than a page of it. NOT in `SURFACE_APP`: Surface hands over a
  // deck's copy as a document through the export button, which is a different
  // job from writing one — and a lane that offered both would have the agent
  // choosing between them with no way to tell which was meant.
  'write_document',
];

/**
 * THE BACKEND AGENT'S LANE — a workspace that carries `admin/` and `tools/`.
 *
 * Small on purpose. A backend agent's job is to RUN THE WORKSPACE'S OWN TOOLS
 * (`list_tools` → `run_tool`) and to report on what they produced; it does not
 * generate imagery or hydrate reels. The report side is the deck verbs, because
 * "the payroll report" is a page on the Surface canvas — the front end this
 * department is seen through — and the numbers get there as a `.dsgn` the same
 * way a slide does.
 *
 * The ledger discipline is in the persona, not the lane: `write_file` is here
 * because a `.tool` needs authoring and a CSV needs correcting, and the
 * persona says which folders a hand may touch.
 */
export const ADMIN_LAYER = [
  // Orient — and the workspace's own tools first, because a job someone
  // already turned into one step is the job here.
  'get_syvon_skill', 'connection_info',
  'list_directory', 'get_workspace_structure', 'find_files', 'search_workspace',
  'list_tools', 'run_tool',
  // See
  'read', 'read_file', 'read_asset', 'show', 'preview_file', 'get_download_url', 'run_diagnostics',
  // Edit — records and the tools that keep them
  'write_file', 'apply_diff', 'write_spreadsheet', 'write_document',
  'delete_file', 'rename_file', 'move_file', 'copy_file', 'upload_file',
  // Report — a page on the Surface canvas, built from the catalog like any deck
  'list_templates', 'use_template',
  'list_formats', 'read_format', 'hydrate_format', 'hydrate_template',
  'make_piece', 'edit_piece',
  'create_sequence', 'edit_sequence', 'edit_design_slots', 'validate',
  // The brand a report wears — read, never re-proposed
  'list_workspace_fonts', 'present_text_styles',
  // Settings door
  'script',
] as const;
