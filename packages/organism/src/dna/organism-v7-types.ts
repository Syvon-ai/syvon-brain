/**
 * Organism v7 types — aligns with `.schema/organism-map-v7.md`.
 *
 * v7 paradigm:
 *   - Projects own ALL their content (designs, comps, assets) in a flat folder
 *   - No TemplateCollection / AssetCollection / Asset separation
 *   - ProjectItem is the universal content unit
 *   - Brands remain workspace-scoped (unchanged from v6)
 */

import type { Brand } from './dna-types';

// ---------------------------------------------------------------------------
//  Brand (unchanged from v6)
// ---------------------------------------------------------------------------

export interface BrandRef {
  id: string;
  slug: string;
}

export interface BrandFolder {
  id: string;
  slug: string;
  name: string;
  brand: Brand;
  catalogBrandId?: string | null;
  assets: BrandAssetRef[];
}

export interface BrandAssetRef {
  id: string;
  name: string;
  kind: 'logo' | 'wordmark' | 'mark' | 'other';
  mimeType: string;
  r2Key: string;
  size: number;
}

// ---------------------------------------------------------------------------
//  Project (v7 — flat item list)
// ---------------------------------------------------------------------------

export type ProjectItemKind = 'dsgn' | 'comp' | 'react' | 'image' | 'video' | 'font' | 'other';

export interface ProjectItemRef {
  id: string;
  name: string;
  kind: ProjectItemKind;
  r2Key: string;
  mimeType?: string | null;
  size?: number | null;
  metadata?: Record<string, unknown> | null;
  folder?: string | null;
  order: number;
  active: boolean;
}

export interface ProjectRef {
  id: string;
  slug: string;
  name: string;
  icon?: string | null;
  brandId?: string | null;
  aspect?: string | null;
  typography?: string | null;
  format?: string | null;
  motion?: string | null;
}

// ---------------------------------------------------------------------------
//  Group<T> — unchanged from v6
// ---------------------------------------------------------------------------

export interface Group<T> {
  members: T[];
  total: number;
}

// ---------------------------------------------------------------------------
//  Catalog primitives — for the add-from-catalog flow
// ---------------------------------------------------------------------------

export type CatalogAddReceipt =
  | { kind: 'brand'; localBrandId: string; catalogBrandId: string }
  | { kind: 'item'; localItemId: string; projectId: string };
