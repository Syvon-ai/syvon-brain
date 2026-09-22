/**
 * The Surface app's tool selection — authored ONCE, here.
 *
 * WHY IT LIVES IN THE LEAF. Two packages need this list and neither may import
 * the other: `@syvon/agent` compiles it into the `surface` lane
 * (`tools/library/lanes.ts` → `mcp/tool-profiles.ts`), and `@syvon/skills`
 * declares it as the `syvon-surface` persona's `tools`. `agent` already depends
 * on `skills`, so the list cannot live in `agent` without a cycle — the same
 * reason `TOOL_PACKAGES` is here.
 *
 * It used to live in `lanes.ts` AND, hand-copied, in
 * `skills/src/syvon-surface/index.ts`. The two disagreed by ten names. Nothing
 * failed, because the Surface work route UNIONS the lane with the skill's
 * declaration rather than replacing it — so the drift was invisible in
 * production and authoritative-looking in the source, which is the worse of the
 * two failure modes. Both are now derived from the arrays below.
 */

/**
 * The Surface app's presentations lane — a curated selection across packages,
 * NOT a package union. Deliberately absent: the motion/social verbs (Surface v1
 * is decks, not reels), agent identity settings, and everything bridge-only or
 * `TEMPLATE_LIBRARIES_ROOT`-bound (outside the connector packages by
 * construction).
 *
 * Authored as a flat literal with its comment groups intact because the portal
 * sandbox (`apps/portal/src/app/sandbox/surface-mcp/scan.ts`) PARSES this
 * source at request time — it cannot import `@syvon/agent` — and renders the
 * lane grouped by these comments. A computed array would leave that page with
 * nothing to measure.
 */
export const SURFACE_LAYER = [
  // Orient
  'get_syvon_skill',
  'connection_info', 'list_directory', 'get_workspace_structure', 'find_files', 'search_workspace',
  // Own tools — the workspace's `.tool` files. Here for the same reason they
  // sit in the `orient` package: "what can I do here" is part of "where am I",
  // and a job someone already turned into one step should be found before it is
  // redone by hand. Their absence was the one place Surface narrowed the lane
  // without choosing to — the deck verbs above are all deliberate, these two
  // were simply never copied across, so a brand that authored a tool could run
  // it from Studio and not from the app it was written for.
  'list_tools', 'run_tool',
  // See
  'read', 'read_asset', 'read_format', 'show', 'preview_file',
  'get_download_url', 'run_diagnostics',
  // Reference / catalog — the generation door: copy-first from templates, then
  // hydrate. The legacy /api/generate lane is never part of this surface.
  'list_templates', 'use_template', 'save_template',
  'list_formats', 'hydrate_format', 'hydrate_template', 'extract_catalog',
  // The originate rung — when nothing in the library fits, compose a new
  // .dsgn template from a brief. Classification walk against the FormatKit
  // grammar, so the output cannot be invalid; fill it with the same hydrate
  // verbs above. Needs `decisionProvider`, which this lane already wires.
  'compose_design',
  // THE TWO DOORS a person's own words go through. `make_piece` builds a piece
  // from a brief and the model's copy; `edit_piece` changes one from a request.
  // Both resolve the operation, the page and the template as TYPED DECISIONS and
  // ask rather than guess — see docs/schema/2026-09-19-resolution-before-execution.md.
  // The verbs below stay, as their executor and as the door for a precise batch.
  'make_piece', 'edit_piece',
  // Sequence (.comp — the presentation container, mode:"deck")
  'create_sequence', 'edit_sequence',
  // Edit
  'edit_design_slots', 'write_file', 'apply_diff', 'delete_file', 'rename_file', 'move_file', 'copy_file',
  // Media — the pool FIRST, before any media verb: one call that shows what
  // the brand already holds (folders, descriptions, newest paths), the same
  // catalog the `media://catalog` MCP resource renders and `hydrate_format`
  // auto-fills from. Without it the model crawls list_directory and still
  // never learns what an image is ABOUT.
  'list_media',
  'upload_file', 'generate_image', 'generate_vector', 'clean_vector', 'describe_image', 'remove_background', 'analyze_reference_layout',
  // Brand — the hyper-customized onboarding ladder is these tools.
  'analyze_website', 'extract_brand_source', 'import_brand_from_url',
  'import_logo', 'import_font', 'propose_brand', 'apply_brand',
  'compile_design_tokens', 'write_dna', 'list_workspace_fonts',
  'present_brand_bento', 'present_brand_review', 'present_text_styles',
  // Ship
  'validate',
  // Contrast across a whole folder and every brand at once — the question
  // `validate` cannot ask, because a template carries no brand of its own.
  'check_contrast',
  // Settings
  // Behind `script` instead of mounted: 2,092 tokens of schema that every eval
  // run carried and none ever called. Still reachable, just not in the prefix.
  'script',
] as const;

/**
 * The brand-setup ladder — the verbs that CREATE or REPLACE a brand.
 *
 * A subset of SURFACE_LAYER (asserted by test), separated because ownership
 * differs from availability: the lane serves them (a connector session in a
 * half-set-up workspace must be able to finish the job), while the authoring
 * persona deliberately does not claim them — `syvon-surface-onboarding` owns
 * the ladder, and a deck-editing turn that re-proposes a brand is a bug.
 *
 * `present_brand_review` belongs here rather than with the read presenters: it
 * is the ladder's approval step, shown to accept a PROPOSED brand, not a way to
 * look at the applied one (that is `present_brand_bento`).
 */
export const SURFACE_BRAND_SETUP = [
  'analyze_website', 'extract_brand_source', 'import_brand_from_url',
  'import_logo', 'import_font', 'propose_brand', 'apply_brand',
  'compile_design_tokens', 'write_dna', 'present_brand_review',
] as const;

/**
 * The authoring persona's surface — SURFACE_LAYER minus the setup ladder, in
 * SURFACE_LAYER's own order. This is `syvonSurfaceSkill.tools`.
 *
 * Derived, not listed: adding a tool to the lane now reaches the persona by
 * construction, and the only way to withhold one is to say so in
 * SURFACE_BRAND_SETUP, where the reason is written down.
 */
// Declared after SURFACE_APP, which it now derives from — see the note there.
// Nesting matters: the route UNIONS the persona's tools onto the lane, so a
// persona derived from the wider SURFACE_LAYER would hand straight back the
// tools the app deliberately withholds.

/**
 * FIRST-TIME BRAND INTAKE — the half of the ladder the in-app chat does not need.
 *
 * `SURFACE_BRAND_SETUP` above is the whole ladder, and it is the right list for
 * the ONBOARDING persona. It is the wrong list for the app's own agent, because
 * it withholds two different things at once: turning a website into a brand
 * (intake) and adjusting the brand you already have (tuning). A user editing a
 * deck legitimately says "make our headlines bigger everywhere" — that is
 * `write_dna` + `apply_brand`, and it must stay.
 *
 * What genuinely does not belong in a deck conversation is the intake: crawling
 * a site, importing a logo, proposing a brand for approval. That is a different
 * conversation with a different persona (`syvon-surface-onboarding`), and it is
 * 1,715 tokens of schema on every deck turn that never calls it.
 *
 * `extract_catalog` rides along for the same reason — pulling products out of
 * scanned catalog pages is connector work, not deck work.
 */
export const SURFACE_APP_WITHHELD = [
  'analyze_website', 'extract_brand_source', 'import_brand_from_url',
  'import_logo', 'import_font', 'propose_brand',
  'extract_catalog',
] as const;

/**
 * The IN-APP agent chat's surface — what `/api/agent/work` serves.
 *
 * Derived like `SURFACE_AUTHORING`, and for the same reason: a tool added to the
 * lane reaches the app by construction, and the only way to withhold one is to
 * name it above, where the reason is written down.
 *
 * Deliberately NOT a `TOOL_LANES` entry. Every lane sets `excludeClientSide`,
 * and `present_brand_bento` / `present_brand_review` / `present_text_styles` are
 * clientSide — they survive on this route precisely because it filters by name
 * only. Compiling this through a lane would silently drop all three while the
 * prompt still instructs their use. The lane formalism also cannot express the
 * three tools this route appends that belong to no package (`search_web`, and
 * the Surface-shaped `navigate` / `run_action`).
 */
export const SURFACE_APP: readonly string[] = SURFACE_LAYER.filter(
  (name) => !(SURFACE_APP_WITHHELD as readonly string[]).includes(name),
);

export const SURFACE_AUTHORING: readonly string[] = SURFACE_APP.filter(
  (name) => !(SURFACE_BRAND_SETUP as readonly string[]).includes(name),
);
