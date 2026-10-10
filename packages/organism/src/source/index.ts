/* Sources — one Markdown document per comp that says what it is, and the
   tasks a Run on it files. See `source-doc.ts`. */
export type { SourceDoc, SourcePart, SourceHeader, SourceValue } from './source-doc';
export {
  SOURCE_SCHEMA,
  SOURCE_EXT,
  sourcePathFor,
  compPathFor,
  isSourceText,
  parseSource,
  serializeSource,
  partRaw,
  setPart,
  setHead,
  setHeadRows,
  movePart,
  addPart,
  removePart,
  reorderParts,
  newSource,
  partHash,
  partName,
  headerValue,
  withHeaderValue,
  parseHeader,
  writeHeader,
} from './source-doc';
export type { CompPartAddress } from './comp-parts';
export type { DesignWords } from './comp-parts';
export { compPartsOf, isTimeComp, humanStem, partLabel, designWords, resolvePageFile, paramsToHeader, compMeta } from './comp-parts';
export type { SourceRunInput, SourceRunMode } from './source-run';
export { sourceFilingFor, addressFor, partHashes, changedParts, sourceFromComp, rewritePart, rewriteSource, isLegacySource, upgradeLegacy, orderLikeComp, compOrderKey, briefHash, briefHashes, changedBriefs } from './source-run';
export { ADDRESS_KEYS, setCompSlots, permuteCompPages, compOrderFromSource, addCompPage, removeCompPage } from './comp-sync';
export type { ProjectSourceComp, Story, StoryKey } from './project-source';
export {
  PROJECT_SOURCE_SCHEMA,
  PROJECT_SOURCE_FILE,
  projectSourcePathFor,
  isProjectSourceText,
  compOfPart,
  projectCompOf,
  versionOfComp,
  partIndexForComp,
  compsOutsideSource,
  projectSourceFromComps,
  projectPartsOf,
  partsToMake,
  intentFromSuggestion,
  intentFilingFor,
  STORY_KEYS,
  STORY_HINTS,
  storyOf,
  setStory,
  storyGaps,
  storyHash,
  storyRewriteFilingFor,
  linkedFiles,
  healLinks,
} from './project-source';
export type { UpdateStep, UpdatePlan, BriefRecord } from './update-plan';
export { planUpdate, applyPlan, briefKeys, briefRecord } from './update-plan';
export type { PairPaths } from './reconcile';
export { reconcilePair, compFollowingSource, sourceFollowingComp } from './reconcile';
export type { PairIO, PairFile } from './after-write';
export type { PairOpenIO } from './pair-open';
export { settlePair, companionOf, retargetSource, intentAfterMove } from './pair-open';
export { describeTemplateSource, sampleWordsLeft, templateSourcePathFor, withTemplateSource } from './template-source';
export { afterPairWrite, afterPageWrite, afterWrite, pairOf, joinIntent } from './after-write';
export type { DeckWords, WordsAnswer } from './intent-build';
export { wordSlotsOf, wordsPrompt, readWordsAnswer, applyStoryAnswer, applyWords } from './intent-build';
