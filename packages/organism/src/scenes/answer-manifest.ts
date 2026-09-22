/**
 * A SCENE — the operator's answer to one message, materialized.
 *
 * Not a file format and not a design: a scene is the Direct + Review halves of
 * Bring → Direct → Review made visible. The operator (the agent) is offered a
 * small number of outcome-level options (`options` — "Recreate the motion",
 * never `motion-recreation.tool`), does the work, and appends what it made
 * (`members`). The interface builds itself from this manifest: option cards
 * the person can pick, member cards that appear as the run writes, and the
 * review that lands on them. One scene per answer; the feed shows each as its
 * own stop, in order.
 *
 * `meta/scenes/` beside `meta/cards.jsonl` — a workspace's own metadata root,
 * synced, scaffolded, and read by name by every surface that needs the
 * answer. One JSON file per scene: scenes update in place (an option flips
 * from offered to running to produced), and a per-scene file makes every
 * update a single-file write no other scene can clobber — the same one-object-
 * one-file rule `.meta/project.json` follows.
 */

/** `meta/scenes` — the folder, relative to the workspace root. */
export const SCENES_DIR = 'meta/scenes';

/** Where one scene's manifest lives, relative to the workspace root. */
export function scenePath(sceneId: string): string {
  return `${SCENES_DIR}/${sceneId}.json`;
}

export type SceneOptionState = 'offered' | 'picked' | 'running' | 'produced' | 'declined';

/** One outcome the operator is offering — the answer's unit of choice. */
export interface SceneOption {
  /** Stable kebab id — what a pick names back to the conversation. */
  id: string;
  /** Outcome-level, in the user's language. "Recreate the motion." */
  label: string;
  /** One line on why this is worth picking, when it helps. */
  detail?: string;
  state: SceneOptionState;
  /** The strategist's confidence in this route — shown, not hidden. */
  confidence?: 'high' | 'medium' | 'low';
}

/** A file the answer is about. Paths are workspace-relative, forward slashes. */
export interface SceneMember {
  path: string;
  /** Why this piece is in the answer, when a label helps ("the anchor cut"). */
  note?: string;
}

/**
 * The answer's stage, in the product's own loop — Drop → Direct → Ship, with
 * review living INSIDE Direct (system prompt v2.0): `made` is a Direct round
 * awaiting the person's judgment, not a separate stage they pass through.
 * `shipped` is the loop's exit — the approved work, exported.
 */
export type SceneStatus = 'directing' | 'working' | 'made' | 'shipped';

export interface SceneAnswer {
  $schema: 'answer/v1';
  /** Kebab id; also the file name. */
  id: string;
  /** The conversation this answer belongs to, when there is one. */
  sessionId: string | null;
  /**
   * The PROJECT this answer is about, when it is about one — its slug under
   * `projects/`. The feed places a project-scoped scene INSIDE that project's
   * panel ("in that project"); a scene with no project stands as its own
   * top-level stop. Optional and derived-from-members when omitted (see
   * `sceneProjectOf`): declaring it lets a directing-phase scene — no members
   * on disk yet — sit in its project from the first offer.
   */
  project: string | null;
  /** The answer's headline — what this scene answers ("Three ways in"). */
  title: string;
  status: SceneStatus;
  options: SceneOption[];
  members: SceneMember[];
  config: {
    /** How the view lays its cards out. `grid` is the surface grid. */
    layout: 'grid' | 'flow';
  };
  /** ISO timestamp of the last update — the feed orders by it. */
  updatedAt: string;
}

/**
 * WHICH PROJECT A SCENE BELONGS TO — the declared field when there is one,
 * otherwise derived from the first member that lives under `projects/`.
 * Null means the answer is about the workspace (or about nothing yet), and it
 * stands as its own stop.
 */
export function sceneProjectOf(scene: SceneAnswer): string | null {
  if (scene.project) return scene.project;
  for (const m of scene.members) {
    const parts = m.path.replace(/\\/g, '/').split('/').filter(Boolean);
    if (parts[0] === 'projects' && parts[1]) return parts[1];
  }
  return null;
}

/** Build a minimal, valid scene — the tool's create shape. */
export function buildSceneAnswer(init: {
  id: string;
  title: string;
  sessionId?: string | null;
  project?: string | null;
  options?: SceneOption[];
  members?: SceneMember[];
  status?: SceneStatus;
}): SceneAnswer {
  return {
    $schema: 'answer/v1',
    id: init.id,
    sessionId: init.sessionId ?? null,
    project: init.project ?? null,
    title: init.title,
    status: init.status ?? (init.members?.length ? 'made' : 'directing'),
    options: init.options ?? [],
    members: init.members ?? [],
    config: { layout: 'grid' },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Parse a manifest read from disk. Malformed reads as null — a bad file is
 * one scene dropping out of the feed, never the feed failing.
 */
export function parseSceneAnswer(raw: string): SceneAnswer | null {
  let doc: Partial<SceneAnswer> & { $schema?: unknown };
  try {
    doc = JSON.parse(raw);
  } catch {
    return null;
  }
  if (doc.$schema !== 'answer/v1' || typeof doc.id !== 'string' || !doc.id) return null;
  if (typeof doc.title !== 'string') return null;
  return {
    $schema: 'answer/v1',
    id: doc.id,
    sessionId: typeof doc.sessionId === 'string' ? doc.sessionId : null,
    project: typeof doc.project === 'string' && doc.project.trim() ? doc.project.trim() : null,
    title: doc.title,
    status: isStatus(doc.status) ? doc.status : 'directing',
    options: Array.isArray(doc.options)
      ? doc.options.filter(
          (o): o is SceneOption =>
            !!o && typeof o === 'object' && typeof (o as SceneOption).id === 'string' &&
            typeof (o as SceneOption).label === 'string',
        )
      : [],
    members: Array.isArray(doc.members)
      ? doc.members.filter(
          (m): m is SceneMember => !!m && typeof m === 'object' && typeof (m as SceneMember).path === 'string',
        )
      : [],
    config: { layout: doc.config?.layout === 'flow' ? 'flow' : 'grid' },
    updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : new Date(0).toISOString(),
  };
}

function isStatus(v: unknown): v is SceneStatus {
  return v === 'directing' || v === 'working' || v === 'made' || v === 'shipped';
}

/** The order the feed shows scenes in — newest answer first. */
export function scenesInOrder(scenes: SceneAnswer[]): SceneAnswer[] {
  return [...scenes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
