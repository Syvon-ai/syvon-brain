export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

/**
 * Parse hex (#RGB, #RRGGBB, #RRGGBBAA) to [r, g, b] 0-255.
 * Returns null on invalid input.
 */
export function parseHex(hex: string): [number, number, number] | null {
  if (typeof hex !== 'string') return null;

  let raw = hex.startsWith('#') ? hex.slice(1) : hex;
  raw = raw.toLowerCase();

  if (raw.length === 3) {
    // Expand #RGB to RRGGBB
    raw = raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2];
  } else if (raw.length === 8) {
    // #RRGGBBAA - ignore alpha
    raw = raw.slice(0, 6);
  } else if (raw.length !== 6) {
    return null;
  }

  if (!/^[0-9a-f]{6}$/.test(raw)) return null;

  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);

  return [r, g, b];
}

/**
 * Convert hex to HSL. Returns null on invalid hex.
 */
export function hexToHsl(hex: string): HSL | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;

  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    h = ((b - r) / d + 2) / 6;
  } else {
    h = ((r - g) / d + 4) / 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL to hex string (lowercase, 6-digit).
 */
export function hslToHex(hsl: HSL): string {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  if (s === 0) {
    const v = Math.round(l * 255);
    return '#' + componentToHex(v) + componentToHex(v) + componentToHex(v);
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = Math.round(hueToRgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hueToRgb(p, q, h) * 255);
  const b = Math.round(hueToRgb(p, q, h - 1 / 3) * 255);

  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hueToRgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function componentToHex(c: number): string {
  const clamped = Math.max(0, Math.min(255, c));
  const hex = clamped.toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}

/**
 * Darken a hex color by reducing lightness by percent (0-100).
 * Reduces lightness by `percent`% of its current value.
 */
export function darken(hex: string, percent: number): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;

  hsl.l = Math.max(0, hsl.l - (hsl.l * percent / 100));
  return hslToHex(hsl);
}

/**
 * Blend foreground at alpha (0-1) onto background. Returns hex.
 * Pure alpha compositing: result = fg * alpha + bg * (1 - alpha)
 */
export function opacityBlend(fgHex: string, alpha: number, bgHex: string): string {
  const fg = parseHex(fgHex);
  const bg = parseHex(bgHex);
  if (!fg || !bg) return fgHex;

  const r = Math.round(fg[0] * alpha + bg[0] * (1 - alpha));
  const g = Math.round(fg[1] * alpha + bg[1] * (1 - alpha));
  const b = Math.round(fg[2] * alpha + bg[2] * (1 - alpha));

  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

/**
 * Returns true if the color's HSL lightness > 50%.
 */
export function isLight(hex: string): boolean {
  const hsl = hexToHsl(hex);
  if (!hsl) return false;
  return hsl.l > 50;
}

/**
 * A surface just off its background — lighter on a dark ground, darker on a
 * light one, by the same ~9/255 step the default registry uses between
 * `#111111` and `#1A1A1A`. Small on purpose: a surface is a lift, not a
 * contrast. (Same rule as brand-extractor's `liftSurface`, which organism
 * sits below and cannot import.)
 */
export function liftSurface(background: string): string {
  const rgb = parseHex(background);
  if (!rgb) return background;
  const luminance = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
  const step = luminance > 127 ? -9 : 9;
  return '#' + rgb.map((c) => componentToHex(c + step)).join('');
}
