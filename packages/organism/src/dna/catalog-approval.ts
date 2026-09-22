/**
 * Approving a CATALOG template, which cannot be stamped where it lives.
 *
 * A workspace file carries its own approval in its `.meta/` sidecar. A catalog
 * template has no such home: the catalog is ONE shared, read-only library, so a
 * stamp written beside it would approve that template for every workspace at
 * once — the opposite of approval. The record therefore belongs to the
 * workspace, as an entry in its own `templates/index.json` that names the
 * catalog ref it approves.
 *
 * Pure on purpose: manifest in, manifest out. The R2 read/write is the caller's
 * (the link path, a route, a script), and keeping the merge rules here means
 * the link path and a person clicking approve cannot disagree about what an
 * approved catalog entry looks like.
 */
import type { FileApproval } from '../approval';
import type { TemplateEntry, TemplateManifest } from './template-paths';

/** What the workspace records when it approves a catalog template. */
export interface CatalogApprovalInput {
  /** `catalog/templates/<collection>/<slug>` — what is being approved. */
  catalogRef: string;
  /** The stamp. */
  approval: FileApproval;
  /** Copied from the catalog entry so a listing can render without the catalog. */
  entry?: Partial<Pick<TemplateEntry, 'slug' | 'title' | 'type' | 'open' | 'path' | 'teaches' | 'files'>>;
}

const slugFromRef = (ref: string): string => ref.replace(/\/+$/, '').split('/').pop() ?? ref;

/**
 * Add or refresh the approval of a catalog template in a workspace manifest.
 *
 * Matches on `catalogRef`, never on slug: a workspace may curate its own
 * `poster-quote` AND approve the catalog's, and collapsing those two would
 * silently retarget the workspace's own entry at the platform file.
 */
export function upsertCatalogApproval(
  manifest: TemplateManifest,
  input: CatalogApprovalInput,
): TemplateManifest {
  const existing = manifest.examples.find((e) => e.catalogRef === input.catalogRef);
  if (existing) {
    return {
      ...manifest,
      examples: manifest.examples.map((e) =>
        e.catalogRef === input.catalogRef ? { ...e, ...input.entry, approved: input.approval } : e,
      ),
    };
  }
  const slug = input.entry?.slug ?? slugFromRef(input.catalogRef);
  const entry: TemplateEntry = {
    slug,
    title: input.entry?.title ?? slug,
    type: input.entry?.type ?? 'design',
    open: input.entry?.open ?? 'read_design',
    // `path` points into the catalog: the approval is a pointer, not a copy.
    path: input.entry?.path ?? input.catalogRef,
    ...(input.entry?.teaches ? { teaches: input.entry.teaches } : {}),
    ...(input.entry?.files ? { files: input.entry.files } : {}),
    catalogRef: input.catalogRef,
    approved: input.approval,
  };
  return { ...manifest, examples: [...manifest.examples, entry] };
}

/**
 * Withdraw it. The ENTRY goes with the stamp when the entry exists only to
 * carry it — a pointer at a catalog file with no approval left says nothing,
 * and leaving it behind would grow a manifest of things nobody approved.
 */
export function removeCatalogApproval(manifest: TemplateManifest, catalogRef: string): TemplateManifest {
  return {
    ...manifest,
    examples: manifest.examples.flatMap((e) => {
      if (e.catalogRef !== catalogRef) return [e];
      const { approved: _dropped, ...rest } = e;
      // An entry a person also customised (a title, a teaching note) is kept
      // without its stamp; a bare pointer is removed entirely.
      const customised = !!(rest.teaches || (rest.files && rest.files.length));
      return customised ? [rest] : [];
    }),
  };
}

/** The catalog refs this workspace has approved. */
export function approvedCatalogRefs(manifest: TemplateManifest): string[] {
  return manifest.examples.filter((e) => e.catalogRef && e.approved).map((e) => e.catalogRef!);
}
