/**
 * THE one fallback resolution for a `.comp` that carries no `resolution` field.
 *
 * Before this existed, four layers each invented their own answer for the same
 * comp and none of them agreed:
 *   render service  1920×1080 (16:9)   services/render/src/services/stageRenderCore.js
 *   deck player     1080×1080 (1:1)    packages/studio-ui/src/player/SeqPlayerCore.tsx
 *   isolate / grid  1080×1920 (9:16)   apps/agent CompIsolate / PreviewGridCard
 *   baked poster    1080×1920 (9:16)   apps/agent lib/server/render posterDims
 * so a resolution-less comp previewed square, thumbnailed portrait, and RENDERED
 * LANDSCAPE — the mp4 didn't match the card it came from.
 *
 * Portrait, because every surface that consumes these renders (feed, deck,
 * stories, reels) is portrait-first; it also matches what the posters and cards
 * already assumed.
 *
 * Import this instead of writing the numbers again. The render service keeps its
 * own last-ditch default for non-agent callers, but the agent now always sends
 * explicit dimensions, so that path is unreachable from here.
 */
export const DEFAULT_COMP_RESOLUTION = { width: 1080, height: 1920 } as const;

/** The comp's declared resolution, or the shared default. Accepts any parsed
 *  `.comp` shape — pure, total, and safe on `undefined`/garbage. */
export function compResolution(content: unknown): { width: number; height: number } {
  const seq = content as { resolution?: { width?: number; height?: number } } | null | undefined;
  const w = seq?.resolution?.width;
  const h = seq?.resolution?.height;
  if (typeof w === 'number' && w > 0 && typeof h === 'number' && h > 0) return { width: w, height: h };
  return { ...DEFAULT_COMP_RESOLUTION };
}
