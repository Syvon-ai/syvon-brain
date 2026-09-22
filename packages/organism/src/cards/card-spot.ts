/**
 * A SPOT — the part of a file an element on screen stands for.
 *
 * `Card.at` addresses a part of a file (`video/shot-2`, `headline`,
 * `lines 12-18`), and until there was a gesture for it the only way to write
 * one was to type the path under the instruction from memory. Every editor
 * already DRAWS those parts, so the address is on screen; it was just not
 * sayable by the thing that knows it.
 *
 * This is the contract, and it is three attributes:
 *
 *   data-card-target   the file, as the host spells paths
 *   data-card-at       the part inside it, as `Card.at` stores it
 *   data-card-label    what to call that part in a dialogue's header
 *
 * The target is usually already on an ancestor, so a row inside an open
 * editor only has to name itself.
 *
 * ── Why it lives here ─────────────────────────────────────────────────────
 * Beside `Card.at`, which is the thing being spelled. The elements that carry
 * these span three packages — the timeline in `studio-ui`, the editors in
 * `studio-editor`, the surfaces in the apps — and `organism` is the one every
 * layer already depends on. The READING side (walking the DOM, the flashcard
 * gesture) is the host's and stays in `@syvon/studio-editor/cards`; this half
 * is only the vocabulary, and imports nothing.
 */

export const CARD_TARGET_ATTR = 'data-card-target';
export const CARD_AT_ATTR = 'data-card-at';
export const CARD_LABEL_ATTR = 'data-card-label';

/** Spread onto the element that DRAWS a part of a file. */
export function cardSpot(at: string, label: string): Record<string, string> {
  return { [CARD_AT_ATTR]: at, [CARD_LABEL_ATTR]: label };
}

/** Spread onto the box that holds one file — an editor, a card, a tab. */
export function cardTarget(path: string): Record<string, string> {
  return { [CARD_TARGET_ATTR]: path };
}
