import { normalizeRoot, joinPath } from './paths';

export interface WorkspaceFolderDef {
  path: string;
  label: string;
  autoCreate: boolean;
  reserved: boolean;
  hidden: boolean;
  sync: boolean;
  /**
   * Are AUTHORED TEXT writes under this root recorded in the file version log?
   *
   * Root-granular on purpose: "which files have history" is a property of what
   * a folder IS, not of a file extension. `assets/` holds 66 MB of Lottie JSON
   * that is media by any honest reading, and `sessions/` is already a log.
   *
   * Invariant, pinned by a test: `versioned` implies `sync`. A root that never
   * reaches R2 cannot be seen by an R2 write hook, so claiming history for it
   * would be a promise nothing keeps.
   */
  versioned: boolean;
}

export const WORKSPACE_CONFIG = {
  // R2 path segments are lowercase per v6 (`.schema/organism-map.md`).
  // UI labels stay title-case for human display.
  folders: [
    { path: 'projects',  label: 'Projects',   autoCreate: true,  reserved: true,  hidden: false, sync: true, versioned: true  },   // the work itself (output/ carved out by isVersionedKey)
    { path: 'workflows', label: 'Workflows',  autoCreate: true,  reserved: true,  hidden: false, sync: true, versioned: true  },   // authored flow json, edited turn by turn
    // ── v11: the brand IS the workspace ─────────────────────────────────
    // `brands/{slug}/{config,meta,wrapper,assets}/` collapsed to these roots.
    // Verified against live data before the move: 0 of 18 workspaces served
    // more than one site, and every second `Brand` row was scaffold residue —
    // no site.json, no project, no item. The slug was a level of nesting that
    // never once branched.
    //
    // That nesting stays retired: the workspace's OWN brand is never under
    // `brands/` again. The folder came back for a different job — see the
    // `brands` entry below.
    { path: 'config',    label: 'Config',     autoCreate: true,  reserved: true,  hidden: false, sync: true, versioned: true  },   // the DNA — the most-edited text in a workspace
    { path: 'meta',      label: 'Meta',       autoCreate: true,  reserved: true,  hidden: false, sync: true, versioned: true  },   // authored prose at the brand root
    { path: 'wrapper',   label: 'Site',       autoCreate: true,  reserved: true,  hidden: false, sync: true, versioned: true  },   // the site source; every edit here is user-visible
    // ── Auxiliary brands (aux-brands/v1) ─────────────────────────────────
    // The OTHER brands a workspace dresses work in — one per client, for a
    // workspace doing client work — each a self-sufficient theme root:
    // `brands/{slug}/config/design-tokens.json` and friends, `assets/` and
    // `meta/` beside them. A file picks one with a `@brand` declaration
    // (`dna/brand-override.ts`); the root `config/` stays the workspace's own.
    //
    // Registered and SYNCED, because a brand the cloud renderer cannot read is
    // a declaration every server render silently ignores. What an audit still
    // has to flag — v8.6 residue from an unfinished flatten — is told apart by
    // `classifyBrandsFolders`, not by the folder's mere existence.
    //
    // `autoCreate: false` (most workspaces have one brand); `hidden: true`
    // because a brand is a place DNA lives, not a place work is filed.
    { path: 'brands',    label: 'Brands',     autoCreate: false, reserved: true,  hidden: true,  sync: true, versioned: true  },   // client brands — authored DNA, same history as config/
    { path: 'templates', label: 'Templates',  autoCreate: true,  reserved: true,  hidden: false, sync: true, versioned: true  },   // authored .dsgn/.comp; save_template overwrites in place
    // ── The semantic source of truth ─────────────────────────────────────
    // WHAT a design says, not how it looks. `content/` holds the raw, purely
    // semantic material every design draws from — the copy, the references,
    // the variables — and no design markup anywhere: a `.dsgn` holds layout,
    // this holds what the piece IS and what is going on, so one truth can
    // feed a post, a deck and a reel without being re-authored inside each.
    //
    // A ROOT because it is a peer of `templates/`, not a brand-kit primitive:
    // the kit is material the brand is MADE of, and this is the substance the
    // work is made OF. It belongs to the workspace the way a design does.
    //
    // `content/extraction/` existed before this entry did — the site-content
    // extractor writes there — which was the `export/` mistake in miniature:
    // real files under a folder no registry named, never synced, never
    // resolved against the workspace root. Registering the root fixes the
    // class of problem rather than the one path.
    //
    // `autoCreate: true` because this root is meant to LEAD: content is the
    // thing the rest of the workspace is an arrangement of, and a workspace
    // without the folder should read as one that has not said anything yet.
    { path: 'content',   label: 'Content',    autoCreate: true,  reserved: true,  hidden: false, sync: true, versioned: true  },   // authored semantic text — its history IS the record of what was said
    // Workspace-authored TOOLS — one `.tool` file per custom tool, run by
    // `run_tool`. A `.tool` is a small script over tools that already exist, so
    // this is the one place a workspace can add a VERB of its own rather than
    // another noun. `autoCreate: false` because most workspaces never need one,
    // and an empty reserved folder in every checkout reads as something missing.
    { path: 'tools',     label: 'Tools',       autoCreate: false, reserved: true,  hidden: false, sync: true, versioned: true  },   // a .tool is a script — its history is code history
    // Workspace-authored SKILLS — the agent's own method. A `.skill` is prose
    // the agent adopts (how this workspace writes, reviews, files a report),
    // where a `.tool` above is a script it RUNS: know-how versus a verb, which
    // is why they are two roots rather than two subfolders of one.
    //
    // A ROOT, deliberately not `assets/skills/`. That folder is one of the brand
    // kit's primitives — material the brand is made of, alongside logos and
    // imagery — and it belongs to the brand. These belong to the AGENT, and a
    // workspace can carry an agent's method without the method being part of
    // anybody's brand. Both keep their names; they are not the same thing.
    //
    // `autoCreate: false`, like `tools/`: most workspaces never write one, and
    // an empty reserved folder in every checkout reads as something missing.
    { path: 'skills',    label: 'Skills',      autoCreate: false, reserved: true,  hidden: false, sync: true, versioned: true  },   // prose that changes agent behaviour silently
    // The AGENTS declared in this workspace — `agents/{slug}/agent.json`, one
    // folder per agent. The manifest that finally joins what used to be five
    // unrelated files: the archetype card, an mcp declaration, skills.json, the
    // `.tool` walk and the flow path-concat. See `dna/agent-manifest.ts`.
    //
    // A ROOT rather than `config/agents/`, and that is the one place this
    // departs from the note in `dna/mcp-declaration.ts` which argued
    // declarations belong under `config/`. The argument there was that a
    // declaration is DATA ABOUT the workspace, and config/ already holds that.
    // An agent is not data about the workspace — it is a thing the workspace
    // CONTAINS, addressable in its own right at `/agents/{workspace}/{slug}`,
    // and it is about to hold more than a file (a folder per agent is where its
    // own skills and pinned context land when they stop being shared). A root
    // is also what makes `agents/main/agent.json` referenced from a `.tool`
    // resolve against the workspace root rather than the referring directory.
    //
    // `autoCreate: false`, like `tools/` and `skills/`: a workspace with no
    // agent should not carry an empty folder that reads as something missing.
    { path: 'agents',    label: 'Agents',      autoCreate: false, reserved: true,  hidden: false, sync: true, versioned: true  },   // a manifest is capability — its history is an audit trail
    // Now holds the kit as well as `fonts/` — that merge is the other half of
    // the v11 flatten.
    { path: 'assets',    label: 'Assets',     autoCreate: true,  reserved: true,  hidden: false, sync: true, versioned: false },   // media root; its text files are imported, not authored
    // ── What the workspace has LEARNED ───────────────────────────────────
    // Was "brand knowledge docs": a sibling of `assets/` inside the pre-v11
    // brand folder, optional, and visible in the field.
    //
    // `autoCreate: false` — MADE BY THE FIRST WRITE, not by the scaffold. This
    // is where a thing said twice stops being a card and becomes a rule the
    // next run reads before it starts working, and for a moment that argument
    // was taken to mean the folder had to exist from the start. It does not:
    // every write in this system creates its parents (`fs.mkdir` with
    // `recursive`, in `local-tool-context`, and the same on the R2 side, where
    // a prefix is not a directory at all), so the run that learns the first
    // rule makes the folder in the act of writing it. Scaffolding it bought
    // nothing and cost the thing `admin/`, `widget/` and `import/` are kept
    // `autoCreate: false` to avoid: an empty reserved folder in every checkout,
    // which reads as something missing rather than as something not needed yet.
    // A workspace that has learned nothing should look like one.
    //
    // The sync walker tolerates a missing dir (`workspace-sync/src/engine.ts`),
    // and `WS_ROOT_RE` in `paths.ts` recognises the segment whether or not it
    // has been created — so nothing downstream has to know which of the two
    // states a given workspace is in.
    //
    // `hidden: true` for the same reason `sessions/` is: it is not authored
    // content and it must not draw a card in the field. Nobody files a rule
    // here by hand — it is written by the run that learned it — and a folder
    // people browse into is a folder people edit, which turns an accumulated
    // record into a document somebody keeps tidy.
    //
    // `sync: true` is unchanged and is the point: what a brand's agent has
    // learned has to survive this machine, and reach the next one.
    { path: 'knowledge', label: 'Knowledge',  autoCreate: false, reserved: true,  hidden: true,  sync: true, versioned: false },   // accumulated, replaced not edited
    // ── The company's own records ────────────────────────────────────────
    // Not brand, not craft: the things a business keeps because it is a
    // business. `admin/employees/` is the employee registry, `admin/accounting/`
    // holds the generated documents (payslips, statements — the artifacts), and
    // `admin/accounts/` is the structured financial ledger those artifacts are
    // derived FROM. Payroll is the first writer; expenses, invoices, sales and
    // vendor payments post into the same ledger later.
    //
    // A root rather than a folder under `projects/`, because the distinction
    // this registry draws is exactly the one that matters here: a project is a
    // piece of work that ends, and a ledger is a record that accumulates. Filing
    // 2026's accounts as a project would make the company's financial history a
    // sibling of a campaign.
    //
    // `sync: true` is the entire reason this entry exists. An unregistered
    // `admin/` would be written locally and never uploaded — the `export/`
    // mistake, where `sync: false` meant nothing written ever reached R2 — and
    // for payroll that failure mode is silent loss of financial records.
    //
    // `autoCreate: false` because most workspaces are not companies with a
    // payroll, and an empty `admin/` in every checkout reads as something
    // missing.
    { path: 'admin',     label: 'Admin',       autoCreate: false, reserved: true,  hidden: false, sync: true, versioned: false },   // financial records — a second copy doubles sensitive retention
    // ── The agent's own interface ────────────────────────────────────────
    // A workspace IS an agent, and until these two roots existed it was the one
    // thing an agent could not carry: every pixel it was seen through shipped
    // from the repo. `widget/` and `ui/` are `.react` files the way `assets/`
    // holds media — authored content, not code.
    //
    // The split is published-vs-source, the same relationship `wrapper/` has
    // with `assets/`:
    //
    //   widget/  the MOUNTABLE tokens. A host surface mounts from here and
    //            from nowhere else. One .react per widget, intrinsic size.
    //   ui/      the ingredients — partials and shared pieces a widget
    //            imports. Never mounted directly.
    //
    // Both words are already spoken for elsewhere and neither of those meanings
    // is this one. `widget` in `packages/agent/src/connector/widgets.ts` and
    // `apps/agent/mcp-ui/` is an MCP-Apps canvas widget: a repo-shipped bundle,
    // not workspace content; `Widget` in the workspace Prisma schema is an
    // embeddable chat widget, one per external site. `ui` collides with
    // `packages/ui` (the component library) and with the `ui://syvon/...` MCP
    // resource scheme. Those are reader collisions, not compiler ones — which is
    // why they are answered here in prose rather than by picking a third name.
    //
    // `autoCreate: false` for the same reason `import/` and `knowledge/` are
    // opt-in: an empty folder in every workspace reads as shape, and the sync
    // walker tolerates a missing dir (`workspace-sync/src/engine.ts:196`).
    // `sync: true` is the whole point — see the `export/` note below for what an
    // unregistered-or-unsynced folder buys you.
    { path: 'widget',    label: 'Widgets',    autoCreate: false, reserved: true,  hidden: false, sync: true, versioned: true  },   // authored .react/.dsgn, same footing as wrapper/
    { path: 'ui',        label: 'UI',         autoCreate: false, reserved: true,  hidden: false, sync: true, versioned: true  },   // the ingredients a widget composes
    // Folder-level sidecars (`folder-meta/v1`) that sat at the brand root.
    // Opt-in: only workspaces that already had them get them.
    { path: '.meta',     label: 'Sidecars',   autoCreate: false, reserved: true,  hidden: true,  sync: true, versioned: false },   // derived sidecars, regenerated by tooling
    // Landing zone for external imports (Figma pulls today). A real synced root
    // rather than a subfolder of `templates/`: the template LIBRARY layer that
    // used to wrap these files — `library.json` + `manifest.json`, seeded by the
    // Figma importer's `ensureImportLibrary()` — was removed with `core-formats`
    // on 2026-07-31, so an imported `.dsgn` was being dressed as a member of a
    // layer that no longer exists.
    //
    // `sync: true` is the whole point, and the reason this is registered here
    // instead of being a bare folder the importer writes to: see the `export/`
    // note below for what an unregistered folder gets you. `autoCreate: false`
    // keeps it out of workspaces that have never imported anything (the sync
    // walker tolerates a missing dir — `workspace-sync/src/engine.ts:196`).
    { path: 'import',    label: 'Imports',    autoCreate: false, reserved: true,  hidden: false, sync: true, versioned: false },   // landing zone; the importer overwrites wholesale
    // RETIRED 2026-07-31 — `export/` is gone. It was a user-facing "put your
    // exports here" folder that was `sync:false`, so nothing written there ever
    // reached R2 and no reader ever looked at it; five renderers defaulted to it
    // and produced artifacts that could not be published. Renders now derive
    // their destination from the source (`resolveRenderOutputPath`): a
    // project-owned source → `projects/{slug}/output/`, anything else →
    // `projects/previews/output/`.
    //
    // `.renders/` is what actually survived, renamed for what it really is: the
    // TRANSIT buffer the cloud render service writes an mp4 to before the caller
    // downloads it and re-uploads to the real output key (see
    // `apps/agent/src/lib/server/render/index.ts` → `render-artifact.ts`). The
    // copy is never read again. Hidden + not auto-created so no agent mistakes
    // it for an output location, and `sync:false` so transit never pulls.
    { path: '.renders',  label: 'Render transit', autoCreate: false, reserved: true, hidden: true, sync: false, versioned: false },   // binary transit buffer, sync:false
    // Local-only design sources (SVG masters etc.): lives in the checkout for
    // editing, but sync:false keeps it off R2 — nothing under masters/ can ever
    // be served to a site visitor. Opt-in (autoCreate:false).
    { path: 'masters',   label: 'Masters',     autoCreate: false, reserved: false, hidden: false, sync: false, versioned: false },   // never on R2 — an R2 write hook can never see it
    // v10 publish target. `publishWorkspace` writes `releases/current/manifest.json`
    // STRAIGHT to R2 — it is not authored in a checkout, so `ws push` must never
    // upload it and `ws pull` must never bring it down. Hence `sync: false` even
    // though it is the one artifact on the bucket that the wrapper and brain
    // actually serve. Registered because it exists in nearly every workspace and
    // an unregistered folder reads as drift to anything auditing the shape.
    { path: 'releases',  label: 'Releases',    autoCreate: false, reserved: true,  hidden: true,  sync: false, versioned: false },   // written by publish; derived, not authored
    // Copy-on-publish target. Published feed media is COPIED here at publish time
    // and served from here; `projects/{slug}/output/` keeps the working render.
    // `sync: false` for the same reason `releases/` is — it is written straight to
    // R2 by the publish path, never authored in a checkout, so `ws push` must never
    // upload it and `ws pull` must never bring it down. Registered because it will
    // exist in every workspace and an unregistered folder reads as drift.
    //
    // This prefix contains ONLY published bytes. That is a load-bearing invariant:
    // it is what lets the asset route serve it without a per-request publish check,
    // and what would let a public CDN domain sit in front of it. Anything that
    // unpublishes MUST delete the copy here (see `demotePost`).
    { path: 'posts',     label: 'Posts',        autoCreate: false, reserved: true,  hidden: false, sync: false, versioned: false },   // copy-on-publish bytes only
    // Agent conversations. Promoted from `projects/{slug}/sessions/{id}/` to a
    // top-level root: a session is no longer OWNED by a project, it POINTS at
    // one. That is what lets a single conversation move between projects, and
    // what lets a connector conversation (claude.ai / ChatGPT) exist without
    // minting a Project row just to have somewhere to live.
    //
    // Only the CONVERSATION moved — `session.json`, the transcript and
    // `cards.jsonl`. Drafts and renders still land under `projects/{slug}/`, so
    // `projectSlugFromPath` / `isSessionScopedPath` / `resolveRenderOutputPath`
    // (dna/output-paths.ts) keep reading the owning slug straight out of an
    // artifact's own path, and the draft-vs-export rule is untouched.
    //
    // `sync: false` on purpose, and NOT the shape it inherited: under
    // `projects/` these files were synced, but they are written straight to R2
    // by the app and never authored in a checkout — the same reason `releases/`
    // and `posts/` are false. A synced `sessions/` would put every transcript
    // in every checkout and hand `ws push` (which PRUNES) the power to delete
    // conversations that simply were not on that laptop.
    //
    // `hidden: true` keeps it out of Studio's `VisibleWorkspaceFolder` (the
    // `satisfies Record<…>` in workspace-sections.ts would otherwise be a
    // compile error) and out of the workspace browsers. It is runtime state,
    // not authored content.
    { path: 'sessions',  label: 'Sessions',     autoCreate: false, reserved: true,  hidden: true,  sync: false, versioned: false },   // the transcript IS a log already
    { path: '.Syvon',   label: 'Syvon Core',  autoCreate: false, reserved: true,  hidden: true,  sync: true, versioned: false },   // runtime state — churns every turn, not authorship
  ],
  // `.Syvon/` is the dotfile namespace for workspace-wide runtime state ONLY.
  // The DNA files (brand.json, design-tokens, text-styles, figma-tokens,
  // animation) live in `config/` and are resolved via `getBrandFilePath`.
  // `signals.json` is tracked here for DB-side use but not seeded on R2.
  dna: {
    root:    '.Syvon',
    memory:  '.Syvon/Memory',
    signals: '.Syvon/Memory/signals.json',
  },
  defaultProject: 'projects/My First Project',
} as const;

// Derived arrays
export const WORKSPACE_TOP_DIRS = WORKSPACE_CONFIG.folders
  .filter(f => f.autoCreate)
  .map(f => f.path) as readonly string[];

/**
 * A ROOT FOLDER'S NAME, AS A PERSON READS IT — `projects` → `Projects`.
 *
 * The registry already carries a `label` for every folder it defines; nothing
 * outside it could reach that, so every surface that names a path used the
 * folder's own lowercase directory name and a breadcrumb read
 * `Fortys › projects › catalog-layout` — one proper noun, one filename and one
 * project, in three different casings, in one line.
 *
 * ONLY THE ROOTS. A folder deeper in the tree is somebody's own name for
 * something (`catalog-layout`, `2026-08-31`) and title-casing it would be this
 * layer inventing a word the person did not write. So: a registered top-level
 * folder gets its registered label, and everything else gets nothing back.
 *
 * Case-insensitive, because a checkout made on Windows may hold `Projects`
 * where the registry says `projects`.
 */
export function workspaceFolderLabel(segment: string | null | undefined): string | null {
  if (!segment) return null;
  const key = segment.replace(/[\/]+$/, '').toLowerCase();
  const hit = WORKSPACE_CONFIG.folders.find((f) => (f.path as string).toLowerCase() === key);
  return hit ? (hit.label as string) : null;
}

/** Folders that participate in cloud workspace sync. */
export const WORKSPACE_SYNC_DIRS = WORKSPACE_CONFIG.folders
  .filter(f => f.sync)
  .map(f => f.path) as readonly string[];

/**
 * The docs that sit at the workspace ROOT and sync like any folder's contents.
 *
 * Every coding agent — Claude Code, Grok, the rest — looks for its instructions
 * by walking UP from the directory it is working in, so the one place a
 * workspace can speak to an agent is its root. Until this list existed, sync
 * walked registered FOLDERS only: a file at the root was never pushed, never
 * pulled, and never reached R2. Which is why no workspace carried any agent
 * instructions at all, and why an agent that opened one had no way to learn
 * that `analyze_reference_layout` existed before writing its own.
 *
 * `CLAUDE.md` is a one-line pointer at `AGENTS.md`; the content lives once.
 */
export const WORKSPACE_ROOT_DOCS = ['AGENTS.md', 'CLAUDE.md'] as const;

/** Is this workspace-relative path one of the root docs? */
export function isWorkspaceRootDoc(relPath: string): boolean {
  return (WORKSPACE_ROOT_DOCS as readonly string[]).includes(relPath);
}

/**
 * Roots whose authored TEXT writes are recorded in the file version log.
 *
 * Derived, never hand-listed — the same rule `WORKSPACE_SYNC_DIRS` follows, and
 * for the same reason: a hand-kept second list is how `ws push` came to prune
 * 510 objects under a root nobody had remembered to declare.
 */
export const WORKSPACE_VERSIONED_DIRS = WORKSPACE_CONFIG.folders
  .filter(f => f.versioned)
  .map(f => f.path) as readonly string[];

export const WORKSPACE_RESERVED_SEGMENTS = WORKSPACE_CONFIG.folders
  .filter(f => f.reserved)
  .flatMap(f => f.path.split('/')) as readonly string[];

export function isReservedSegment(segment: string): boolean {
  return WORKSPACE_RESERVED_SEGMENTS.includes(segment);
}

export function resolveWorkspacePath(
  root: string,
  key: keyof typeof WORKSPACE_CONFIG.dna,
): string {
  return joinPath(normalizeRoot(root), WORKSPACE_CONFIG.dna[key]);
}

// Folder constant re-exports. Resolve by path (not array index) so the
// folders[] order stays flexible as the paradigm evolves.
function folderPath(path: string): string {
  const entry = WORKSPACE_CONFIG.folders.find((f) => f.path === path);
  if (!entry) throw new Error(`WORKSPACE_CONFIG.folders missing entry: ${path}`);
  return entry.path;
}

export const WS_WORK = folderPath('projects');       // 'projects'
export const WS_WORKFLOWS = folderPath('workflows'); // 'workflows'
export const WS_TEMPLATES = folderPath('templates'); // 'templates'
/** The semantic source of truth — raw content (copy, references, variables)
 *  designs draw from. No design lives here; see the folders[] entry. */
export const WS_CONTENT = folderPath('content');     // 'content'
export const WS_TOOLS = folderPath('tools');         // 'tools' — workspace-authored .tool files
export const WS_IMPORT = folderPath('import');       // 'import' (external imports)
export const WS_ASSETS = folderPath('assets');       // 'assets' — kit + fonts (v11)
export const WS_CONFIG = folderPath('config');       // 'config' (v11)
export const WS_META = folderPath('meta');           // 'meta' (v11)
export const WS_WRAPPER = folderPath('wrapper');     // 'wrapper' (v11)
export const WS_KNOWLEDGE = folderPath('knowledge'); // 'knowledge' (v11)
/** The company's own records. `admin/employees` is the registry, `admin/accounting`
 *  the generated artifacts, `admin/accounts` the structured ledger. */
export const WS_ADMIN = folderPath('admin');         // 'admin'
/** The agent's own method — `.skill` files. A root, not `assets/skills/`: that
 *  one is a brand-kit primitive, this one belongs to the agent. */
export const WS_SKILLS = folderPath('skills');       // 'skills'
export const WS_AGENTS = folderPath('agents');       // 'agents' — one folder per declared agent
/** The agent's MOUNTABLE interface parts. A host surface mounts `.react` from
 *  here and from nowhere else — see the folders[] entry for the split. */
export const WS_WIDGET = folderPath('widget');       // 'widget'
/** The ingredients a widget imports. Never mounted directly. */
export const WS_UI = folderPath('ui');               // 'ui'

/**
 * Auxiliary brands (aux-brands/v1) — `brands/{slug}/`, one theme root per
 * extra brand. NOT where the workspace's own brand goes: that is `WS_CONFIG` /
 * `WS_META` / `WS_WRAPPER` / `WS_ASSETS` at the root. Build paths with
 * `getAuxBrandFolder` rather than from this directly, and tell an auxiliary
 * brand from v8.6 residue with `classifyBrandsFolders`.
 */
export const WS_BRANDS = folderPath('brands');       // 'brands'
/** The cloud render service's TRANSIT prefix — not an output location.
 *  Replaced `WS_EXPORT`; see the folders[] entry for why `export/` is gone. */
export const WS_RENDER_TRANSIT = folderPath('.renders');
export const WS_SYVON = WORKSPACE_CONFIG.dna.root;                  // '.Syvon'
export const WS_SYVON_MEMORY = WORKSPACE_CONFIG.dna.memory;
export const WS_SYVON_SIGNALS = WORKSPACE_CONFIG.dna.signals;
export const DEFAULT_PROJECT_FOLDER = WORKSPACE_CONFIG.defaultProject;

// ── Workspace-root path detection ────────────────────────────────────

/**
 * Prefixes that are workspace-root-relative (not relative to a .seq file's directory).
 *
 * Canonical paths are **lowercase** (`brands/`, `assets/`, `templates/`,
 * `projects/`) to match `@syvon/catalog/r2-paths`. `export/` was RETIRED
 * 2026-07-31 and is deliberately absent from the array below.
 * `isWorkspaceRootPath` normalizes case, so title-case input still resolves
 * without title-case entries listed here.
 */
export const WORKSPACE_ROOT_PREFIXES = [
  // canonical (lowercase)
  'projects/', 'workflows/', 'templates/', 'assets/', 'import/', '.renders/', 'posts/', 'sessions/',
  'tools/',
  // The semantic source of truth. Listed so `content/{piece}/copy.md`
  // referenced from a design, a `.tool` or a comp resolves against the
  // workspace ROOT rather than whatever directory the referring file sits in.
  'content/',
  // v11 brand-at-root. Adding one here is never enough on its own — WS_ROOT_RE
  // in paths.ts must list it too, and paths.test.ts guards that they agree.
  'config/', 'meta/', 'wrapper/', 'knowledge/', '.meta/',
  // The company's own records — employees, accounting artifacts, the ledger.
  // Listed here so `admin/accounts/2026/08/payroll.csv` written into a `.comp`
  // or read by a `.tool` resolves against the workspace ROOT and not against
  // whatever directory the referring file happens to sit in.
  'admin/',
  // The agent's own method. Listed so `skills/report.skill` referenced from a
  // `.tool` or a comp resolves against the workspace ROOT rather than against
  // whatever directory the referring file happens to sit in.
  'skills/',
  // The agents declared here. Listed so `agents/main/agent.json` referenced
  // from a `.tool` or a comp resolves against the workspace ROOT rather than
  // against whatever directory the referring file happens to sit in.
  'agents/',
  // The agent's own interface. A widget is referenced from a .comp and from a
  // host surface alike, so it has to resolve against the workspace ROOT in both
  // — `widget/foo.react` inside a sequence must not become
  // `projects/x/widget/foo.react`.
  'widget/', 'ui/',
  // Auxiliary brands (aux-brands/v1). `brands/lakeside/assets/logos/logo.svg`
  // named inside a comp is the workspace's client brand, never a folder beside
  // the comp — and a surviving v8.6 reference still 404s honestly here rather
  // than resolving somewhere else.
  'brands/',
  // Reserved system namespace
  '.Syvon/', '.syvon/',
] as const;

/** Check if a path starts with a workspace-root prefix. */
export function isWorkspaceRootPath(rawPath: string): boolean {
  const norm = rawPath.replace(/\\/g, '/');
  return WORKSPACE_ROOT_PREFIXES.some((p) => norm.startsWith(p) || norm.toLowerCase().startsWith(p.toLowerCase()));
}

// ── Project-folder + origin convention (v8.5) ────────────────────────
//
// Projects store input + output files FLAT under `projects/{slug}/`.
// There is intentionally NO `projects/{slug}/assets/` subfolder — input
// vs output is a DB field (`ProjectItem.origin`), not a path segment.
// Reusable media lives on the brand instead — see `getBrandAssetsFolder`.
//
// The path builders themselves are `getProjectFolder` / `getProjectItemPath`
// in `./dna/project-paths` (canonical home). This section adds only the
// origin domain + the derived live-prefix set.

/** ProjectItem.origin domain. Input = user-supplied make context;
 *  output = agent-generated `.comp`/audio/etc. */
export const PROJECT_ITEM_ORIGINS = ['input', 'output'] as const;
export type ProjectItemOrigin = (typeof PROJECT_ITEM_ORIGINS)[number];

/** Live (cloud-synced) workspace root prefixes, lowercase, trailing-slash.
 *  Derived from the synced folder set so it can never drift from the
 *  folder registry. Legacy prefixes (library/, title-case) are NOT here —
 *  use WORKSPACE_ROOT_PREFIXES for tolerant readers. */
export const WORKSPACE_LIVE_PREFIXES = WORKSPACE_SYNC_DIRS
  .map((d) => `${d}/`) as readonly string[];

/**
 * Every prefix an asset proxy may SERVE — `WORKSPACE_LIVE_PREFIXES` plus
 * `posts/`. Deliberately NOT folded into `WORKSPACE_SYNC_DIRS`/
 * `WORKSPACE_LIVE_PREFIXES` themselves: `posts/` is `sync:false` (copy-on-
 * publish, written straight to R2 — see its folder entry above), and adding
 * it to the synced set would make it a PRUNABLE folder, which is exactly what
 * it must never be.
 *
 * Exists because `WORKSPACE_LIVE_PREFIXES` being the sync set ALSO made it
 * the resolver's servable set (`packages/brand-surface/src/client/
 * asset-resolver.ts`) — an unregistered-there prefix falls through to a
 * relative-to-the-current-page resolution, a silent blank rather than a 404.
 * `posts/` needs to be servable without being syncable, so it needed its own
 * name rather than another entry in the sync-derived one.
 */
export const WORKSPACE_SERVABLE_PREFIXES = [...WORKSPACE_LIVE_PREFIXES, 'posts/'] as readonly string[];

/* ── Catalog-as-workspace ─────────────────────────────────────────────
 * The catalog is surfaced to admins as a synthetic workspace so the editor
 * and the syvon-app sync engine can drive it through the normal workspace
 * files API. These constants are the shared SoT (studio + syvon-app). */

/** Reserved workspace id for the synthetic catalog workspace. */
export const CATALOG_WORKSPACE_ID = 'catalog';

/** R2 prefix the catalog workspace maps to (the existing catalog content). */
export const CATALOG_WORKSPACE_PREFIX = `${CATALOG_WORKSPACE_ID}/`;

/** Display name for the catalog workspace in pickers/lists. */
export const CATALOG_WORKSPACE_NAME = 'Catalog';

/**
 * The catalog's OWN synced roots. **Catalog-exclusive — not a workspace shape.**
 *
 * `WORKSPACE_CONFIG.folders` above describes a WORKSPACE, and the catalog is not
 * one. It is surfaced as a synthetic workspace so the editor and the sync engine
 * can drive it, but its tree is its own: `catalog/{brands,fonts,workflows}/`,
 * with per-brand DNA, assets and workflow overlays addressed by the builders in
 * `packages/catalog/src/r2-paths.ts`. In particular `brands/` is LIVE here —
 * the v11 flatten that retired `brands/` for workspaces ("the brand IS the
 * workspace") was a workspace migration and never applied to the catalog.
 *
 * This constant exists because that difference was implicit, and being implicit
 * cost 510 objects: `ws push catalog` walked the WORKSPACE roots, did not find
 * `brands/` among them, and pruned every one of those paths from R2 as
 * "deleted locally" (restored 2026-08-05 from the checkout).
 *
 * If you add a top-level folder to the catalog on R2, add it here too. A folder
 * missing from this list is invisible to the sync engine — which today means it
 * silently never uploads, and the moment anything writes it into a sync manifest
 * it becomes a deletion candidate.
 */
export const CATALOG_SYNC_DIRS = [
  'brands',
  'fonts',
  'workflows',
  /*
   * THE TEMPLATE LIBRARY — the reason explore and the checkout disagreed.
   *
   * `catalog/templates/` is what `listCatalogTemplates` reads (the flat R2
   * mirror behind `/api/catalog/examples`, `/explore`, and Surface's picker),
   * and it was absent from this list — so `ws push catalog` never walked it and
   * 418 files could not reach R2 by pushing at all. The only way anything got
   * there was `sync-templates.ts` reading the SECOND copy under
   * `packages/catalog/content/`, which is precisely the duplicate-source-of-
   * truth this list is supposed to make unnecessary.
   *
   * The symptom read as "I pushed the catalog and explore is different", and it
   * was: the checkout's seven collections were never uploaded, while three
   * retired ones (brand-guidelines, charts, instagram-ads) stayed on R2 forever
   * because push prunes only what its manifest tracks and it tracked none of
   * them.
   */
  'templates',
  /*
   * `feed/` — the published-item surface. Same class of omission: a real root
   * in every catalog checkout, never walked, so anything authored there stayed
   * local.
   */
  'feed',
  /*
   * `assets/` — the shared mockup library (product, signage, outdoor screen).
   * `product_mockup.tool` reads these by path, and on any lane but a local
   * checkout that path resolves through R2 — where 91 of the 95 files had
   * never been uploaded, because this root was not walked either. The four
   * that WERE there came from a folder since renamed, so R2 held only stale
   * names for a library that had moved on.
   */
  'assets',
  /*
   * `tools/` — the workspace-defined `.tool` scripts. Already a root in
   * `WORKSPACE_SYNC_DIRS`, so an ordinary workspace has always pushed it; the
   * catalog's list simply never gained it, and the asymmetry is invisible
   * locally because the stdio lane resolves a tool against the CHECKOUT. So
   * `product_mockup`, `storyboard_chain`, `storyboard_stitch` and
   * `text_mask_image` ran perfectly on this machine and did not exist at all
   * on the cloud/connector lane, which resolves the same path through R2.
   * A tool the catalog ships is a tool every workspace can call — that is the
   * whole point of putting it here rather than in one workspace — and it can
   * only be called where it has been uploaded.
   */
  'tools',
  '.Syvon',
] as const;

/**
 * Which roots the sync engine may walk — and, just as importantly, may PRUNE —
 * for a given workspace id. The catalog answers differently from everything
 * else, and every caller that scans or prunes must ask this rather than reach
 * for `WORKSPACE_SYNC_DIRS` directly.
 */
export function syncDirsFor(workspaceId: string): readonly string[] {
  return workspaceId === CATALOG_WORKSPACE_ID ? CATALOG_SYNC_DIRS : WORKSPACE_SYNC_DIRS;
}

/**
 * The catalog keeps NO file history.
 *
 * It is a synthetic workspace with no `Workspace` row, so every FK-bearing
 * write against its id fails — the same reason `touchIndex` short-circuits on
 * it. And its content is authored in a git checkout under `packages/catalog`,
 * which is already a version log with better tools than this one.
 */
export const CATALOG_VERSIONED_DIRS = [] as const;

/**
 * The versioned roots for THIS workspace. Every recorder asks this rather than
 * reaching for `WORKSPACE_VERSIONED_DIRS` — the twin of `syncDirsFor`, and the
 * reason is the same: being implicit about the catalog's different root set is
 * what the 510-object incident was made of.
 */
export function versionedDirsFor(workspaceId: string): readonly string[] {
  return workspaceId === CATALOG_WORKSPACE_ID ? CATALOG_VERSIONED_DIRS : WORKSPACE_VERSIONED_DIRS;
}

/**
 * Render output is a PRODUCT, not authorship: `projects/{slug}/output/` holds
 * the mp4s, posters and hydrated comps the renderer emits, all of them
 * regenerable from the sources beside them.
 *
 * Carved out here rather than in the registry because the registry is
 * root-granular and this is one folder deep inside a root that is otherwise
 * entirely authored.
 */
const PROJECT_OUTPUT_RE = /^projects\/[^/]+\/output\//;

/**
 * Does this WORKSPACE-RELATIVE key belong in the file version log?
 *
 * Root rule only. Whether the file is TEXT and whether it is under the size cap
 * are `isTextFile` and the recorder's job — three separate questions, kept
 * separate so a caller cannot accidentally answer one and believe it answered
 * all three.
 */
export function isVersionedKey(key: string, workspaceId?: string): boolean {
  const root = key.split('/')[0];
  if (!root) return false;
  const dirs = workspaceId ? versionedDirsFor(workspaceId) : WORKSPACE_VERSIONED_DIRS;
  if (!dirs.includes(root)) return false;
  return !PROJECT_OUTPUT_RE.test(key);
}

// ── Template type detection ──────────────────────────────────────────

export type TemplateType = 'lottie' | 'rive' | 'design' | 'video' | 'still' | 'react-component';

/** Infer template type from file extension. Single source of truth. */
export function inferTemplateType(path: string): TemplateType {
  const l = path.toLowerCase();
  if (l.endsWith('.dsgn') || l.endsWith('.design') || l.endsWith('.xml')) return 'design';
  if (l.endsWith('.riv')) return 'rive';
  if (l.endsWith('.react') || l.endsWith('.tsx') || l.endsWith('.jsx')) return 'react-component';
  if (l.match(/\.(mp4|webm|mov|ogg)(\?|$)/)) return 'video';
  if (l.match(/\.(png|jpe?g|gif|webp|svg)(\?|$)/)) return 'still';
  if (l.endsWith('.json') || l.endsWith('.lottie')) return 'lottie';
  return 'lottie';
}

/**
 * Normalize a workspace-relative path so the file lives under projects/{projectName}/.
 *
 * `activeProject` is the project the caller is working in — `ToolContext.projectSlug`
 * at every agent call site. It is used ONLY for a path that names no project of its
 * own (a bare `deck.comp`). Without it such a path resolves into
 * DEFAULT_PROJECT_FOLDER, which is a guess: reads then 404 with "The specified key
 * does not exist", and writes silently land in a project the user never opened.
 * Pass it wherever it is known.
 */
export function ensureProjectFolder(p: string, activeProject?: string): string {
  const norm = p.replace(/\\/g, '/').replace(/^\/+/, '');
  const projectsPrefix = `${WS_WORK}/`;
  const lower = norm.toLowerCase();
  let stripLen = 0;
  if (norm.startsWith(projectsPrefix)) stripLen = projectsPrefix.length;
  else if (lower.startsWith('projects/')) stripLen = 9;
  else if (norm.startsWith('Documents/')) stripLen = 10;
  else if (lower.startsWith('documents/')) stripLen = 10;
  let rest = stripLen > 0 ? norm.slice(stripLen) : norm;
  rest = rest.replace(/^(shots|sequences|designs)\//, '');
  const parts = rest.split('/').filter(Boolean);
  const filename = parts.length > 0 ? parts[parts.length - 1]! : 'untitled.comp';
  if (parts.length >= 2) {
    const projectName = parts.slice(0, -1).join('/');
    return `${WS_WORK}/${projectName}/${filename}`;
  }
  const active = activeProject?.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/^projects\//i, '');
  if (active) return `${WS_WORK}/${active}/${filename}`;
  const fallbackProject = DEFAULT_PROJECT_FOLDER.replace(`${WS_WORK}/`, '');
  return `${WS_WORK}/${fallbackProject}/${filename}`;
}
