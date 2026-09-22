/**
 * color-mode-check/v1 — does the colour mode a file ASKS FOR exist in its brand?
 *
 * Every lane degrades on an unknown mode, by design: `resolveRegistryForMode`
 * with a name the registry has never seen paints the base palette. Right at
 * render time, wrong at authoring time — `colorMode="ligth"` ships a dark page
 * that was meant to be light, and nothing ever says so. This is the authoring
 * answer, pure, so `validate` and `write_file` reach the same verdict.
 *
 *   `default`                                  always valid (the base palette)
 *   a name the registry declares or uses       valid (`listModes`)
 *   a well-formed name the registry lacks      `color_mode_unknown`
 *   a value that is not a mode name at all     `color_mode_malformed`
 *
 * Where a file declares one (see `color-mode-declaration.ts`):
 *
 *   .dsgn   `colorMode="…"` on any element (FormatCanvas, Frame, Layout, Group,
 *           LayoutItem). A JSX expression that is not a string literal is
 *           dynamic and skipped.
 *   .react  `"colorMode"` in the `/* @syvon {…} *\/` header.
 *   .comp   top-level; `items[i]` and their `inlineShot`; `tracks[t].items[i]`;
 *           `nodes[id]` (screen) and a sequence node's `tracks[t].items[i]`.
 */

import { COLOR_MODE_NAME_RE, DEFAULT_COLOR_MODE, type DesignTokensV2 } from './design-tokens/design-tokens-v2-types';
import { listModes } from './design-tokens/design-tokens-modes';

export interface ColorModeDeclarationSite {
  /** The value as written (trimmed). */
  raw: string;
  /** Human location: `<Frame> line 12`, `items[2]`, `header`. */
  where: string;
}

export type ColorModeIssueCode = 'color_mode_unknown' | 'color_mode_malformed';

export interface ColorModeIssue {
  code: ColorModeIssueCode;
  raw: string;
  where: string;
  message: string;
}

const REACT_HEADER_RE = /\/\*\s*@syvon\s+([\s\S]*?)\s*\*\//;
const DSGN_ATTR_RE = /\bcolorMode\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)'|`([^`$]*)`)\s*\})/g;

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Every `colorMode` a file declares, as written. Unparseable files declare nothing. */
export function findColorModeDeclarations(path: string, content: string | null | undefined): ColorModeDeclarationSite[] {
  if (!content) return [];
  const ext = path.split('.').pop()?.toLowerCase();

  if (ext === 'dsgn' || ext === 'design') {
    const out: ColorModeDeclarationSite[] = [];
    for (const m of content.matchAll(DSGN_ATTR_RE)) {
      const raw = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? '').trim();
      const at = m.index ?? 0;
      const line = content.slice(0, at).split('\n').length;
      const open = content.lastIndexOf('<', at);
      const tag = open >= 0 ? content.slice(open).match(/^<([A-Za-z][\w.]*)/)?.[1] : undefined;
      out.push({ raw, where: `${tag ? `<${tag}> ` : ''}line ${line}` });
    }
    return out;
  }

  const fromValue = (v: unknown, where: string, out: ColorModeDeclarationSite[]) => {
    if (v === undefined || v === null) return;
    out.push({ raw: typeof v === 'string' ? v.trim() : JSON.stringify(v), where });
  };

  if (ext === 'react' || ext === 'component') {
    const m = content.match(REACT_HEADER_RE);
    if (!m) return [];
    try {
      const header = JSON.parse(m[1]) as unknown;
      const out: ColorModeDeclarationSite[] = [];
      if (isRecord(header)) fromValue(header.colorMode, 'header', out);
      return out;
    } catch {
      return [];
    }
  }

  if (ext === 'comp' || ext === 'seq') {
    let doc: unknown;
    try {
      doc = JSON.parse(content);
    } catch {
      return [];
    }
    if (!isRecord(doc)) return [];
    const out: ColorModeDeclarationSite[] = [];
    const items = (list: unknown, prefix: string) => {
      if (!Array.isArray(list)) return;
      list.forEach((item, i) => {
        if (!isRecord(item)) return;
        fromValue(item.colorMode, `${prefix}[${i}]`, out);
        if (isRecord(item.inlineShot)) fromValue(item.inlineShot.colorMode, `${prefix}[${i}].inlineShot`, out);
      });
    };
    const tracks = (list: unknown, prefix: string) => {
      if (!Array.isArray(list)) return;
      list.forEach((track, t) => {
        if (isRecord(track)) items(track.items, `${prefix}[${t}].items`);
      });
    };
    fromValue(doc.colorMode, 'colorMode', out);
    items(doc.items, 'items');
    tracks(doc.tracks, 'tracks');
    if (isRecord(doc.nodes)) {
      for (const [id, node] of Object.entries(doc.nodes)) {
        if (!isRecord(node)) continue;
        fromValue(node.colorMode, `nodes.${id}`, out);
        tracks(node.tracks, `nodes.${id}.tracks`);
      }
    }
    return out;
  }

  return [];
}

/**
 * Check a file's `colorMode` declarations against the registry it wears.
 * `tokens` null/undefined → only malformed values are reported (the known set
 * cannot be decided).
 */
export function checkColorModeDeclarations(
  path: string,
  content: string | null | undefined,
  tokens: DesignTokensV2 | null | undefined,
): ColorModeIssue[] {
  const sites = findColorModeDeclarations(path, content);
  if (sites.length === 0) return [];
  const known = tokens?.variables ? listModes(tokens) : null;
  const available = known && known.length > 0 ? `\`${[DEFAULT_COLOR_MODE, ...known].join('`, `')}\`` : null;
  const issues: ColorModeIssue[] = [];

  for (const { raw, where } of sites) {
    if (raw === DEFAULT_COLOR_MODE) continue;
    if (!COLOR_MODE_NAME_RE.test(raw)) {
      issues.push({
        code: 'color_mode_malformed',
        raw,
        where,
        message:
          `colorMode "${raw}" (${where}) is not a mode name — it reads as "no opinion" and paints in the ` +
          `enclosing mode. Use a lowercase name like \`light\`${available ? ` (this brand has ${available})` : ''}, or remove it.`,
      });
      continue;
    }
    if (known && !known.includes(raw)) {
      issues.push({
        code: 'color_mode_unknown',
        raw,
        where,
        message:
          `colorMode "${raw}" (${where}) is not a mode of this brand, so it paints the base palette. ` +
          (available
            ? `This brand has ${available}.`
            : `This brand declares no colour modes — add one to design-tokens.json \`modes\` first, or remove the attribute.`),
      });
    }
  }
  return issues;
}
