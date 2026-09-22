/**
 * `config/skills.json` — which method docs apply to which AI route.
 *
 * `assets/skills/*.md` holds HOW the brand writes. This file decides where each
 * one lands, and it exists because the alternatives are both wrong:
 *
 *   always-on for the brand — every guide in every prompt. A chat tone note
 *                             would ride along on an ad render, and an ad-copy
 *                             anatomy would shape a customer-service reply.
 *   ranked like knowledge   — a skill must be present whether or not the brief
 *                             mentions it. "How to write a hook" applies to
 *                             every ad, including the ones that never say
 *                             "hook", so prompt similarity is exactly the wrong
 *                             selector.
 *
 * So selection is DECLARED, per route, with `all` for the genuinely brand-wide
 * guides (voice, tone) and a per-flow override for the specific ones (an ad
 * guide on the ad flow, a longform guide on the essay flow).
 *
 * ```json
 * {
 *   "$schema": "skills/v1",
 *   "routes": {
 *     "all":      ["brand-voice"],
 *     "chat":     ["conversation-manners"],
 *     "generate": ["ad-anatomy", "hook-formulas"]
 *   },
 *   "workflows": { "syvon-media": ["ad-anatomy"] }
 * }
 * ```
 */

/**
 * The AI routes a skill can be bound to.
 *
 * `orchestrate` is the delegation turn — an assistant deciding whether this
 * belongs to it, to a maker or to an engineer. It is a route rather than a
 * flavour of `chat` because the selector has to differ: "when to hand work
 * over" must be in the prompt for every turn that could delegate, and it must
 * NOT ride along on an ordinary brand conversation. Binding it here is what
 * turns an orchestrator's judgment into a file you can read, diff and correct
 * (SY-PLAN.md §3.5).
 */
export const SKILL_ROUTES = ['chat', 'narrate', 'generate', 'orchestrate'] as const;
export type SkillRoute = (typeof SKILL_ROUTES)[number];

/** The `all` key — applies to every route. Not a route itself. */
export const SKILL_ROUTE_ALL = 'all';

export interface SkillsConfig {
  $schema?: string;
  /** Route name (or `all`) → skill base names, without the `.md`. */
  routes?: Partial<Record<SkillRoute | typeof SKILL_ROUTE_ALL, string[]>>;
  /** Workflow slug → additional skills, for a guide that suits one flow only. */
  workflows?: Record<string, string[]>;
}

/**
 * The proposals folder. An agent that learns something writes HERE, and nothing
 * routed ever reads from it — promotion out of it is a human act.
 *
 * `assets/skills/_proposed/*.md` is a file an AGENT wrote about how it should
 * behave. Loading one unreviewed is a prompt-injection surface with a very
 * short supply chain: the model edits its own instructions and then follows
 * them. So the folder is a real place with real files that push uploads and
 * git diffs, and the SELECTOR refuses to reach into it.
 */
export const SKILL_PROPOSED_DIR = '_proposed';

function names(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string')
    // Tolerate `ad-anatomy.md` as well as `ad-anatomy`: the config names a FILE
    // in the author's head, and rejecting the extension they can see in the
    // folder is a papercut with no upside.
    .map((x) => x.trim().replace(/\.md$/i, ''))
    .filter(Boolean)
    // A skill name is a FLAT name, never a path. This is what makes
    // `_proposed/` unreachable: the guard is in the one resolver every caller
    // goes through, not in each loader, so there is no second place to forget
    // it. It also refuses `../` traversal for free.
    .filter((x) => !/[\\/]/.test(x));
}

/**
 * Which skills apply to one run.
 *
 * Order is `all` → route → workflow, deduped first-wins. It matters: soul files
 * are rendered into the prompt in array order and earlier context carries more
 * weight, so the brand-wide voice leads and the task-specific guide refines it.
 *
 * An unparseable or absent config yields `[]` — no skills, which is exactly how
 * every brand behaves today. This feature cannot break a brand that has not
 * opted into it.
 */
export function resolveSkillsForRoute(
  config: unknown,
  route: SkillRoute,
  workflowSlug?: string | null,
): string[] {
  if (!config || typeof config !== 'object') return [];
  const c = config as SkillsConfig;
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (list: string[]) => {
    for (const n of list) {
      const key = n.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(n);
    }
  };
  push(names(c.routes?.[SKILL_ROUTE_ALL]));
  push(names(c.routes?.[route]));
  if (workflowSlug) push(names(c.workflows?.[workflowSlug]));
  return out;
}

/**
 * Every skill the config references anywhere — for the eval's two checks:
 * a config naming a file that does not exist, and a file no config names.
 * The second is the quiet one: an authored guide that never reaches a prompt
 * looks identical, in the folder, to one that does.
 */
export function allReferencedSkills(config: unknown): string[] {
  if (!config || typeof config !== 'object') return [];
  const c = config as SkillsConfig;
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (list: string[]) => {
    for (const n of list) {
      const key = n.toLowerCase();
      if (!seen.has(key)) { seen.add(key); out.push(n); }
    }
  };
  push(names(c.routes?.[SKILL_ROUTE_ALL]));
  for (const r of SKILL_ROUTES) push(names(c.routes?.[r]));
  for (const list of Object.values(c.workflows ?? {})) push(names(list));
  return out;
}
