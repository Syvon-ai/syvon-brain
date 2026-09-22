/**
 * THE COLOUR MODE A FILE ASKS FOR — `colorMode`.
 *
 * A brand's token file can declare modes (`light`, `print`, …); a piece of
 * work picks one. The declaration is `colorMode` in every format, never
 * `mode`, because `mode` is already taken in each of them:
 *
 *   .dsgn   `colorMode="light"` on `<FormatCanvas>` — or on any Frame, Layout,
 *           Group or LayoutItem, for that subtree only. An attribute, not a
 *           header directive: it is scoped exactly like the element it sits on.
 *           (Read by the renderer from the parsed tree; nothing to parse here.)
 *   .react  `"colorMode": "light"` in the `/* @syvon {…} *\/` header — beside
 *           `mode` (interactive | animated) and `modes` (per-mode props).
 *   .comp   `"colorMode": "light"` top-level, and per item — beside `mode`
 *           (the playback container).
 *
 * A blank or malformed value reads as "no opinion": the piece paints in
 * whatever mode encloses it. `default` is NOT that — it is an explicit choice
 * of the base palette, which is how a section inside a light page opts back
 * out of it.
 */

import { COLOR_MODE_NAME_RE, DEFAULT_COLOR_MODE } from './design-tokens/design-tokens-v2-types';

/** A usable mode name (`default` included), or null for absent / blank / malformed. */
export function parseColorMode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  return v === DEFAULT_COLOR_MODE || COLOR_MODE_NAME_RE.test(v) ? v : null;
}

/* ── .comp ──────────────────────────────────────────────────────────────── */

/** `colorMode` from a parsed `.comp` document, or from one of its items. */
export function readCompColorMode(docOrItem: unknown): string | null {
  if (!docOrItem || typeof docOrItem !== 'object' || Array.isArray(docOrItem)) return null;
  return parseColorMode((docOrItem as Record<string, unknown>).colorMode);
}

/** Set (or clear, with `null`) `colorMode` on a parsed `.comp` document or item. */
export function writeCompColorMode<T extends Record<string, unknown>>(docOrItem: T, mode: string | null): T {
  const next: Record<string, unknown> = { ...docOrItem };
  const parsed = parseColorMode(mode);
  if (parsed) next.colorMode = parsed;
  else delete next.colorMode;
  return next as T;
}

/* ── .react ─────────────────────────────────────────────────────────────── */

/** Same header `brand-override.ts` and design-engine's react-meta parse. */
const REACT_HEADER_RE = /\/\*\s*@syvon\s+([\s\S]*?)\s*\*\//;

export function readReactColorMode(source: string | null | undefined): string | null {
  if (!source) return null;
  const m = source.match(REACT_HEADER_RE);
  if (!m) return null;
  try {
    const header = JSON.parse(m[1]) as unknown;
    if (!header || typeof header !== 'object' || Array.isArray(header)) return null;
    return parseColorMode((header as Record<string, unknown>).colorMode);
  } catch {
    return null;
  }
}

/**
 * Set (or clear, with `null`) `colorMode` in a `.react` source's `@syvon` header.
 * A source with no header gets one when a mode is set. A header that is not a
 * JSON object is left as it is — rewriting it would lose whatever it says.
 */
export function writeReactColorMode(source: string, mode: string | null): string {
  const parsed = parseColorMode(mode);
  const m = source.match(REACT_HEADER_RE);
  if (!m) return parsed ? `/* @syvon ${JSON.stringify({ colorMode: parsed })} */\n${source}` : source;
  let header: unknown;
  try {
    header = JSON.parse(m[1]);
  } catch {
    return source;
  }
  if (!header || typeof header !== 'object' || Array.isArray(header)) return source;
  const next: Record<string, unknown> = { ...(header as Record<string, unknown>) };
  if (parsed) next.colorMode = parsed;
  else delete next.colorMode;
  return source.replace(REACT_HEADER_RE, () => `/* @syvon ${JSON.stringify(next)} */`);
}
