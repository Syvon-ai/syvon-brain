import catalog from './data/google-fonts-catalog.json';

export interface GoogleFont {
  family: string;
  category: string;
  variants: string[];
}

const CATALOG: GoogleFont[] = catalog as GoogleFont[];

/** Case-insensitive index for O(1) lookups. */
const INDEX = new Map<string, GoogleFont>(
  CATALOG.map((f) => [f.family.toLowerCase(), f]),
);

export function isGoogleFont(family: string): boolean {
  return INDEX.has(family.toLowerCase().trim());
}

export function getGoogleFontMetadata(family: string): GoogleFont | undefined {
  return INDEX.get(family.toLowerCase().trim());
}

export function searchGoogleFonts(
  query: string,
  opts?: { category?: string; limit?: number },
): GoogleFont[] {
  const q = query.toLowerCase().trim();
  const limit = opts?.limit ?? 20;
  return CATALOG.filter((f) => {
    if (opts?.category && f.category !== opts.category) return false;
    return !q || f.family.toLowerCase().includes(q);
  }).slice(0, limit);
}

export function getGoogleFontsCatalogSize(): number {
  return CATALOG.length;
}

export { CATALOG as GOOGLE_FONTS_CATALOG };
