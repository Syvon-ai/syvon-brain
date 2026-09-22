/**
 * Mini-MCP declarations — `config/mcp/{server-slug}.json`.
 *
 * An agent's mini-MCP is a DECLARATION, not a folder of code. It says which
 * tools of the shared registry this agent exposes, which outbound endpoints it
 * may reach, and whether its results bind to canvas widgets. Nothing here is
 * executable: the tool bodies live once, in `packages/agent/src/tools/
 * definitions`, and an agent's surface is a filter over them.
 *
 * ── Why a file under config/ and not a `mcp/` workspace root ──────────────────
 * `config/` already carries exactly this kind of per-agent selection —
 * `skills.json` picks which `assets/skills/*.md` apply per route, and
 * `agent-persona.json` is the marker that puts a workspace in scroll's agent
 * honeycomb. A new top-level root is four coordinated edits (WORKSPACE_CONFIG
 * .folders, WORKSPACE_ROOT_PREFIXES + the hand-kept WS_ROOT_RE twin in
 * paths.ts, TEMPLATE_PATH_PREFIXES in design-engine, and SECTION_MODES in
 * studio) plus an Electron literal mirror — and an unregistered root is the
 * `export/` mistake, where `sync:false` meant nothing written ever reached R2.
 * Declarations are data; data belongs in the folder that already holds the
 * agent's other data. A root is what an agent would earn by shipping tool
 * BODIES, which is a trust and execution question we have not answered.
 *
 * ── One writer ────────────────────────────────────────────────────────────────
 * `Actor.exposedTools` (von DB) is the RUNTIME enforcement point for von-node.
 * This file is the AUTHORED intent: it syncs with `ws push`, diffs in review,
 * and a human can read it. They must never both be edited — the file
 * reconciles INTO the column, the same direction `.flow` files reconcile into
 * `Workflow.graph`. If the column is written directly, a workspace and a DB row
 * disagree about what an agent may do and the column wins silently.
 */

// The package map for `packages: [...]` lending — the zero-dep leaf both this
// package and @syvon/agent share (agent already depends on organism, so the map
// cannot live in either of those without a cycle).
import { expandPackages, packageById } from '@syvon/tool-library';

/** Material Symbols name, for the honeycomb tool ball. */
export type McpToolIcon = string;

/**
 * Where a declared tool actually lives.
 *
 * `registry` — an entry in packages/agent/src/tools/definitions. These are the
 *   only ones a mini-MCP can serve, because von-node filters the shared
 *   registry by name and a name that resolves to nothing is not servable.
 *
 * `brain` — a capability the agent genuinely has, implemented somewhere other
 *   than the registry. Sy's `search_agents`, `invite` and `search_knowledge`
 *   are the real case: brain runs them as hand-written OpenAI function schemas
 *   inside /v1/syvon/chat, so the agent DOES do these things — they are simply
 *   not MCP tools.
 *
 * The distinction exists because collapsing it produces one of two lies. Put
 * brain tools in the allowlist and `exposedTools` names three things von-node
 * will never serve; leave them out entirely and the honeycomb under-reports
 * what the agent can do. So they are declared, shown, and excluded from the
 * allowlist — which is exactly what is true.
 */
export type McpToolRuntime = 'registry' | 'brain';

export interface McpToolRef {
  /** Tool name. For `runtime: 'registry'` it must exist in the shared registry. */
  name: string;
  icon?: McpToolIcon;
  /** Overrides the registry description for THIS agent, when its framing differs. */
  label?: string;
  /** Defaults to `registry` — the common case, and the only servable one. */
  runtime?: McpToolRuntime;
}

export interface McpEndpoint {
  id: string;
  url: string;
  /** Defaults to POST only — the narrow verb, opt into more. */
  methods?: ('GET' | 'POST')[];
  description?: string;
}

export interface McpDeclaration {
  /** Server slug. Defaults to the filename stem when absent. */
  slug?: string;
  label?: string;
  description?: string;
  tools?: McpToolRef[];
  /**
   * Tool PACKAGES to lend wholesale — ids from `@syvon/tool-library` (orient,
   * see, reference, create, edit, brand, ship, settings, build, …), expanded to
   * their member names and unioned with `tools`.
   *
   * Lending by package says "this agent is a maker" instead of naming ninety
   * tools, and it cannot drift: the package is maintained in one place with an
   * audit, while a copied name list goes stale the first time a tool is
   * renamed. A declaration using an unknown package id (or the `workspace`
   * estate package, which is never a caller's to lend) is REPORTED — see
   * `declarationIssues` — never silently narrowed.
   */
  packages?: string[];
  /**
   * External endpoints this agent may reach. Advisory HERE — the enforcing
   * allowlist is the deploy-level WORKFLOW_API_ALLOWLIST that `api.get`/
   * `api.post` check in services/brain. Declaring a URL does not grant it.
   */
  endpoints?: McpEndpoint[];
  /** Whether tool results bind to canvas widgets (UI_BY_TOOL) on this surface. */
  canvas?: boolean;
  /**
   * Whether this surface's tools are LENT — servable over the agent's mini-MCP
   * to another agent — or only SHOWN.
   *
   * Defaults true, so every declaration written before this field keeps
   * behaving exactly as it did.
   *
   * The distinction exists because one file was answering two questions with
   * opposite instincts. A honeycomb is a display of what an agent can do, and a
   * maker's is meant to be near-total: syvon's `config/mcp-tools.json` declares
   * 108 tools and that is the honest picture of a maker. `Actor.exposedTools`
   * is a CAPABILITY GRANT to any caller holding the node token, and it was
   * being derived from that same list — so "show everything this agent does"
   * silently read as "lend everything this agent does", including
   * run_terminal_command and delete_file.
   *
   * `runtime: 'brain'` already draws this line per tool: shown, never
   * allowlisted. This is the same line at the server level, for the case where
   * the tool IS a registry entry and the agent genuinely runs it — it simply
   * does not hand it to strangers.
   */
  lend?: boolean;
}

/** A declaration plus the slug it resolved to. */
export interface ResolvedMcpServer extends McpDeclaration {
  slug: string;
  /** Workspace-relative path it was read from — the anchor for any error. */
  source: string;
}

/** The folder holding per-server declarations. */
export const MCP_DECLARATION_DIR = 'config/mcp';

/**
 * The pre-folder single-server file. Still read, still valid: it is what
 * scroll's tool honeycomb has served since it shipped, and the syvon workspace
 * carries a 108-entry one. Treated as the server slug `default`.
 */
export const MCP_LEGACY_FILE = 'config/mcp-tools.json';

export function mcpDeclarationPath(serverSlug: string): string {
  return `${MCP_DECLARATION_DIR}/${serverSlug}.json`;
}

/** Filename stem, minus `.json`. `orchestrate.json` → `orchestrate`. */
export function mcpServerSlugFromFile(filename: string): string {
  return filename.replace(/\.json$/i, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Narrow raw JSON to a declaration, dropping malformed entries rather than
 * throwing. A broken tool row must not blank an agent's whole surface — the
 * honeycomb showing three of four balls is a better failure than showing none,
 * and an exception here would take out the roster for every tenant.
 */
export function parseMcpDeclaration(raw: unknown, source: string, fallbackSlug: string): ResolvedMcpServer | null {
  if (!isRecord(raw)) return null;

  const tools: McpToolRef[] = Array.isArray(raw.tools)
    ? raw.tools
        .map((entry): McpToolRef | null => {
          if (typeof entry === 'string') return { name: entry };
          if (!isRecord(entry) || typeof entry.name !== 'string' || !entry.name) return null;
          // Anything other than the two known runtimes falls back to `registry`
          // — the safe default, because a typo that silently marked a tool
          // `brain` would drop it from the allowlist and von-node would stop
          // serving a tool that works.
          const runtime: McpToolRuntime = entry.runtime === 'brain' ? 'brain' : 'registry';
          return {
            name: entry.name,
            runtime,
            ...(typeof entry.icon === 'string' ? { icon: entry.icon } : {}),
            ...(typeof entry.label === 'string' ? { label: entry.label } : {}),
          };
        })
        .filter((t): t is McpToolRef => t !== null)
    : [];

  const endpoints: McpEndpoint[] = Array.isArray(raw.endpoints)
    ? raw.endpoints
        .map((entry): McpEndpoint | null => {
          if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.url !== 'string') return null;
          const methods = Array.isArray(entry.methods)
            ? entry.methods.filter((m): m is 'GET' | 'POST' => m === 'GET' || m === 'POST')
            : undefined;
          return {
            id: entry.id,
            url: entry.url,
            ...(methods?.length ? { methods } : {}),
            ...(typeof entry.description === 'string' ? { description: entry.description } : {}),
          };
        })
        .filter((e): e is McpEndpoint => e !== null)
    : [];

  const packages: string[] = Array.isArray(raw.packages)
    ? raw.packages.filter((p): p is string => typeof p === 'string' && p.length > 0)
    : [];

  return {
    slug: typeof raw.slug === 'string' && raw.slug ? raw.slug : fallbackSlug,
    ...(typeof raw.label === 'string' ? { label: raw.label } : {}),
    ...(typeof raw.description === 'string' ? { description: raw.description } : {}),
    tools,
    ...(packages.length ? { packages } : {}),
    ...(endpoints.length ? { endpoints } : {}),
    ...(typeof raw.canvas === 'boolean' ? { canvas: raw.canvas } : {}),
    ...(typeof raw.lend === 'boolean' ? { lend: raw.lend } : {}),
    source,
  };
}

/**
 * The tool-name allowlist a workspace's declarations add up to — the value
 * `Actor.exposedTools` should hold for this agent.
 *
 * This is the PURE half of the reconcile, deliberately. The declaration lives
 * here, so the projection lives here; the DB write belongs to whoever owns the
 * von client (services/von-node), so neither side has to import the other.
 *
 * Direction is one-way and load-bearing: the file reconciles INTO the column,
 * never the reverse — the same direction `.flow` files reconcile into
 * `Workflow.graph`. `Actor.exposedTools` is what von-node actually enforces,
 * and it re-reads it per request, so whatever this returns governs the very
 * next call. If anything writes that column by hand, it holds a value with no
 * source to check it against, and the agent is quietly more or less capable
 * than its own repo says.
 *
 * Sorted and de-duplicated so the output is stable: an unchanged workspace must
 * produce a byte-identical allowlist, or every reconcile looks like a change
 * and no diff means anything.
 */
export function exposedToolsFor(servers: ResolvedMcpServer[]): string[] {
  const names = new Set<string>();
  for (const server of servers) {
    // A surface that is shown but not lent contributes nothing to the grant.
    // Checked per server rather than per tool: "this whole surface is for the
    // honeycomb" is the statement being made, and making it once is what keeps
    // it reviewable.
    if (server.lend === false) continue;
    for (const tool of server.tools ?? []) {
      // `brain` tools are real capabilities that are not MCP tools, so they are
      // shown but never allowlisted. Including them would put names in
      // Actor.exposedTools that von-node can only warn about and drop.
      if (tool.runtime === 'brain') continue;
      names.add(tool.name);
    }
    // Packages union in. Estate/unknown ids contribute nothing HERE — they are
    // reported by `declarationIssues` so the projection stays pure.
    for (const name of expandPackages(server.packages ?? []).names) {
      names.add(name);
    }
  }
  return [...names].sort();
}

/**
 * Human-readable problems in a workspace's declarations — the "nothing silently
 * dropped" channel for package lending.
 *
 * An allowlist that cannot be honoured should say so at the point it is read.
 * A package id that resolves to nothing (a rename, a typo) or names the estate
 * (which an owner may lend only from their own operator surface, never from an
 * agent's declaration) would otherwise narrow `Actor.exposedTools` with no
 * error anywhere — the failure surfacing as an agent quietly unable to do a
 * thing its own repo says it does.
 */
export function declarationIssues(servers: ResolvedMcpServer[]): string[] {
  const issues: string[] = [];
  for (const server of servers) {
    for (const id of server.packages ?? []) {
      const pkg = packageById(id);
      if (!pkg) {
        issues.push(`${server.source}: unknown package "${id}" — no tools were lent for it.`);
      } else if (pkg.estate) {
        issues.push(
          `${server.source}: package "${id}" is estate tooling and cannot be lent by an agent declaration.`,
        );
      }
    }
  }
  return issues;
}

/**
 * Does the stored allowlist already match the declarations?
 *
 * Lets a reconcile skip a write rather than touch every Actor row on every
 * run. `null` (never set) is NOT the same as `[]` (deliberately inert) — an
 * agent whose declarations are empty should end up with `[]`, which von-node
 * treats as an inert server, rather than staying null and looking unconfigured.
 */
export function exposedToolsMatch(stored: string[] | null | undefined, next: string[]): boolean {
  if (!stored) return false;
  return stored.length === next.length && stored.every((name, i) => name === next[i]);
}

/**
 * Flatten servers to the honeycomb's tool list, de-duplicated by name.
 *
 * First declaration wins on a collision, so server order decides which icon a
 * shared tool wears. Callers pass servers in a stable order for that reason.
 */
export function flattenMcpTools(servers: ResolvedMcpServer[]): { name: string; icon: string }[] {
  const seen = new Set<string>();
  const out: { name: string; icon: string }[] = [];
  for (const server of servers) {
    // Packages display as their member tools — the honeycomb shows what the
    // GRANT shows, not the shorthand it was written in.
    for (const name of expandPackages(server.packages ?? []).names) {
      if (seen.has(name)) continue;
      seen.add(name);
      out.push({ name, icon: 'extension' });
    }
    for (const tool of server.tools ?? []) {
      if (seen.has(tool.name)) continue;
      seen.add(tool.name);
      out.push({ name: tool.name, icon: tool.icon ?? 'extension' });
    }
  }
  return out;
}
