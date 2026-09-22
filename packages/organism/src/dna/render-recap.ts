/**
 * WHICH RENDERS A WORKSPACE CARD SHOWS — pure selection, no I/O.
 *
 * Every surface that draws a workspace card (studio's directory, agent's and
 * surface's node grids, portal's workspace pages) wants the same four
 * pictures: the newest finished renders in that workspace. They reach the
 * bytes differently — a local checkout, an R2 listing — but the QUESTION is
 * identical, so the answer lives here with the rest of the workspace shape
 * rather than four times over.
 *
 * The rules this encodes:
 *   - a render lives under `projects/{slug}/output/`
 *   - a still (jpg/png/webp/avif) is a tile as it is
 *   - a video is a tile only through its BAKED POSTER (`{file}.poster.jpg`),
 *     because a card shows pictures and an <img> cannot load an mp4
 *   - a poster is the FACE of its video, never a tile of its own — listing
 *     both shows one render twice
 *   - rollover preview clips are hover media, not renders
 */

/** One tile: a workspace-relative path an `<img>` can load, and when it landed. */
export interface RecapTile {
  path: string;
  /** ISO — the newest-first sort key. */
  at: string;
}

/** An object the caller found, however it found it. */
export interface RecapCandidate {
  /** Workspace-relative path, e.g. `projects/saturn/output/reel.mp4`. */
  path: string;
  /** ISO timestamp — R2's LastModified, or the file's mtime. */
  at: string;
}

const STILL_RE = /\.(jpg|jpeg|png|webp|avif)$/i;
const VIDEO_RE = /\.(mp4|webm|mov)$/i;
/** `{file}.poster.webp` and its DNA-versioned twin `{file}.poster.{v}.webp` —
 *  and the `.jpg` spelling, for anything baked before the codec switch. */
const POSTER_RE = /\.poster(?:\.[^./]+)?\.(?:webp|jpg)$/i;
/** The short looping clips a card plays on hover — not finished renders. */
const PREVIEW_CLIP_RE = /\.preview\.(?:[^/.]+\.)?(?:mp4|webm|mov)$/i;
/** `projects/{slug}/…/output/{name}` — where the pipeline collects to. */
const OUTPUT_RE = /^projects\/[^/]+\/(?:.*\/)?output\/[^/]+$/;

/** Is this path inside a project's output folder? */
export function isRenderOutput(path: string): boolean {
  return OUTPUT_RE.test(path);
}

/** The poster paths for a video, by the convention the pipeline bakes, newest
 *  codec first. WebP is what a render bakes now (`POSTER_EXT`); a video rendered
 *  before that switch still has only the JPEG beside it. */
export function posterPathsFor(videoPath: string): string[] {
  return [`${videoPath}.poster.webp`, `${videoPath}.poster.jpg`];
}

/** The poster path a fresh render bakes. `posterPathsFor` is what a READER
 *  wants — this one is only the current convention. */
export function posterPathFor(videoPath: string): string {
  return posterPathsFor(videoPath)[0]!;
}

/**
 * Turn what the caller found into the tiles a card can draw, newest first.
 *
 * `hasPoster` answers whether a video's baked poster exists — the caller
 * knows, because it has the same listing (or the same directory) in hand. A
 * video whose poster was never baked is dropped rather than shown broken:
 * one 404 per card per render is exactly the console noise this avoids.
 */
export function recapTiles(
  candidates: RecapCandidate[],
  hasPoster: (posterPath: string) => boolean,
  limit = 12,
): RecapTile[] {
  const tiles: RecapTile[] = [];
  /** Orphan posters, keyed by the source they picture — see the note below. */
  const bySource = new Map<string, RecapCandidate>();
  for (const c of candidates) {
    if (!isRenderOutput(c.path)) continue;
    if (PREVIEW_CLIP_RE.test(c.path)) continue;

    if (POSTER_RE.test(c.path)) {
      // A poster standing in for a video that IS in this listing is that
      // video's face — the video's own entry produces the tile. A poster
      // whose source is gone (or is a `.comp`, which is not listable media)
      // is still a real picture of a render, so it stands on its own.
      const source = c.path.replace(POSTER_RE, '');
      const sourceIsListed = candidates.some((o) => o.path === source && VIDEO_RE.test(o.path));
      if (sourceIsListed) continue;
      // ONE TILE PER SOURCE. A `.comp` accumulates posters — the unversioned
      // bake and a DNA-versioned twin per brand revision — and all of them
      // are pictures of the SAME design. Showing four tiles that are two
      // renders twice is the failure this catches; the newest wins.
      const seen = bySource.get(source);
      if (seen && seen.at >= c.at) continue;
      bySource.set(source, c);
      continue;
    }

    if (STILL_RE.test(c.path)) {
      tiles.push({ path: c.path, at: c.at });
      continue;
    }

    if (VIDEO_RE.test(c.path)) {
      const poster = posterPathsFor(c.path).find(hasPoster);
      if (poster) tiles.push({ path: poster, at: c.at });
    }
  }
  for (const c of bySource.values()) tiles.push({ path: c.path, at: c.at });
  tiles.sort((a, b) => b.at.localeCompare(a.at));
  return tiles.slice(0, limit);
}
