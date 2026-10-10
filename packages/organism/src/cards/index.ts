export type { Card, CardAuthor, CardEvidence, CardKind, CardOutcome, CardPower, CardStatus, CardAct, NoteKind } from './card-types';
export {
  CARD_AT_ATTR,
  CARD_LABEL_ATTR,
  CARD_TARGET_ATTR,
  cardSpot,
  cardTarget,
} from './card-spot';

export {
  CARDS_FILE,
  CARDS_LOG_CAP,
  CARD_KINDS,
  CARD_POWERS,
  CARD_STATUSES,
  CARD_ACTS,
  CARD_OUTCOMES,
  AGENT_WRITABLE_STATUSES,
  CARD_EVIDENCE_CAP,
  CARD_LOG_CAP,
  CARD_SHOTS_DIR,
  CARD_CLAIM_LEASE_MS,
  claimLapsed,
  NOTE_KINDS,
  cardActError,
  cardShotPath,
  cardDrawingPath,
} from './card-types';
export type { CardsContext, CardQuery } from './card-codec';
export {
  cardsPath,
  toCardTarget,
  sameTarget,
  targetWithin,
  parseCardLine,
  parseCardsJsonl,
  effectiveCards,
  sortForQueue,
  filterCards,
  readCards,
  appendCard,
  compactCardsLog,
  newCardId,
} from './card-codec';

/* HOW A SELECTION BECOMES A CARD — the filing rule both apps' bars run. See
   `card-filing.ts`. */
export type {
  FilingAction,
  FilingShape,
  FilingActionChoice,
  FilingSpot,
  FilingDials,
  FilingInput,
  CardFiling,
} from './card-filing';
export {
  FILING_ACTION_LABEL,
  FILING_ACTION_ICON,
  CARD_KIND_ICON,
  filingActionKind,
  deriveFilingAction,
  commonFolder,
  briefFor,
  cardFilingFor,
  feedbackFilingFor,
} from './card-filing';

/* A LEDGER ON STORAGE WITH NO APPEND (R2): conditional writes, so two writers
   never erase each other's line. See conditional-ledger.ts. */
export { conditionalLedger, LedgerConflict, type ConditionalStorage } from './conditional-ledger';
