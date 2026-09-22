/**
 * The stamp that says a person approved this file for the agent to use.
 *
 * WHY IT IS ITS OWN PRIMITIVE, not a boolean on the template entry. The first
 * consumer is templates, and the next is "approve this `.react` / `.dsgn` /
 * `.comp`" — a stamp on any Syvon file. A shape defined per consumer would mean
 * three spellings of "approved" and three readers that disagree about whether a
 * missing field means yes or no.
 *
 * WHERE IT LIVES. Two homes, because the artifact has two owners:
 *
 *   · A file the workspace owns → its `file-meta/v1` sidecar
 *     (`.meta/<filename>.json`), beside the rest of that file's metadata.
 *   · A CATALOG template → an entry in the workspace's own
 *     `templates/index.json`, carrying the catalog ref. The catalog is one
 *     shared, read-only library: a stamp written there would approve the
 *     template for every workspace at once, which is the opposite of approval.
 *
 * WHO MAY WRITE IT. A person. `write_file_meta` already refuses to let an agent
 * write `rating` or `reviewed` — a verdict is the user's, and an agent that can
 * approve its own work has not been approved, it has been asked politely. This
 * field inherits that fence. An agent may PROPOSE (write the candidate, show
 * the card); the stamp is a human act.
 *
 * ABSENT MEANS NOT APPROVED, everywhere, on purpose. The alternative — absent
 * means "fine until someone says otherwise" — makes the first approval a
 * NARROWING, so the feature ships by taking things away from people. Callers
 * that want the old behaviour ask for it explicitly.
 */

/** The stamp. Written by a person, read by every surface that lists files. */
export interface FileApproval {
  /** Who approved it — a user id, or a name when that is all the surface has. */
  by: string;
  /** ISO-8601. */
  at: string;
  /** Why, or what it is approved FOR. Free text, shown to whoever sees the list. */
  note?: string;
  /**
   * Approved for one brand only. Absent = the whole workspace.
   *
   * Carried from the start even though nothing writes it yet: a workspace with
   * two brands will want the poster approved for one of them, and adding the
   * field later means every stamp already written has to be re-interpreted.
   */
  brand?: string;
  /**
   * How the stamp got here — `manual` (a person in the UI), `link` (approved
   * with the flow collection it came in with), `import`. Provenance, so a bulk
   * approval can be told from a considered one and, if needed, undone.
   */
  source?: 'manual' | 'link' | 'import';
}

/** Read a stamp off a parsed sidecar / manifest entry. Null when unapproved. */
export function parseApproval(raw: unknown): FileApproval | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = (raw as { approved?: unknown }).approved ?? raw;
  if (!a || typeof a !== 'object') return null;
  const by = (a as FileApproval).by;
  const at = (a as FileApproval).at;
  // A stamp with no author and no date is not a stamp. Half a record here is
  // worse than none: it reads as approved while naming nobody accountable.
  if (typeof by !== 'string' || !by.trim() || typeof at !== 'string' || !at.trim()) return null;
  const note = (a as FileApproval).note;
  const brand = (a as FileApproval).brand;
  const source = (a as FileApproval).source;
  return {
    by: by.trim(),
    at: at.trim(),
    ...(typeof note === 'string' && note.trim() ? { note: note.trim() } : {}),
    ...(typeof brand === 'string' && brand.trim() ? { brand: brand.trim() } : {}),
    ...(source === 'manual' || source === 'link' || source === 'import' ? { source } : {}),
  };
}

/**
 * Does this stamp cover the brand being worked on?
 *
 * A workspace-wide stamp covers every brand. A brand-scoped one covers only
 * that brand — and covers NOTHING when the caller did not say which brand it
 * is working for, because "approved for the other brand" is exactly the mistake
 * this field exists to prevent.
 */
export function approvalCovers(approval: FileApproval | null, brand?: string | null): boolean {
  if (!approval) return false;
  if (!approval.brand) return true;
  return !!brand && approval.brand === brand;
}

/** The stamp a person's approval writes. `at` defaults to now. */
export function makeApproval(by: string, opts: Omit<Partial<FileApproval>, 'by'> = {}): FileApproval {
  return {
    by,
    at: opts.at ?? new Date().toISOString(),
    ...(opts.note ? { note: opts.note } : {}),
    ...(opts.brand ? { brand: opts.brand } : {}),
    ...(opts.source ? { source: opts.source } : {}),
  };
}

/**
 * The files an approval is about: the ones an agent BUILDS FROM.
 *
 * A `.dsgn`, a `.comp`, a `.react` and a `.gen` are the four a generation can
 * be pointed at, so they are the four a person can vet. Everything else in a
 * workspace — a photograph, a font, a knowledge doc — reaches generation by a
 * different road (the kit, the grounding budget) and would make the stamp mean
 * two different things in one field.
 */
export const APPROVABLE_EXTENSIONS = ['.dsgn', '.comp', '.react', '.gen'] as const;

/** Is this a file a person can approve for agents to build from? */
export function isApprovableFile(path: string | null | undefined): boolean {
  if (!path) return false;
  const lower = path.toLowerCase();
  return APPROVABLE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
