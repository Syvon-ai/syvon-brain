// @syvon/organism — organism DNA, defaults, and signal collection

// ── DNA types ────────────────────────────────────────────────────────────
export type {
  BrandIdentity,
  Brand,
  Signals,
  Signal,
  TypographyRoles,
  ToneDimension,
  VisualStyle,
} from './dna/dna-types';

export type { DnaContext, DnaPaths } from './dna/dna-context';

// ── DNA I/O ──────────────────────────────────────────────────────────────
export {
  readDnaFile,
  writeDnaFile,
  migrateDnaObjects,
  migrateLegacySolverDir,
  migrateFigmaLink,
  resetDnaForOnboarding,
} from './dna/dna-io';

export { loadDnaContext } from './dna/dna-context';
export { getNestedValue } from './dna/resolve-path';

// ── Design token defaults ────────────────────────────────────────────────
export {
  APP_DEFAULTS,
  DEFAULT_V2_REGISTRY,
  DEFAULT_COLORS,
  DEFAULT_FONTS,
  isRegistryCustom,
} from './dna/design-tokens-defaults';

// ── Defaults ─────────────────────────────────────────────────────────────
export { DEFAULT_BRAND, DEFAULT_BRAND_INSTANCE, DEFAULT_SIGNALS, DEFAULT_FIGMA_TOKENS } from './dna/defaults/brand';
export {
  DEFAULT_ANIM_DEFAULTS,
  DEFAULT_ANIM_PRESETS,
  getDefaultAnimationFileShape,
} from './dna/defaults/animation';
export type { AnimPresetShape, AnimFileShape } from './dna/defaults/animation';

export {
  DEFAULT_BLOCK_STYLES,
  DEFAULT_SPAN_STYLES,
  getDefaultTextStyleFileShape,
  LEVEL_WEIGHT_REF,
} from './dna/defaults/text-styles';
export type {
  BlockLevel,
  BlockStylePreset,
  SpanStylePreset,
  TextStyleFileShape,
} from './dna/defaults/text-styles';

// ── Organism types — see .schema/organism-map-v7.md ─────────────────────
export type {
  BrandRef,
  BrandFolder,
  BrandAssetRef,
  Group,
  ProjectItemKind,
  ProjectItemRef,
  ProjectRef,
  CatalogAddReceipt,
} from './dna/organism-v7-types';

// ── aux-brands/v1 — root brand is the default, brands/ holds the rest ───
export {
  AUX_BRANDS_DIR,
  ROOT_BRAND_NAME,
  isAuxBrandSlug,
  getAuxBrandsFolder,
  getAuxBrandFolder,
  getAuxBrandConfigFolder,
  resolveAuxBrandPath,
  joinAuxBrandRoot,
  classifyBrandsFolders,
  listAuxBrandSlugs,
} from './dna/aux-brands';
export type { BrandsFolderFacts, BrandsFolderVerdict } from './dna/aux-brands';

// ── brand-override/v1 — the brand a single file wears ───────────────────
export {
  parseBrandOverrideRef,
  formatBrandOverrideRef,
  describeBrandOverrideRef,
  sameBrandOverrideRef,
  readDsgnBrandOverride,
  writeDsgnBrandOverride,
  readCompBrandOverride,
  writeCompBrandOverride,
  readReactBrandOverride,
  writeReactBrandOverride,
  readFileBrandOverride,
  writeFileBrandOverride,
  readFileBrandDeclaration,
  resolveLocalBrandOverride,
} from './dna/brand-override';
export type { BrandOverrideRef, LocalBrandResolution } from './dna/brand-override';

// ── brand-declaration-check/v1 — a declared brand must exist ────────────
export {
  checkBrandDeclarations,
  collectBrandEmbedPaths,
  auxBrandTokensPath,
} from './dna/brand-declaration-check';
export type {
  BrandDeclarationIssue,
  BrandDeclarationIssueCode,
  BrandDeclarationSeverity,
  BrandDeclarationIO,
  BrandDeclarationCheckOptions,
} from './dna/brand-declaration-check';

// ── v8.6 Brand-folder path resolvers ────────────────────────────────────
export {
  DEFAULT_BRAND_SLUG,
  BRAND_FOLDER_FILES,
  BRAND_CONFIG_DIR,
  getBrandFolder,
  getBrandConfigFolder,
  getBrandFilePath,
  getBrandConfigPath,
  getBrandAssetsFolder,
  getBrandAssetPath,
  resolveBrandFileCandidates,
  getBrandFolderPaths,
  // wrapper/ — brand-site surface
  BRAND_WRAPPER_DIR,
  BRAND_WRAPPER_FILES,
  BRAND_WRAPPER_PAGES_DIR,
  getBrandWrapperFolder,
  getBrandWrapperFilePath,
  getBrandWrapperPath,
  getBrandWrapperPagesFolder,
  getBrandWrapperPagePath,
  BRAND_WRAPPER_SECTIONS_DIR,
  getBrandWrapperSectionsFolder,
  getBrandWrapperSectionPath,
  // meta/ — prose brain
  BRAND_META_DIR,
  BRAND_META_FILES,
  getBrandMetaFolder,
  getBrandMetaFilePath,
  // assets/ — kit primitives + uploads inbox
  BRAND_KIT_PRIMITIVES,
  BRAND_UPLOADS_FOLDER,
  BRAND_COMPONENTS_FOLDER,
  BRAND_COMFY_FOLDER,
  BRAND_ASSET_FOLDERS,
  BRAND_KIT_DEFAULTS,
  getBrandAssetFolder,
  getBrandAssetFilePath,
  folderForUpload,
  LOGO_FILENAME_STEM_RE,
  brandIdentityKind,
  // .meta/ sidecars
  BRAND_ASSET_SIDECAR_DIR,
  BRAND_FOLDER_SIDECAR_FILE,
  getBrandAssetSidecarFolder,
  getBrandFolderSidecarPath,
  getBrandFileSidecarPath,
} from './dna/brand-folder-paths';

export type {
  BrandFolderFileKey,
  BrandFolderPaths,
  BrandWrapperFileKey,
  BrandMetaFileKey,
  BrandKitPrimitive,
  BrandAssetFolder,
} from './dna/brand-folder-paths';

// ── logo/v1 — variant manifest + slot-resolution rule ───────────────────
export {
  BRAND_LOGO_MANIFEST_FILE,
  BRAND_ROOT_LOGO_BINARIES,
  getBrandLogosFolder,
  getBrandLogoManifestPath,
} from './dna/brand-folder-paths';

// ── assets/world/ — world-context/v1 contract + bible + context library ──
export {
  BRAND_WORLD_FILES,
  getWorldFolder,
  getWorldContextPath,
  getWorldBiblePath,
  getWorldRefPath,
} from './dna/brand-folder-paths';
export {
  BRAND_KIT_SUBFOLDERS,
  BRAND_KIT_SUBFOLDER_DEFAULTS,
  BRAND_BG_FOLDER,
  BRAND_BG_FOLDER_LEGACY,
  isKitDestination,
} from './dna/brand-folder-paths';
export type { BrandKitSubfolder, BrandKitDestination, BrandWorldFileKey } from './dna/brand-folder-paths';
export {
  LOGO_VARIANTS,
  LOGO_TREATMENTS,
  isLogoSlot,
  isLogoFilename,
  classifyLogoSlot,
  resolveLogoFile,
  resolveLogoPath,
  synthesizeLogoManifest,
  parseLogoManifest,
  loadLogoManifest,
  PLACEHOLDER_LOGO_FILL,
  placeholderLogoSvg,
  isPlaceholderLogoSvg,
} from './dna/logo-manifest';
export {
  LOGO_MODE_TREATMENTS,
  logoSlotNamesTreatment,
  logoSlotWithTreatment,
  isModeableLogoSlot,
  logoTreatmentForColorMode,
  slotValuesForLogoTreatment,
  logoModeVariantsFromFiles,
  brandLogoSlotValues,
  type LogoModeTreatment,
  type LogoModeVariants,
} from './dna/logo-color-mode';
export type {
  LogoVariant,
  LogoTreatment,
  LogoOrientation,
  LogoVariantFiles,
  LogoManifest,
  LogoIntent,
  LogoManifestIO,
  EffectiveLogoManifest,
} from './dna/logo-manifest';

// ── Media slot roles — the one classifier (see dna/slot-roles.ts) ────────
export {
  classifyMediaSlot,
  isMediaSlotName,
  kitPathOfAsset,
  kitRoleNameOfPath,
  assetRoleOfPath,
  MEDIA_SLOT_FOLDER_ORDER,
  buildSlotMediaValues,
  hashString,
  SLOT_FOCUS_SUFFIX,
  slotFocusKey,
  SLOT_FIT_SUFFIX,
  slotFitKey,
  focalToObjectPosition,
} from './dna/slot-roles';
export type { MediaSlotRole, SlotMediaPool } from './dna/slot-roles';

// ── Legacy → v8.6 migration (phase 2a) ──────────────────────────────────
export { migrateLegacyBrandToFolder } from './dna/brand-folder-migration';
export type {
  BrandFolderMigrationOpts,
  BrandFolderMigrationReport,
} from './dna/brand-folder-migration';
export { promoteSingletonToDefaultBrand } from './dna/promote-singleton-brand';
export type {
  PromoteSingletonOps,
  PromoteSingletonResult,
} from './dna/promote-singleton-brand';

// ── .gflow moved to `@syvon/syvon-live` (2026-08-16) ────────────────────
//
// The machine is a SCENE concern, not a workspace-shape one. syvon-live
// already owned the sibling half — `LiveFrame.phase` is documented as "the
// blueprint's current node id", i.e. it was designed as the join between a
// running graph and what is on screen — and holding both in one package is
// what lets those two vocabularies converge instead of drifting.
//
// Deliberately NOT re-exported from here. syvon-live may depend on organism
// (its declared boundary); organism re-exporting syvon-live would close that
// into a cycle. Consumers import from `@syvon/syvon-live` directly.

// ── Mini-MCP declarations (config/mcp/{slug}.json) ──────────────────────
export {
  MCP_DECLARATION_DIR,
  MCP_LEGACY_FILE,
  mcpDeclarationPath,
  mcpServerSlugFromFile,
  parseMcpDeclaration,
  flattenMcpTools,
  exposedToolsFor,
  exposedToolsMatch,
  // The VALIDATION half of a declaration, and it ships with the parsing half.
  // `platform-agents`' loader and `workspace-sync`'s reconciler both import it
  // from this barrel; leaving it out of the list — while the function itself
  // stays exported from the module below — costs `services/brain` its startup:
  // ESM resolves named exports at instantiation, so it is not a late failure
  // in some rarely-hit branch but an immediate crash loop on boot.
  // `tsc` catches it (TS2305). Production caught it first, which says where
  // the typecheck is missing, not that the error is subtle.
  declarationIssues,
} from './dna/mcp-declaration';
export type {
  McpDeclaration,
  McpEndpoint,
  McpToolIcon,
  McpToolRef,
  ResolvedMcpServer,
} from './dna/mcp-declaration';

// ── Solver-runtime + DNA path resolvers (absorbed from @syvon/solver) ────
export {
  getSolverName, getSolverDataPaths,
  getDnaPaths, getRelativeDnaPaths,
} from './dna/solver-paths';
export type { SolverDataPaths } from './dna/solver-paths';

// ── Per-brand folder seeder ─────────────────────────────────────────────
export { ensureBrandFolderStructureV7 } from './dna/ensure-brand-folder-v6';
export type { BrandFolderSeedData } from './dna/ensure-brand-folder-v6';

// ── Per-workflow folder seeder (from-scratch counterpart to the catalog copy) ─
export {
  ensureWorkflowFolderStructure,
  DEFAULT_EDITING,
  DEFAULT_AGENT_SYSTEM_MD,
} from './dna/ensure-workflow-folder';
export type {
  WorkflowKind,
  WorkflowFolderSeedData,
  EnsureWorkflowFolderResult,
} from './dna/ensure-workflow-folder';

// ── Project-item kinds + shared font dir — see .schema/organism-map-v7.md ─
export { WORKSPACE_FONTS_DIR, PROJECT_ITEM_KINDS, kindFromFilename } from './dna/defaults/structure-v7';

// ── crawl ingest — real font files + the real logo, shared by every surface ──
export {
  ingestCrawledAssets,
  mergeFontManifest,
  pickLogoImage,
  extOfFileName,
  crawledImageVerdict,
  folderForCrawledImage,
} from './crawl-ingest';
export type {
  WorkspaceAssetIO,
  CrawledBrandAssets,
  FontManifestRow,
  IngestResult,
  ImportedMedia,
  ImageJudge,
} from './crawl-ingest';
export type { ProjectItemKind as ProjectItemKindLiteral } from './dna/defaults/structure-v7';
export { getProjectFolder, getProjectItemPath, getProjectItemKey, toProjectItemObjectKey, getProjectContextPath, getProjectGenerationPath, isInfraFile } from './dna/project-paths';
export {
  POSTS_DIR, POST_MEDIA_STEM, POST_POSTER_FILENAME, POST_DESCRIPTOR_FILENAME,
  getPostFolder, getPostFilePath, getPostKey, postPageFilename, isPostKey,
} from './dna/post-paths';
export { getWorkflowFolder, getWorkflowItemPath, getShopFolder, getShopManifestPath, getShopProductFolder, getShopProductItemPath, getWorkflowEntryGraphPath, getWorkflowSubflowsFolder, getWorkflowSubflowPath } from './dna/workflow-paths';
export {
  WS_SESSIONS,
  // v2 — a session is a workspace root, not a possession of one project.
  getWorkspaceSessionFolder,
  getWorkspaceSessionItemPath,
  getWorkspaceSessionManifestPath,
  getSessionCardsPath,
  // v1 — legacy READ path only. Existing R2 objects are still at these keys.
  getSessionFolder,
  getSessionItemPath,
  getSessionManifestPath,
  getSessionContextPath,
  newSessionId,
  isSessionId,
  getProjectSessionsFolder,
} from './dna/session-paths';
export {
  SESSION_MANIFEST_VERSION,
  parseSessionManifest,
  isSessionManifestV2,
  sessionProjects,
  projectScope,
  scopeProjectSlug,
  sessionRunning,
  withActiveProject,
  withActiveSkill,
  withSessionContext,
  withPinnedPath,
  withoutPinnedPath,
  withHiddenPath,
  withoutHiddenPath,
  withCanvasOrder,
  MAX_SESSION_PINS,
} from './dna/session-manifest';
export type { SessionManifest, SessionOrigin, SessionContext, SessionCanvas } from './dna/session-manifest';
// Where a render/export BELONGS — session = draft, project-root output = export.
export {
  projectSlugFromPath,
  isSessionScopedPath,
  resolveProjectOutputPath,
  resolveRenderOutputPath,
  brandSlugFromThemeRoot,
  brandStampedFilename,
  PREVIEWS_PROJECT_SLUG,
} from './dna/output-paths';
export { DEFAULT_COMP_RESOLUTION, compResolution } from './dna/comp-resolution';
// `/templates` — the REFERENCE library, peer of `/workflows` (SHAPE + WHERE +
// the ref grammar; bytes live in R2). Workflows are process; templates are what
// "like this one" points at, at two scopes (workspace-local, catalog-global).
export {
  TEMPLATES_INDEX_FILE,
  TEMPLATE_MANIFEST_SCHEMA,
  templatesIndexKey,
  templateFolderKey,
  templateFileKey,
  getWorkspaceTemplatesRoot,
  getCatalogTemplatesRoot,
  // The /templates contract proper: roots in resolution order, the ref grammar,
  // and the merge — so no surface hand-rolls workspace-first precedence.
  templateLibraryRoots,
  isCollectionEntry,
  templateRootFor,
  TEMPLATE_SLUG_RE,
  isValidTemplateSlug,
  parseTemplateRef,
  formatTemplateRef,
  parseTemplateManifest,
  emptyTemplateManifest,
  mergeTemplateManifests,
  findTemplateEntry,
  findTemplateMatches,
  packManifestKey,
  templateEntryFiles,
  upsertTemplateEntry,
  templateOpenTool,
  templateTypeOf,
  isTemplateLibraryPath,
} from './dna/template-paths';
export type {
  TemplateEntry, TemplateEntryType, TemplateManifest,
  TemplateScope, TemplateLibraryRoot, TemplateRef, ResolvedTemplateEntry,
} from './dna/template-paths';
export { WIDTH_CLASS_MAP, DEFAULT_FONT_STRETCH } from './dna/defaults/font-stretch';
export type { FontStretchKeyword } from './dna/defaults/font-stretch';

// ── Path utilities ──────────────────────────────────────────────────────
export {
  normalizePath, normalizeRoot, joinPath, dirname, basename, extname,
  isAbsolutePath, normalizeDotSegments, pathStartsWith, relativeFrom,
  toWorkspaceRelPath, pathRelative, resolvePath,
  resolveSeqAssetPath, sanitizeFilePath, formatFileSize,
} from './paths';

// ── Workspace config ────────────────────────────────────────────────────
export {
  WORKSPACE_CONFIG,
  WORKSPACE_TOP_DIRS,
  workspaceFolderLabel,
  WORKSPACE_SYNC_DIRS,
  WORKSPACE_ROOT_DOCS,
  isWorkspaceRootDoc,
  CATALOG_SYNC_DIRS,
  syncDirsFor,
  WORKSPACE_RESERVED_SEGMENTS,
  isReservedSegment,
  resolveWorkspacePath,
  WS_WORK, WS_TEMPLATES, WS_IMPORT, WS_RENDER_TRANSIT,
  WS_SYVON, WS_SYVON_MEMORY, WS_SYVON_SIGNALS,
  DEFAULT_PROJECT_FOLDER,
  // v6 folder constants — see .schema/organism-map.md
  WS_BRANDS, WS_ASSETS, WS_WORKFLOWS,
  // v11 brand-at-root constants. These existed in workspace-config.ts from the
  // day the brand folder collapsed but were never added HERE, so nothing
  // outside organism could import them — which is precisely why callers went
  // on spelling `brands/…` by hand and the allowlists that "compose from
  // organism's named segments" ended up naming only the retired folder.
  WS_CONFIG, WS_META, WS_WRAPPER, WS_KNOWLEDGE,
  // The agent's own interface — `.react` it ships rather than `.react` the repo
  // ships. Exported here for the same reason the v11 constants had to be: an
  // allowlist that "composes from organism's named segments" can only name what
  // it can import, and a root nothing can name is a root agents cannot write to.
  WS_WIDGET, WS_UI,
  // Workspace-authored `.tool` files. Same reason as the constants above: it
  // was defined in workspace-config but never re-exported, so importing it
  // from @syvon/organism threw at module load.
  WS_TOOLS,
  // The semantic source of truth — exported so write policies can name it the
  // day the root is registered, not after the first refused write.
  WS_CONTENT,
  ensureProjectFolder,
  inferTemplateType,
  isWorkspaceRootPath,
  WORKSPACE_ROOT_PREFIXES,
  // v8.5 project-folder + origin vocabulary
  WORKSPACE_LIVE_PREFIXES,
  WORKSPACE_SERVABLE_PREFIXES,
  PROJECT_ITEM_ORIGINS,
  CATALOG_WORKSPACE_ID,
  CATALOG_WORKSPACE_PREFIX,
  CATALOG_WORKSPACE_NAME,
  // v12 file version log — which roots keep history, and the key rule.
  WORKSPACE_VERSIONED_DIRS,
  CATALOG_VERSIONED_DIRS,
  versionedDirsFor,
  isVersionedKey,
} from './workspace-config';
export type { WorkspaceFolderDef, TemplateType, ProjectItemOrigin } from './workspace-config';

// The stamp that says a person approved a file for the agent to use. Templates
// first; any Syvon file next.
export { parseApproval, approvalCovers, makeApproval, isApprovableFile, APPROVABLE_EXTENSIONS } from './approval';
export { approvedEntries, hasApprovals } from './dna/template-paths';
export {
  upsertCatalogApproval,
  removeCatalogApproval,
  approvedCatalogRefs,
} from './dna/catalog-approval';
export type { CatalogApprovalInput } from './dna/catalog-approval';
export type { FileApproval } from './approval';

// The two rules an agent needs before building inside a workspace — shared by
// the workspace's own AGENTS.md and the connector's front door, so they cannot
// drift apart.
export {
  CAPABILITY_SUBSTITUTIONS,
  WORKSPACE_OUTPUT_PATHS,
  workspaceGuardrailsText,
} from './workspace-guardrails';
export type { CapabilitySubstitution, WorkspaceOutputPath } from './workspace-guardrails';

// ── Authored text: the vocabulary `ws push` and the version log share ──
export {
  WORKSPACE_TEXT_EXTENSIONS,
  WORKSPACE_TEXT_HASH_MAX_BYTES,
  isTextFile,
  toWorkspaceRelativeKey,
} from './text-files';

// ── Google Fonts catalog ────────────────────────────────────────────
export {
  isGoogleFont,
  getGoogleFontMetadata,
  searchGoogleFonts,
  getGoogleFontsCatalogSize,
  GOOGLE_FONTS_CATALOG,
} from './google-fonts';
export type { GoogleFont } from './google-fonts';

// ── Font import (download + validate a real typeface) ───────────────────
export {
  isValidFontBuffer,
  fontExtFromBuffer,
  sanitizeFontStem,
  buildFontFileName,
  googleFontsCss2Url,
  parseFontFacesFromCss,
  fetchGoogleFontFaces,
  downloadFontBinary,
} from './font-import';
export type { DiscoveredFontFace } from './font-import';

// ── Wrap link ───────────────────────────────────────────────────────────
export { readWrapLink, writeWrapLink, getWrapLinkPath } from './wrap-link';
export type { WrapLink } from './wrap-link';

// ── Signals ──────────────────────────────────────────────────────────────
export { collectSignal } from './signals/signal-collector';

export {
  SKILL_ROUTES,
  SKILL_ROUTE_ALL,
  SKILL_PROPOSED_DIR,
  resolveSkillsForRoute,
  allReferencedSkills,
  type SkillRoute,
  type SkillsConfig,
} from './dna/skills-config';

export {
  AGENT_CARD_FILE,
  AGENT_ARCHETYPES,
  isAgentArchetype,
  parseAgentCard,
  checkAgentCard,
  mayDelegateTo,
  type AgentArchetype,
  type AgentCard,
} from './dna/agent-card';

export {
  AGENTS_DIR,
  AGENT_MANIFEST_FILE,
  AGENT_SLUG_RE,
  AGENT_ACCESS_LEVELS,
  AGENT_ACCESS_ROLES,
  DEFAULT_AGENT_SLUG,
  agentFolder,
  agentManifestPath,
  isAgentSlug,
  parseAgentManifest,
  checkAgentManifest,
  manifestToCard,
  manifestToolDiff,
  manifestBriefing,
  briefingSkillsForRoute,
  skillPath,
  type AgentBriefing,
  manifestIssues,
  remoteToolNames,
  type AgentAccess,
  type AgentAccessRole,
  type AgentManifest,
  type AgentServer,
  type AgentToolSpec,
  type AgentDashboardCard,
  selectRows,
  type AgentScope,
  agentScope,
  SCOPE_ALL,
  claimsWholeWorkspace,
  declaresScope,
  scopeAllowsPath,
  scopeAllowsRead,
  scopeProblems,
  workspaceRootNames,
} from './dna/agent-manifest';

export {
  ARCHETYPE_TOOLS,
  MAKER_TOOLS,
  ENGINEER_TOOLS,
  ASSISTANT_TOOLS,
  MAKER_SHARED,
  ARCHETYPE_SHARED,
  resolveExposedTools,
  resolveSharedTools,
  exposedToolsSource,
  unknownDiffNames,
  type ToolAudience,
  type ToolDiff,
} from './dna/archetype-tools';

export {
  resolveAudience,
  toolAudienceFor,
  toolsForCaller,
  type Audience,
  type AudienceFacts,
} from './dna/audience';

export {
  charactersToWords,
  wordsToSrtBlocks,
  characterTimingsToSrt,
  type CharacterAlignment,
  type WordTiming,
} from './character-timings-to-srt';

/**
 * FINDING a workspace's mark — the one copy. See `brand-mark-source.ts`: it
 * locates the file, the caller shapes it into a `BrandLogo`.
 */
export {
  resolveBrandMarkSource,
  isRasterMarkFile,
  mimeOfMarkFile,
  BRAND_LOGO_CANDIDATES,
  SYMBOL_LOGO_INTENT,
  type BrandMarkIO,
  type BrandMarkSource,
} from './brand-mark-source';

// ── Design tokens ──
// These live here, not in @syvon/schema-engine, because organism's own DNA layer
// (dna-io, design-tokens-defaults, defaults/design-tokens) needs them. Holding them
// in schema-engine meant organism imported schema-engine while schema-engine imported
// organism — a dependency cycle that pnpm turns into an endlessly nested symlink path
// (organism/node_modules/@syvon/schema-engine/node_modules/@syvon/organism/…), which
// crashed `next build`'s file tracer on Windows. schema-engine re-exports all of this,
// so existing `@syvon/schema-engine` imports are unaffected.
export type {
  DesignTokenColors,
  DesignTokenFonts,
  DesignTokenType,
  DesignTokenSpacing,
  DesignTokenRadius,
  DesignTokenAnimation,
  DesignTokens,
} from './dna/design-tokens/design-tokens-types';
export {
  isV2,
  isModeValue,
  DEFAULT_COLOR_MODE,
  COLOR_MODE_NAME_RE,
  type TokenValue,
  type VariableType,
  type RegistryVariable,
  type CycleStop,
  type CycleMode,
  type CycleSpec,
  type ModeValue,
  type ModeMeta,
  type DesignTokensV2,
} from './dna/design-tokens/design-tokens-v2-types';
export { migrateV1ToV2 } from './dna/design-tokens/design-tokens-migration';
export {
  mergeTokenChanges,
  inferVariableType,
  parseTokenChangeKey,
  diffTokenRegistries,
  isModeMeta,
  isTokenChange,
  type TokenChange,
} from './dna/design-tokens/design-tokens-merge';
// Colour modes — resolving a registry for one mode, and seeding one.
export {
  resolveRegistryForMode,
  resolveVariableForMode,
  listModes,
  hasColorModes,
  MAX_MODE_REF_DEPTH,
  type ModeResolveWarning,
  type ResolveModeOptions,
} from './dna/design-tokens/design-tokens-modes';
export {
  deriveModeFromPalette,
  removeColorMode,
  renameColorMode,
  type DeriveModeOptions,
  type DeriveModeStrategy,
} from './dna/design-tokens/design-tokens-derive-mode';
export {
  parseColorMode,
  readCompColorMode,
  writeCompColorMode,
  readReactColorMode,
  writeReactColorMode,
} from './dna/color-mode-declaration';
export {
  findColorModeDeclarations,
  checkColorModeDeclarations,
  type ColorModeDeclarationSite,
  type ColorModeIssue,
  type ColorModeIssueCode,
} from './dna/color-mode-check';
/**
 * THE THIRD AXIS — what an agent may do without being asked. Beside `tools`
 * (which verbs) and `scope` (which paths). Read by von-node's commit gate, by
 * `ws push`, and by the screen that lists an agent's permissions.
 */
export {
  CAPABILITY_CLASSES,
  CAPABILITY_LABELS,
  AUTHORITIES,
  AUTHORITY_LABELS,
  DEFAULT_PERMISSIONS,
  NO_ARCHETYPE_PERMISSIONS,
  classifyTool,
  isCapability,
  parseAgentPermissions,
  checkAgentPermissions,
  resolvePermissions,
  authorityForTool,
  authorityForGatedTool,
  capabilitiesInUse,
  type Capability,
  type Authority,
  type AgentPermissions,
  type ResolvedPermissions,
} from './dna/agent-permissions';
export {
  parseHex,
  hexToHsl,
  hslToHex,
  darken,
  opacityBlend,
  isLight,
  liftSurface,
  type HSL,
} from './dna/design-tokens/design-tokens-color-math';

// The workspace-card render recap — which of a workspace's renders its card
// shows, and in what order. Pure selection, shared by every surface that
// draws a workspace card. See `dna/render-recap.ts`.
export {
  recapTiles,
  isRenderOutput,
  posterPathFor,
  posterPathsFor,
  type RecapTile,
  type RecapCandidate,
} from './dna/render-recap';

// RATING CARDS — a person's instruction attached to an object, with an urgency
// and a queue. `meta/cards.jsonl`, append-only, latest line per id wins.
// Here rather than in `@syvon/agent` because the log is a fact about the shape
// of a workspace, and because both the node-side tools and Studio's renderer
// need to read it. See `cards/card-types.ts`.
export type {
  Card,
  CardKind,
  CardStatus,
  CardAct,
  CardsContext,
  CardQuery,
  // What was on screen when the card was written, and whose hand wrote it.
  CardEvidence,
  CardAuthor,
  CardOutcome,
  CardPower,
} from './cards/index';
export {
  CARDS_FILE,
  CARDS_LOG_CAP,
  CARD_KINDS,
  CARD_POWERS,
  CARD_STATUSES,
  AGENT_WRITABLE_STATUSES,
  cardsPath,
  // Which act a card is, and the one place both invariants are enforced.
  CARD_ACTS,
  CARD_OUTCOMES,
  cardActError,
  // The evidence block — its cap, and where a card's picture lives.
  CARD_EVIDENCE_CAP,
  CARD_SHOTS_DIR,
  cardShotPath,
  cardDrawingPath,
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
  // The DOM vocabulary for `Card.at` - see `cards/card-spot.ts`.
  CARD_AT_ATTR,
  CARD_LABEL_ATTR,
  CARD_TARGET_ATTR,
  cardSpot,
  cardTarget,
} from './cards/index';

// ── REVISIONS ───────────────────────────────────────────────────────────────
//
// Which files a card produced, and which change of that file it is. The JOIN
// the card log and the file sidecar each half-answer: a card names no file, a
// file names no card, and neither carries an ordinal. `meta/revisions.jsonl`,
// append-only and NON-collapsing — a card has a state, a revision is an event.
// See `revisions/revision-types.ts`.
export type { Revision, RevisionDraft, RevisionOp, RevisionsContext } from './revisions/index';
export {
  REVISIONS_FILE,
  REVISIONS_LOG_CAP,
  REVISIONS_PROSE_KEEP,
  REVISION_OPS,
  revisionsPath,
  parseRevisionLine,
  parseRevisionsJsonl,
  revisionsForCard,
  revisionsForPath,
  revisionsWithin,
  latestVersion,
  indexRevisions,
  readRevisions,
  appendRevision,
  compactRevisionsLog,
  newRevisionId,
} from './revisions/index';

//
// SCENES — the operator's answer to one message, materialized. The Direct +
// Review halves of Bring → Direct → Review: outcome options the person picks,
// the files the run produced, and the state between. One JSON per answer in
// `meta/scenes/`. See `scenes/answer-manifest.ts`.
export type {
  SceneAnswer,
  SceneMember,
  SceneOption,
  SceneOptionState,
  SceneStatus,
} from './scenes/answer-manifest';
export {
  SCENES_DIR,
  scenePath,
  sceneProjectOf,
  buildSceneAnswer,
  parseSceneAnswer,
  scenesInOrder,
} from './scenes/answer-manifest';

// Portable intent, scope, outcome and Dream receipt contracts.
export * from './work/contracts';
