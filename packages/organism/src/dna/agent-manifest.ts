/**
 * `agents/{slug}/agent.json` — ONE agent, declared in one file.
 *
 * ── The problem ───────────────────────────────────────────────────────────
 * An agent's surface was authored in five unrelated places, none of which knew
 * the others existed:
 *
 *   config/agent-persona.json   posture (archetype) → the central tool list
 *   config/mcp/*.json           a tool allowlist that REPLACED that list
 *   config/skills.json          which assets/skills/*.md apply, per route
 *   tools/**\/*.tool            local verbs, found by walking a directory
 *   workflows/{slug}/           flows, found by string-concatenating a path
 *
 * Nothing joined them, so "what can this agent do" had no single answer and
 * three different definitions of whether a workspace was an agent at all: it
 * carries `tools/` (workspace-kind.ts), it carries the persona marker
 * (agent-card.ts), or it is listed + maker + non-empty exposedTools
 * (subscribable-agents.ts). Saturn satisfies the last two and not the first.
 *
 * This file is the join. Everything above keeps its resolver — none of that
 * machinery is rewritten — and the manifest becomes the one place that POINTS
 * at them.
 *
 * ── Why a folder per agent, when there is only ever one today ─────────────
 * `agents/{slug}/agent.json` rather than `agents.json` or `config/agent.json`,
 * because the second level costs nothing now and is the whole migration later.
 * The identity is 1:1 today and enforced in the schema — `Actor.brandId` is
 * `@unique`, `Actor.exposedTools` is one flat array — so a workspace ships
 * exactly one manifest, conventionally `agents/main/`. When the schema grows a
 * row per agent, a second folder is a second agent and no path, no reader and
 * no URL changes shape.
 *
 * ── The card still exists, and this projects onto it ──────────────────────
 * `parseAgentCard`, `Actor.agentCard`, scroll's honeycomb, the portal's
 * archetype editor and von-node's `unhostableReason` all read an `AgentCard`.
 * A manifest yields one through `manifestToCard`, so every one of them keeps
 * working unchanged and this is additive rather than a migration. A workspace
 * with no manifest reads its `config/agent-persona.json` exactly as before.
 *
 * ── Exceptions, never a copy ──────────────────────────────────────────────
 * `tools.add` / `tools.remove` are a `ToolDiff`, which archetype-tools.ts has
 * accepted since it shipped and which NOTHING has ever passed — not the push
 * projection, not the live door. That is why Alto Mare sits frozen at the 24
 * names it copied while every other maker moved to 28. The manifest states
 * exceptions and the diff carries them, so a tool added centrally reaches this
 * agent unless it explicitly turned that tool off.
 */

import { expandPackages, packageById } from '@syvon/tool-library';
import { WORKSPACE_CONFIG } from '../workspace-config';
import {
  AGENT_ARCHETYPES,
  isAgentArchetype,
  type AgentArchetype,
  type AgentCard,
} from './agent-card';
import { resolveExposedTools, type ToolDiff } from './archetype-tools';
import {
  capabilitiesInUse,
  checkAgentPermissions,
  parseAgentPermissions,
  type AgentPermissions,
  type Capability,
} from './agent-permissions';
import { SKILL_ROUTES, SKILL_ROUTE_ALL, type SkillRoute } from './skills-config';

/** The workspace root that holds them. Registered in `workspace-config.ts`. */
export const AGENTS_DIR = 'agents';

/**
 * The whole workspace, said out loud.
 *
 * `"scope": "*"` and a missing `scope` resolve identically — both to `null`,
 * which every matcher reads as "allow". What differs is what they MEAN to a
 * reader and to the reconcile: a primary agent may omit the field (it is what
 * every agent had before scopes existed), while a secondary must state one,
 * and this is how it states "everything" without writing out twenty-two roots
 * that would then drift as the organism grows.
 */
export const SCOPE_ALL = '*' as const;

/**
 * The one agent a workspace has today.
 *
 * A convention rather than a rule: readers resolve by folder name and this is
 * only the name `ws` writes and the UI defaults to. Nothing rejects a manifest
 * under another slug, because the day there are two, neither is "main".
 */
export const DEFAULT_AGENT_SLUG = 'main';

/** The manifest file inside an agent's folder. */
export const AGENT_MANIFEST_FILE = 'agent.json';

export function agentFolder(slug: string): string {
  return `${AGENTS_DIR}/${slug}`;
}

export function agentManifestPath(slug: string): string {
  return `${agentFolder(slug)}/${AGENT_MANIFEST_FILE}`;
}

/**
 * Slugs are a URL segment — `/agents/{workspace}/{slug}` — and a folder name.
 * Same shape as `AGENT_SLUG` in vessel's path header, deliberately: an agent
 * addressed in two products must not be addressable in one and not the other.
 */
export const AGENT_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function isAgentSlug(value: unknown): value is string {
  return typeof value === 'string' && AGENT_SLUG_RE.test(value);
}

/**
 * WHAT THIS AGENT LENDS, as exceptions to its archetype.
 *
 * `packages` is the additive half — ids from `@syvon/tool-library`, the same
 * vocabulary `config/mcp/*.json` already uses, so a workspace that wants "the
 * create package too" says four characters rather than copying twelve names.
 */
export interface AgentToolSpec {
  /** Tool-library package ids to lend beyond the archetype's own list. */
  packages?: string[];
  /** Individual registry tools to lend beyond it. */
  add?: string[];
  /** Archetype tools to withhold. Names not in the base are REPORTED, not ignored. */
  remove?: string[];
}

/**
 * A THIRD-PARTY MCP SERVER this agent may reach — the customer's own endpoint.
 *
 * ── The credential is a REFERENCE, never a value ──────────────────────────
 * `tokenRef` names a secret; it never holds one. This file syncs to R2, diffs
 * in review and is readable by anyone who can read the workspace — a bearer
 * token written here is a token published. The indirection is the only reason
 * this field can exist in a synced file at all.
 *
 * ── Governed, not merely reachable ────────────────────────────────────────
 * A remote server's tools arrive prefixed `{id}__{tool}` and go into the same
 * `exposedTools` allowlist as everything else, so von-node's existing filter
 * decides whether a call is refused. The alternative — the agent loop dialling
 * the remote itself — is one less hop and gives up the property that the
 * allowlist is the whole answer to "what can this agent do".
 */
export interface AgentServer {
  /** Stable id. Becomes the `{id}__{tool}` prefix, so it is slug-shaped. */
  id: string;
  /** The MCP endpoint. Absolute http(s) — a relative URL has no meaning here. */
  url: string;
  /** Name of the secret holding the bearer token. NEVER the token itself. */
  tokenRef?: string;
  /**
   * Which of the server's tools to take. Absent means "whatever it lists",
   * which is the honest default for a server the customer controls and the
   * reason `checkAgentManifest` says so out loud.
   */
  tools?: string[];
  label?: string;
  description?: string;
}

/**
 * ONE CARD ON THIS AGENT'S DASHBOARD.
 *
 * A card either DRAWS or BROWSES, and that is the whole distinction:
 *
 *   `widget`        a `.react` under `widget/` or `ui/` — an interface over the
 *                   data. What an employee registry wants: who is on the books,
 *                   not that `employees_list.json` exists.
 *   `path` + `files`  a workspace folder, listed — what a folder of documents
 *                   wants. `files` narrows it to the kinds worth showing, so a
 *                   payslips card shows the PDFs and the spreadsheets and not
 *                   the ledger CSV they were derived from.
 *
 * ── Why this lives on the AGENT ───────────────────────────────────────────
 * Vessel ships a fixed list of sections — Assets, Projects, Brand, Meta — which
 * is the right answer for a workspace browsed as itself and the wrong one for a
 * workspace serving several roles. An HR app's screens are Employees, Time,
 * Payslips, Ledger; a catalogue app's are line sheets and colorways. Neither is
 * a subset of a generic file browser, and neither belongs in an app that serves
 * every customer.
 *
 * So the agent declares its own, and Vessel's fixed sections become the
 * FALLBACK — what an agent that declares nothing still gets, which is every
 * agent that exists today.
 */
export interface AgentDashboardCard {
  /** What the card is called. Required — a card with no name is a mystery box. */
  label: string;
  /** Material Symbols name, as the section table uses. */
  icon?: string;
  /** One line under the label. */
  hint?: string;
  /** A `.react` that draws this card. Names `widget/<type>.react`, then `ui/`. */
  widget?: string;
  /** A workspace folder this card browses. Must be inside the agent's scope. */
  path?: string;
  /**
   * Can this card be OPENED? Default true.
   *
   * `false` for a card that has already said everything it has — a single
   * figure, a status. Opening one to find the same thing larger is a click
   * that teaches you not to click, and it costs the board's other cards the
   * attention.
   */
  open?: boolean;
  /** Authored props handed to the widget, as a screen's widget takes them. */
  props?: Record<string, unknown>;
  /**
   * ONE CARD PER ROW — this card expands into many, from a JSON file.
   *
   * `{ source: 'admin/employees/employees_list.json', at: 'employees' }` reads
   * that file, takes the array at `at`, and mounts `widget` once per row with
   * the row as its `item` prop. Eleven employees become eleven bento cards, not
   * eleven rows inside one.
   *
   * The difference is what a card IS on this board: a thing you can isolate,
   * pin and open on its own. A grid drawn inside a single widget looks similar
   * and is one card wearing a table — you cannot open one person, only the
   * component that lists them all.
   *
   * `label` names the field to title each card by, `key` the field that
   * identifies it (React's key, and the card's path). Everything on the file
   * BESIDE the array rides along as `meta`, so a row that references a lookup
   * table — an employee's `locations` against the file's own `locations` — can
   * resolve it without a second read.
   */
  each?: {
    /** Workspace-relative JSON file. Must be inside the agent's scope. */
    source: string;
    /** Property holding the array. Absent means the file IS the array. */
    at?: string;
    /** Field to title each card by. Defaults to `name`, then the key. */
    label?: string;
    /** Field that identifies a row. Defaults to `id`. */
    key?: string;
    /**
     * WHICH ROWS. Field → value, all of which must match.
     *
     * `{ "active": true }` is the common one and the reason this exists: a
     * registry keeps the rows it has stopped using (the company's own account,
     * a leaver) because deleting one is how a person goes missing from a
     * ledger — so the file is right to hold them and the board is right not to
     * draw them.
     *
     * A value may be an ARRAY, which reads as "any of": `{ "position": ["Sales",
     * "Manager"] }`.
     */
    where?: Record<string, unknown>;
    /** Field to order by. Prefix `-` for descending: `-startDate`. */
    sort?: string;
    /** Most rows to draw. Absent draws them all. */
    limit?: number;
  };
  /**
   * Extensions to show in that folder — `["pdf", "xlsx"]`. Absent shows
   * everything.
   *
   * Compared without the dot and case-insensitively, because an authored list
   * that has to remember `.PDF` is a list that will be wrong once.
   */
  files?: string[];
}

/** What a member may do with this agent — the per-agent value of `toolAccess`. */
export const AGENT_ACCESS_LEVELS = ['none', 'chat', 'full'] as const;
export type AgentAccess = (typeof AGENT_ACCESS_LEVELS)[number];

/** The membership roles an access grant can be keyed on. */
export const AGENT_ACCESS_ROLES = ['owner', 'editor', 'viewer'] as const;
export type AgentAccessRole = (typeof AGENT_ACCESS_ROLES)[number];

export interface AgentManifest {
  /** The marker, mirroring `agentPersona` on the card it projects onto. */
  agent: true;
  /** From the folder name, never from the file — one source for the address. */
  slug: string;

  // ── Posture. Identical meaning to the card's, because it becomes the card. ──
  archetype?: AgentArchetype;
  does?: string;
  delegatesTo?: string[];
  repos?: string[];

  /** Exceptions to the archetype's tool surface. */
  tools?: AgentToolSpec;
  /** `.tool` addresses from `tools/` — `name` or `slug/name`. */
  local?: string[];
  /** Which `assets/skills/*.md` apply, per route. Absorbs `config/skills.json`. */
  skills?: Partial<Record<SkillRoute | typeof SKILL_ROUTE_ALL, string[]>>;
  /** Workflow slugs this agent may run. */
  flows?: string[];
  /** Workspace-relative files pinned into its context every turn. */
  context?: string[];
  /** Third-party MCP endpoints, proxied and allowlisted like everything else. */
  servers?: AgentServer[];
  /**
   * WHAT THIS AGENT CAN SEE — path prefixes, first segment a registered root.
   *
   * The map that makes two agents in one workspace genuinely separate rather
   * than merely differently-labelled: a catalogue agent scoped to
   * `["assets", "projects", "config", "meta"]` cannot read
   * `admin/employees/…` whatever tools it holds, because `exposedTools`
   * governs which VERBS an agent has and never which PATHS they reach.
   *
   * `"*"` MEANS THE WHOLE WORKSPACE, EXPLICITLY — an administrator agent, the
   * one that is meant to see everything. It resolves to the same `null` scope
   * an unscoped agent has, and the difference is not the behaviour but the
   * STATEMENT: absent is an omission, `"*"` is a decision. A secondary agent
   * is refused for the first and accepted for the second, so nobody gets full
   * reach by forgetting a field.
   *
   * ABSENT MEANS THE WHOLE WORKSPACE. That is today's behaviour for every
   * agent in existence, so adding this field breaks none of them, and an
   * operator opts into narrowing rather than discovering it. Present means an
   * allowlist: anything not under an entry is invisible, unreadable and
   * unwritable — enforced in the tool context, not merely hidden in a UI.
   */
  scope?: string[] | typeof SCOPE_ALL;
  /** Per-role access, defaulting to the workspace membership's own `toolAccess`. */
  access?: Partial<Record<AgentAccessRole, AgentAccess>>;
  /**
   * WHAT IT MAY DO WITHOUT BEING ASKED — the third axis, beside `tools` (which
   * verbs) and `scope` (which paths).
   *
   * A capability class → `allow` | `ask` | `deny`. Absent classes fall to the
   * archetype's defaults, so almost every agent writes nothing here and still
   * has a complete, stated answer — see `agent-permissions.ts` for the classes,
   * the defaults, and why this is not a per-tool list.
   *
   * It is what the commit gate reads. Before this existed the gate published an
   * attest and waited for an `authorize` that only an attended surface sends,
   * so on a deployed app every write timed out and was refused, inside a turn
   * that otherwise read as working.
   */
  permissions?: AgentPermissions;
  /**
   * THIS AGENT'S DASHBOARD — its cards, in order.
   *
   * Absent falls back to the host app's own sections, which is what every
   * agent had before this field existed. Present replaces them entirely: a
   * role that has said what its app looks like should not also inherit a
   * generic file browser's idea of it.
   */
  dashboard?: AgentDashboardCard[];

  // ── How it looks. Passed through to the card verbatim. ──
  accent?: string;
  logo?: string;
  envMap?: string;
  avatarComp?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim());
}

function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Same rule as the card's: no scheme, no absolute root, no `..` segment. */
function isWorkspacePath(value: string): boolean {
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  if (value.startsWith('/') || value.startsWith('\\')) return false;
  return !value.split(/[\\/]/).includes('..');
}

function assetPath(value: unknown): string | undefined {
  const raw = text(value);
  return raw && isWorkspacePath(raw) ? raw : undefined;
}

function parseToolSpec(value: unknown): AgentToolSpec | undefined {
  if (!isRecord(value)) return undefined;
  const packages = stringList(value.packages);
  const add = stringList(value.add);
  const remove = stringList(value.remove);
  if (!packages.length && !add.length && !remove.length) return undefined;
  return {
    ...(packages.length ? { packages } : {}),
    ...(add.length ? { add } : {}),
    ...(remove.length ? { remove } : {}),
  };
}

/**
 * A server row survives only with an id and an absolute http(s) url. Both are
 * load-bearing — the id becomes a tool-name prefix and the url is dialled — so
 * a row missing either is dropped here and reported by `checkAgentManifest`,
 * the same split parsing and checking take everywhere else in this folder.
 */
function parseServer(value: unknown): AgentServer | undefined {
  if (!isRecord(value)) return undefined;
  const id = text(value.id);
  const url = text(value.url);
  if (!id || !isAgentSlug(id) || !url || !/^https?:\/\//i.test(url)) return undefined;
  const tools = stringList(value.tools);
  const tokenRef = text(value.tokenRef);
  const label = text(value.label);
  const description = text(value.description);
  return {
    id,
    url,
    ...(tokenRef ? { tokenRef } : {}),
    ...(tools.length ? { tools } : {}),
    ...(label ? { label } : {}),
    ...(description ? { description } : {}),
  };
}

function parseSkills(value: unknown): AgentManifest['skills'] {
  if (!isRecord(value)) return undefined;
  const out: Record<string, string[]> = {};
  for (const route of [SKILL_ROUTE_ALL, ...SKILL_ROUTES] as const) {
    const names = stringList(value[route]);
    // A name with a path separator is refused for the same reason
    // `skills-config.names()` refuses one: it is what keeps `_proposed/`
    // unroutable and `../` unrepresentable in the one shared resolver.
    const clean = names.filter((n) => !n.includes('/') && !n.includes('\\'));
    if (clean.length) out[route] = clean;
  }
  return Object.keys(out).length ? (out as AgentManifest['skills']) : undefined;
}

/**
 * One dashboard card. A card with no `label` is dropped: a nameless card is a
 * mystery box, and its own author is the one who would have to guess.
 */
function parseDashboardCard(value: unknown): AgentDashboardCard | undefined {
  if (!isRecord(value)) return undefined;
  const label = text(value.label);
  if (!label) return undefined;
  const card: AgentDashboardCard = { label };
  const icon = text(value.icon);
  const hint = text(value.hint);
  const widget = text(value.widget);
  const path = text(value.path);
  const files = stringList(value.files).map((f) => f.replace(/^[.]/, '').toLowerCase());
  if (icon) card.icon = icon;
  if (hint) card.hint = hint;
  if (widget) card.widget = widget;
  if (path && isWorkspacePath(path)) card.path = path;
  if (files.length) card.files = files;
  if (isRecord(value.props)) card.props = value.props as Record<string, unknown>;
  if (isRecord(value.each)) {
    const source = text(value.each.source);
    // A source outside the workspace is dropped rather than resolved — the
    // same rule every path on this manifest follows.
    if (source && isWorkspacePath(source)) {
      const limit = typeof value.each.limit === 'number' && value.each.limit > 0 ? value.each.limit : undefined;
      card.each = {
        source,
        ...(text(value.each.at) ? { at: text(value.each.at)! } : {}),
        ...(text(value.each.label) ? { label: text(value.each.label)! } : {}),
        ...(text(value.each.key) ? { key: text(value.each.key)! } : {}),
        ...(isRecord(value.each.where) ? { where: value.each.where as Record<string, unknown> } : {}),
        ...(text(value.each.sort) ? { sort: text(value.each.sort)! } : {}),
        ...(limit ? { limit } : {}),
      };
    }
  }
  if (value.open === false) card.open = false;
  return card;
}

function parseAccess(value: unknown): AgentManifest['access'] {
  if (!isRecord(value)) return undefined;
  const out: Partial<Record<AgentAccessRole, AgentAccess>> = {};
  for (const role of AGENT_ACCESS_ROLES) {
    const level = value[role];
    if (typeof level === 'string' && (AGENT_ACCESS_LEVELS as readonly string[]).includes(level)) {
      out[role] = level as AgentAccess;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Narrow raw JSON to a manifest. Returns null when the file is not an agent
 * marker — one definition of "is this an agent", the way `parseAgentCard` is
 * for the card.
 *
 * TOLERANT, like every other parser here: a misspelled archetype loses the
 * archetype, not the agent, and a malformed server row loses that row. What it
 * must never do is repair a manifest into something the author did not write,
 * so discrepancies are `checkAgentManifest`'s job.
 *
 * @param slug the FOLDER name. The file cannot name itself — an address that
 *             disagrees with where it lives is an address with two answers.
 */
export function parseAgentManifest(raw: unknown, slug: string): AgentManifest | null {
  if (!isRecord(raw) || raw.agent !== true) return null;
  if (!isAgentSlug(slug)) return null;

  const delegatesTo = stringList(raw.delegatesTo);
  const repos = stringList(raw.repos);
  const local = stringList(raw.local);
  const flows = stringList(raw.flows);
  const context = stringList(raw.context).filter(isWorkspacePath);
  // Scope entries are normalised the way a path is, not the way a string is:
  // trailing slashes dropped, backslashes folded, `..` refused outright. An
  // entry that survives is a prefix a matcher can compare against directly, so
  // no consumer has to re-normalise and none of them can disagree about it.
  const scopeAll = raw.scope === SCOPE_ALL;
  const scope = stringList(raw.scope)
    .map((p) => p.replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''))
    .filter((p) => p.length > 0 && isWorkspacePath(p));

  const servers = Array.isArray(raw.servers)
    ? raw.servers.map(parseServer).filter((s): s is AgentServer => !!s)
    : [];

  const tools = parseToolSpec(raw.tools);
  const skills = parseSkills(raw.skills);
  const access = parseAccess(raw.access);
  const permissions = parseAgentPermissions(raw.permissions);
  const dashboard = Array.isArray(raw.dashboard)
    ? raw.dashboard.map(parseDashboardCard).filter((c): c is AgentDashboardCard => !!c)
    : [];

  const accent = text(raw.accent);
  const logo = assetPath(raw.logo);
  const envMap = assetPath(raw.envMap);
  const avatarComp = assetPath(raw.avatarComp);

  return {
    agent: true,
    slug,
    ...(isAgentArchetype(raw.archetype) ? { archetype: raw.archetype } : {}),
    ...(text(raw.does) ? { does: text(raw.does)! } : {}),
    ...(delegatesTo.length ? { delegatesTo } : {}),
    ...(repos.length ? { repos } : {}),
    ...(tools ? { tools } : {}),
    ...(local.length ? { local } : {}),
    ...(skills ? { skills } : {}),
    ...(flows.length ? { flows } : {}),
    ...(context.length ? { context } : {}),
    ...(servers.length ? { servers } : {}),
    ...(scopeAll ? { scope: SCOPE_ALL } : scope.length ? { scope } : {}),
    ...(access ? { access } : {}),
    ...(permissions ? { permissions } : {}),
    ...(dashboard.length ? { dashboard } : {}),
    ...(accent ? { accent } : {}),
    ...(logo ? { logo } : {}),
    ...(envMap ? { envMap } : {}),
    ...(avatarComp ? { avatarComp } : {}),
  };
}

/**
 * The manifest as an `AgentCard` — the shape everything downstream already
 * reads, and what `Actor.agentCard` keeps holding.
 *
 * Deliberately LOSSY. The card is the roster's answer to "who is this and may
 * I ask it things"; tools, skills, flows and servers are the workspace's own
 * business and resolve elsewhere. Projecting them into the column would put a
 * second copy of the tool surface next to `exposedTools`, which is the exact
 * two-sources-of-truth problem the reconcile exists to prevent.
 */
export function manifestToCard(manifest: AgentManifest): AgentCard {
  return {
    agentPersona: true,
    ...(manifest.archetype ? { archetype: manifest.archetype } : {}),
    ...(manifest.does ? { does: manifest.does } : {}),
    ...(manifest.delegatesTo?.length ? { delegatesTo: manifest.delegatesTo } : {}),
    ...(manifest.repos?.length ? { repos: manifest.repos } : {}),
    /*
     * PERMISSIONS RIDE ON THE CARD, and they are the one exception to the
     * lossiness above.
     *
     * The card is deliberately not a copy of the tool surface — `exposedTools`
     * is that, and a second copy is the two-sources problem. Permissions are
     * different in kind: they are not a list of tools, they are the POLICY over
     * the classes those tools fall into, and the reader that needs them is
     * von-node's commit gate, which loads `agentCard` and never sees the
     * workspace file. Leaving them out would mean the gate could not answer
     * and would go on refusing every write on a deployed app.
     */
    ...(manifest.permissions ? { permissions: manifest.permissions } : {}),
    ...(manifest.accent ? { accent: manifest.accent } : {}),
    ...(manifest.logo ? { logo: manifest.logo } : {}),
    ...(manifest.envMap ? { envMap: manifest.envMap } : {}),
    ...(manifest.avatarComp ? { avatarComp: manifest.avatarComp } : {}),
  };
}

/**
 * The manifest's tool exceptions as the `ToolDiff` archetype-tools.ts has
 * always accepted — the wiring that closes the freeze.
 *
 * `packages` expand into `local` alongside `add`, because from the resolver's
 * point of view both are "names beyond the base" and it dedupes against the
 * base itself. Unknown and estate package ids contribute NOTHING here and are
 * reported by `manifestIssues` instead, so this projection stays pure the way
 * `exposedToolsFor` does.
 *
 * Remote server tools are NOT here. They are prefixed names that no registry
 * can serve, so folding them into the same list would put entries in
 * `Actor.exposedTools` that `createAgentMcp` can only warn about and drop —
 * `unservable` would report the customer's own working endpoint as broken.
 * `remoteToolNames` gives them separately, for a caller that has resolved them.
 */
export function manifestToolDiff(manifest: AgentManifest | null): ToolDiff | undefined {
  const spec = manifest?.tools;
  if (!spec) return undefined;
  const local = new Set<string>(spec.add ?? []);
  for (const name of expandPackages(spec.packages ?? []).names) local.add(name);
  const disabled = spec.remove ?? [];
  if (!local.size && !disabled.length) return undefined;
  return {
    ...(disabled.length ? { disabled } : {}),
    ...(local.size ? { local: [...local].sort() } : {}),
  };
}

/**
 * The prefixed names a remote server's tools take on this agent's surface.
 *
 * Only computable when the server declares its `tools`; a server that lists
 * them at connect time is resolved at runtime, not here. That asymmetry is why
 * this is a separate function rather than part of the diff — a static file
 * cannot know what a live endpoint will offer.
 */
/**
 * WHAT THIS AGENT IS BRIEFED WITH — the projection for `Actor.agentContext`.
 *
 * The companion to `manifestToolDiff` (which verbs) and the scope (which
 * paths): this is which of those paths the agent is POINTED AT. A map is a
 * permission; this is the instruction that goes with it.
 *
 * Skill NAMES rather than bodies. The bodies live in `assets/skills/*.md`, the
 * agent already holds the tools to read them, and its own scope already
 * decides whether it may — so copying them into a column would duplicate
 * content that can change under it and bypass the map on the way.
 */
export interface AgentBriefing {
  /** `assets/skills/{name}.md`, per route — the manifest's `skills` verbatim. */
  skills?: Partial<Record<SkillRoute | typeof SKILL_ROUTE_ALL, string[]>>;
  /** Workflow slugs this agent may run. */
  flows?: string[];
  /** Workspace-relative files pinned into every turn. */
  context?: string[];
}

export function manifestBriefing(manifest: AgentManifest | null): AgentBriefing | null {
  if (!manifest) return null;
  const briefing: AgentBriefing = {
    ...(manifest.skills ? { skills: manifest.skills } : {}),
    ...(manifest.flows?.length ? { flows: manifest.flows } : {}),
    ...(manifest.context?.length ? { context: manifest.context } : {}),
  };
  return Object.keys(briefing).length > 0 ? briefing : null;
}

/** Where a named skill lives, so a caller need not re-derive the convention. */
export function skillPath(name: string): string {
  return `assets/skills/${name}.md`;
}

/**
 * The skills that apply on a route, from a manifest — `all` first, then the
 * route's own, deduped first-wins.
 *
 * Mirrors `resolveSkillsForRoute`'s ordering deliberately: the two must agree
 * about precedence or an agent's skills would apply in a different order from
 * its workspace's, and "which instruction wins" would depend on where it was
 * declared.
 */
export function briefingSkillsForRoute(
  briefing: AgentBriefing | null,
  route: SkillRoute,
): string[] {
  const skills = briefing?.skills;
  if (!skills) return [];
  const out: string[] = [];
  for (const name of [...(skills[SKILL_ROUTE_ALL] ?? []), ...(skills[route] ?? [])]) {
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

export function remoteToolNames(manifest: AgentManifest | null): string[] {
  const out: string[] = [];
  for (const server of manifest?.servers ?? []) {
    for (const tool of server.tools ?? []) out.push(`${server.id}__${tool}`);
  }
  return out.sort();
}

/**
 * What is wrong with an otherwise-parseable manifest, in the author's terms.
 *
 * Same split as `checkAgentCard`: parsing keeps what it can, and the author
 * hears about the rest at push. Every message names the consequence, because a
 * problem report that does not say what breaks gets read as a style note.
 */
export function checkAgentManifest(manifest: AgentManifest, raw?: unknown): string[] {
  const problems: string[] = [];

  if (isRecord(raw) && raw.archetype !== undefined && !isAgentArchetype(raw.archetype)) {
    problems.push(
      `archetype "${String(raw.archetype)}" is not one of ${AGENT_ARCHETYPES.join(' | ')} — the agent will carry none`,
    );
  }

  if (manifest.delegatesTo?.length && manifest.archetype && manifest.archetype !== 'assistant') {
    problems.push(
      `delegatesTo is set on a "${manifest.archetype}", but only an assistant delegates — ` +
        'the star rule keeps orchestration in one head (SY-PLAN.md §3.2)',
    );
  }

  if (manifest.repos?.length && manifest.archetype && manifest.archetype !== 'engineer') {
    problems.push(`repos is set on a "${manifest.archetype}", but only an engineer is repo-bound`);
  }

  if (manifest.archetype === 'engineer' && !manifest.repos?.length) {
    problems.push(
      'an engineer with no repos can be spawned nowhere — the host refuses every cwd until this names one',
    );
  }

  if (manifest.archetype && !manifest.does) {
    problems.push('no `does` line — an orchestrator picks who to ask by reading this');
  }

  // A misspelt class or authority is DROPPED by the parser, so an author who
  // believes they wrote `"write": "ask"` and did not would have widened the
  // agent silently. Reported against the RAW block, which is the only thing
  // that still remembers what was written.
  if (isRecord(raw)) problems.push(...checkAgentPermissions(raw.permissions));

  // A permission for a class this agent's tools cannot reach is not wrong, but
  // it is a statement about nothing — and on a screen that lists permissions it
  // reads as a capability the agent has. Reported so the file says what is
  // true.
  if (manifest.permissions && manifest.archetype) {
    const reachable = capabilitiesInUse(
      resolveExposedTools(manifestToCard(manifest), null, manifestToolDiff(manifest)),
    );
    for (const cls of Object.keys(manifest.permissions) as Capability[]) {
      if (reachable[cls]?.length === 0) {
        problems.push(
          `\`permissions.${cls}\` is stated but this agent holds no ${cls} tool — ` +
            'the grant reaches nothing',
        );
      }
    }
  }

  if (!manifest.archetype && manifest.tools) {
    problems.push(
      'tool exceptions with no archetype — a diff is applied to an archetype\'s list, and ' +
        'without one the base is empty, so `remove` withholds nothing and `add` is the whole surface',
    );
  }

  // The map, checked with everything else — a scope that matches nothing is
  // the same class of silent narrowing as an unknown package id.
  problems.push(...scopeProblems(manifest));

  for (const id of manifest.tools?.packages ?? []) {
    const pkg = packageById(id);
    if (!pkg) {
      problems.push(`unknown tool package "${id}" — no tools were lent for it`);
    } else if (pkg.estate) {
      problems.push(`package "${id}" is estate tooling and cannot be lent by an agent`);
    }
  }

  // Server rows that parsing dropped. Reported by INDEX because a row with no
  // id has no other name to call it by.
  if (isRecord(raw) && Array.isArray(raw.servers)) {
    raw.servers.forEach((row, i) => {
      if (!parseServer(row)) {
        problems.push(
          `servers[${i}] needs a slug-shaped \`id\` and an absolute http(s) \`url\` — the row was dropped`,
        );
      }
    });
  }

  for (const server of manifest.servers ?? []) {
    if (!server.tokenRef) {
      problems.push(
        `server "${server.id}" names no tokenRef — it will be dialled unauthenticated, which is ` +
          'correct only for a genuinely public endpoint',
      );
    }
    if (!server.tools?.length) {
      problems.push(
        `server "${server.id}" lists no tools — whatever it offers at connect time is taken, so a ` +
          "change on their side changes this agent's surface without a diff here",
      );
    }
  }

  // A credential written into a synced file. The one problem here that is a
  // security finding rather than a capability gap, so it says so.
  if (isRecord(raw) && Array.isArray(raw.servers)) {
    raw.servers.forEach((row, i) => {
      if (isRecord(row) && typeof row.token === 'string' && row.token.trim()) {
        problems.push(
          `servers[${i}] carries an inline \`token\` — this file syncs to R2 and diffs in review, so ` +
            'that credential is published. Use `tokenRef` to name a secret instead.',
        );
      }
    });
  }

  return problems;
}

/**
 * Package-lending and server problems, in the shape `declarationIssues`
 * returns — for a reconcile that reports issues and problems on separate
 * channels.
 */
export function manifestIssues(manifest: AgentManifest | null): string[] {
  if (!manifest) return [];
  const issues: string[] = [];
  for (const id of manifest.tools?.packages ?? []) {
    const pkg = packageById(id);
    if (!pkg) issues.push(`${agentManifestPath(manifest.slug)}: unknown package "${id}".`);
    else if (pkg.estate) {
      issues.push(`${agentManifestPath(manifest.slug)}: package "${id}" is estate tooling.`);
    }
  }
  return issues;
}

// ── THE MAP ─────────────────────────────────────────────────────────────────
//
// One matcher, three consumers: the tool context that refuses a read, the
// context assembler that trims a brief, and the UI that draws a file tree.
// They must never each compute their own answer — a dashboard that hides a
// folder the tools still serve is a curtain, and a tool that refuses a path
// the dashboard shows is a bug report.

/**
 * The roots a scope entry may start with — the organism's own registry.
 *
 * Deriving this rather than listing it is the point the whole manifest turns
 * on: a scope naming a folder the organism does not define is a typo that
 * would otherwise narrow an agent silently, and the registry is already the
 * one place that says which folders exist.
 */
export function workspaceRootNames(): string[] {
  return WORKSPACE_CONFIG.folders.map((f) => f.path);
}

/** A compiled scope. `null` means UNSCOPED — the whole workspace. */
export type AgentScope = string[] | null;

export function agentScope(manifest: AgentManifest | null): AgentScope {
  const scope = manifest?.scope;
  // `"*"` and absent both mean the whole workspace; only a non-empty list
  // narrows anything.
  if (!scope || scope === SCOPE_ALL) return null;
  return scope.length > 0 ? scope : null;
}

/** Did this agent EXPLICITLY claim the whole workspace? Distinct from having
 *  said nothing, which is the difference the reconcile's secondary gate turns
 *  on. */
export function claimsWholeWorkspace(manifest: AgentManifest | null): boolean {
  return manifest?.scope === SCOPE_ALL;
}

/** Has this agent stated a map at all — narrow or explicitly total? */
export function declaresScope(manifest: AgentManifest | null): boolean {
  const scope = manifest?.scope;
  return scope === SCOPE_ALL || (Array.isArray(scope) && scope.length > 0);
}

/**
 * May this agent reach `path`?
 *
 * Three cases, and the third is the one that gets forgotten:
 *   - unscoped        → everything, today's behaviour.
 *   - under an entry  → yes. `assets` admits `assets/imagery/a.png`.
 *   - ANCESTOR of an entry → yes, for LISTING only. An agent scoped to
 *     `admin/accounting` must still be able to see that `admin/` exists, or it
 *     cannot navigate to its own scope and the folder it owns is unreachable
 *     from the root. `scopeAllowsRead` below is the stricter test for content.
 *
 * Segment-wise, never string-prefix: `assets` must not admit `assets-private`,
 * which a `startsWith` would wave through.
 */
export function scopeAllowsPath(scope: AgentScope, path: string): boolean {
  if (!scope) return true;
  const p = normaliseScopePath(path);
  if (!p) return true; // the workspace root itself
  return scope.some((entry) => isUnder(p, entry) || isUnder(entry, p));
}

/**
 * May this agent READ the bytes at `path`?
 *
 * Stricter than `scopeAllowsPath`: being able to see that `admin/` exists on
 * the way to `admin/accounting` is navigation; being able to read
 * `admin/employees/payroll.csv` is the thing the scope exists to refuse. So an
 * ancestor is listable and never readable.
 */
export function scopeAllowsRead(scope: AgentScope, path: string): boolean {
  if (!scope) return true;
  const p = normaliseScopePath(path);
  if (!p) return false;
  return scope.some((entry) => isUnder(p, entry));
}

/** `child` is `parent` or sits beneath it, compared by SEGMENT. */
function isUnder(child: string, parent: string): boolean {
  if (child === parent) return true;
  return child.startsWith(`${parent}/`);
}

function normaliseScopePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

/**
 * Problems with a scope, in the author's terms.
 *
 * Kept separate from `checkAgentManifest` so a caller that only wants the map
 * (the reconcile's report, the config screen) does not have to run every other
 * check to get it.
 */
export function scopeProblems(manifest: AgentManifest | null): string[] {
  const scope = manifest?.scope;
  // `"*"` names no roots, so there is nothing to check and nothing to warn
  // about: an agent claiming everything is by definition not missing `config/`.
  if (!scope || scope === SCOPE_ALL || !scope.length) return [];
  const roots = new Set(workspaceRootNames());
  const problems: string[] = [];
  for (const entry of scope) {
    const root = entry.split('/')[0];
    if (!roots.has(root)) {
      problems.push(
        `scope entry "${entry}" starts at "${root}", which is not a workspace root — ` +
          `it will match nothing. Roots are: ${[...roots].sort().join(', ')}`,
      );
    }
  }
  // The brand lives in `config/`, so an agent scoped away from it renders
  // unbranded and reads as broken rather than as narrow. Said once, as a
  // warning — narrowing to exclude it is legal, and occasionally meant.
  if (!scope.some((e) => e.split('/')[0] === 'config')) {
    problems.push(
      'scope omits `config/`, where the brand, tokens and text styles live — this agent will ' +
        'not be able to read its own brand. Add "config" unless that is deliberate.',
    );
  }
  return problems;
}

/**
 * Apply a card's `each` filters to the rows it read.
 *
 * Lives here rather than in the app so every host answers the same way: a
 * board, an export and a future mobile shell drawing the same manifest must
 * draw the same rows, or "what this agent shows" depends on where you look.
 *
 * Deliberately small — equality, any-of, sort, limit. Anything a real query
 * language would add belongs in a tool the widget calls, not in a manifest
 * field that has to be understood by everything that reads one.
 */
export function selectRows(
  rows: unknown[],
  each: NonNullable<AgentDashboardCard['each']> | undefined,
): Record<string, unknown>[] {
  let out = rows.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object');

  for (const [field, want] of Object.entries(each?.where ?? {})) {
    out = out.filter((row) =>
      Array.isArray(want) ? want.includes(row[field] as never) : row[field] === want,
    );
  }

  const sort = each?.sort;
  if (sort) {
    const desc = sort.startsWith('-');
    const field = desc ? sort.slice(1) : sort;
    out = [...out].sort((a, b) => {
      const x = a[field];
      const y = b[field];
      if (x === y) return 0;
      // Absent sorts LAST either way: a row missing the field it is ordered by
      // is not the smallest, it is unanswered, and burying it under the top of
      // a descending list is how it stops being noticed.
      if (x == null) return 1;
      if (y == null) return -1;
      return (x < y ? -1 : 1) * (desc ? -1 : 1);
    });
  }

  return each?.limit ? out.slice(0, each.limit) : out;
}
