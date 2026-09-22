import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BRAND_SLUG,
  BRAND_FOLDER_FILES,
  getBrandFolder,
  getBrandConfigFolder,
  getBrandFilePath,
  getBrandAssetsFolder,
  getBrandAssetPath,
  getBrandFolderPaths,
  resolveBrandFileCandidates,
  BRAND_META_DIR,
  BRAND_META_FILES,
  getBrandMetaFolder,
  getBrandMetaFilePath,
  BRAND_WRAPPER_DIR,
  BRAND_WRAPPER_FILES,
  BRAND_WRAPPER_PAGES_DIR,
  getBrandWrapperFolder,
  getBrandWrapperFilePath,
  getBrandWrapperPagesFolder,
  getBrandWrapperPagePath,
  BRAND_WRAPPER_SECTIONS_DIR,
  getBrandWrapperSectionsFolder,
  getBrandWrapperSectionPath,
  BRAND_KIT_PRIMITIVES,
  BRAND_UPLOADS_FOLDER,
  BRAND_ASSET_FOLDERS,
  BRAND_KIT_DEFAULTS,
  getBrandAssetFolder,
  getBrandAssetFilePath,
  BRAND_ASSET_SIDECAR_DIR,
  BRAND_FOLDER_SIDECAR_FILE,
  getBrandAssetSidecarFolder,
  getBrandFolderSidecarPath,
  getBrandFileSidecarPath,
  BRAND_WORLD_FILES,
  getWorldFolder,
  getWorldContextPath,
  getWorldBiblePath,
  getWorldRefPath,
  BRAND_KIT_SUBFOLDERS,
  BRAND_BG_FOLDER,
  BRAND_BG_FOLDER_LEGACY,
  isKitDestination,
} from '../dna/brand-folder-paths';

describe('brand-folder-paths', () => {
  it('DEFAULT_BRAND_SLUG is "default"', () => {
    expect(DEFAULT_BRAND_SLUG).toBe('default');
  });

  it('exposes canonical file names without path prefixes', () => {
    expect(BRAND_FOLDER_FILES.brand).toBe('brand.json');
    expect(BRAND_FOLDER_FILES.designTokens).toBe('design-tokens.json');
    expect(BRAND_FOLDER_FILES.textStyles).toBe('text-styles.json');
    expect(BRAND_FOLDER_FILES.figmaTokens).toBe('figma-tokens.json');
    expect(BRAND_FOLDER_FILES.animation).toBe('animation.json');
    expect(BRAND_FOLDER_FILES.graph).toBe('graph.json');
  });

  it('does NOT claim world.json — the world lives in assets/world/', () => {
    // Reserved here once as a "compiled visual render contract (Phase 2)", and
    // never written. The world turned out to be one artifact in three parts —
    // contract, bible, and the reference images the contract names by bare
    // filename — so it lives in a folder of its own where that resolution
    // works. See getWorldContextPath.
    expect(BRAND_FOLDER_FILES).not.toHaveProperty('world');
  });

  it('getBrandFolder is the workspace ROOT — the slug level is gone', () => {
    expect(getBrandFolder()).toBe('');
  });

  it('IGNORES a slug argument rather than nesting under it', () => {
    // 125 call sites still pass one. If any of them started nesting again, the
    // workspace would grow a second, unread copy of its DNA — silently.
    expect(getBrandFolder('atlas')).toBe('');
    expect(getBrandConfigFolder('atlas')).toBe('config');
    expect(getBrandFilePath('atlas', 'brand')).toBe('config/brand.json');
    expect(getBrandAssetsFolder('atlas')).toBe('assets');
    expect(getBrandAssetPath('atlas', 'logo.svg')).toBe('assets/logo.svg');
  });

  it('getBrandConfigFolder is config/ at the root', () => {
    expect(getBrandConfigFolder()).toBe('config');
  });

  it('getBrandFilePath resolves each config file under config/', () => {
    expect(getBrandFilePath('brand')).toBe('config/brand.json');
    expect(getBrandFilePath('designTokens')).toBe('config/design-tokens.json');
    expect(getBrandFilePath('textStyles')).toBe('config/text-styles.json');
    expect(getBrandFilePath('figmaTokens')).toBe('config/figma-tokens.json');
    expect(getBrandFilePath('animation')).toBe('config/animation.json');
    expect(getBrandFilePath('graph')).toBe('config/graph.json');
  });

  it('getBrandAssetsFolder is the ROOT assets/ — merged with fonts/', () => {
    expect(getBrandAssetsFolder()).toBe('assets');
  });

  it('getBrandAssetPath joins the root assets folder + filename', () => {
    expect(getBrandAssetPath('logo.svg')).toBe('assets/logo.svg');
  });

  it('getBrandFolderPaths returns a full resolver bundle', () => {
    const paths = getBrandFolderPaths();
    expect(paths.root).toBe('');
    expect(paths.config).toBe('config');
    expect(paths.brand).toBe('config/brand.json');
    expect(paths.designTokens).toBe('config/design-tokens.json');
    expect(paths.textStyles).toBe('config/text-styles.json');
    expect(paths.figmaTokens).toBe('config/figma-tokens.json');
    expect(paths.animation).toBe('config/animation.json');
    expect(paths.graph).toBe('config/graph.json');
    expect(paths.world).toBe('assets/world/world.json');
    expect(paths.wrapper).toBe('wrapper');
    expect(paths.site).toBe('wrapper/site.json');
    expect(paths.meta).toBe('meta');
    expect(paths.assets).toBe('assets');
  });
});

describe('assets/world/ — the world', () => {
  it('resolves the folder and both halves of the bible', () => {
    expect(getWorldFolder()).toBe('assets/world');
    expect(getWorldContextPath()).toBe('assets/world/world.json');
    expect(getWorldBiblePath()).toBe('assets/world/world.md');
    expect(BRAND_WORLD_FILES).toEqual({ context: 'world.json', bible: 'world.md' });
  });

  it('IGNORES a slug argument, like every other v11 builder', () => {
    expect(getWorldFolder('atlas')).toBe('assets/world');
    expect(getWorldContextPath('atlas')).toBe('assets/world/world.json');
  });

  it('places a ref beside world.json so refs[].asset resolves', () => {
    // The schema calls refs[].asset "a filename within the same assets/
    // folder" — the contract and the pictures it names have to be siblings.
    expect(getWorldRefPath('diner-ref.png')).toBe('assets/world/diner-ref.png');
  });

  it('reduces a path to its basename — a ref is a NAME, not a location', () => {
    // A caller holding a full workspace path would otherwise mint
    // assets/world/assets/world/x.png, and the bare filename the contract
    // stores would then point at nothing.
    expect(getWorldRefPath('assets/world/jackson.png')).toBe('assets/world/jackson.png');
    expect(getWorldRefPath('projects/film/stills/shot-01.png')).toBe('assets/world/shot-01.png');
  });

  it('world is a kit primitive, so the folder is on-taxonomy', () => {
    expect(BRAND_KIT_PRIMITIVES as readonly string[]).toContain('world');
    expect(getBrandAssetFolder('world')).toBe('assets/world');
    expect(BRAND_KIT_DEFAULTS.world.defaultUse).toBe('reference');
  });
});

describe('brand wrapper/ — brand-site surface', () => {
  it('resolves the wrapper folder', () => {
    expect(BRAND_WRAPPER_DIR).toBe('wrapper');
    expect(getBrandWrapperFolder()).toBe('wrapper');
  });

  it('resolves wrapper files by key', () => {
    expect(BRAND_WRAPPER_FILES.site).toBe('site.json');
    expect(getBrandWrapperFilePath('site')).toBe('wrapper/site.json');
  });

  it('resolves the pages subfolder and page files', () => {
    expect(BRAND_WRAPPER_PAGES_DIR).toBe('pages');
    expect(getBrandWrapperPagesFolder()).toBe('wrapper/pages');
    expect(getBrandWrapperPagePath('home.mdx')).toBe('wrapper/pages/home.mdx');
  });

  it('resolves the sections subfolder and section files', () => {
    expect(BRAND_WRAPPER_SECTIONS_DIR).toBe('sections');
    expect(getBrandWrapperSectionsFolder()).toBe('wrapper/sections');
    expect(getBrandWrapperSectionPath('x.react')).toBe('wrapper/sections/x.react');
  });
});

describe('brand meta/ — prose brain', () => {
  it('resolves the meta folder', () => {
    expect(BRAND_META_DIR).toBe('meta');
    expect(getBrandMetaFolder()).toBe('meta');
  });

  it('exposes the canonical meta filenames (7 from _templateMaster + design, sonic-world, product)', () => {
    expect(BRAND_META_FILES).toEqual({
      voice: 'voice.md',
      strategy: 'strategy.md',
      targetProfile: 'target-profile.md',
      patterns: 'patterns.md',
      reelsStrategy: 'reels-strategy.md',
      status: 'status.md',
      learnings: 'learnings.md',
      design: 'design.md',
      // The audible half of the brand's world, authored by the
      // `syvon-sonic-world` skill. Added to the constant without this list; the
      // assertion is the record of what meta/ canonically holds, so it has to
      // name it too.
      sonicWorld: 'sonic-world.md',
      // What the brand SELLS. The facts were already data (commerce.json, the
      // catalog index, the packshots) and nothing said what a product is, who
      // buys it, or what may be claimed — so an agent writing an ad invented
      // it. Listed here for the same reason sonic-world is: this assertion is
      // the record of what meta/ canonically holds.
      product: 'product.md',
    });
  });

  it('does NOT claim world.md — prose here is human, the bible is authored', () => {
    // Reserved once as a split file (human frontmatter, body compiled by the
    // world-context skill). That skill exists now and authors the whole thing,
    // so the bible sits beside its own contract in assets/world/ rather than
    // among the hand-written prose. A brand carrying a legacy meta/world.md
    // keeps it — the folder is open — it just has no typed accessor.
    expect(BRAND_META_FILES).not.toHaveProperty('world');
  });

  it('resolves each meta file under meta/', () => {
    expect(getBrandMetaFilePath('voice')).toBe('meta/voice.md');
    expect(getBrandMetaFilePath('targetProfile')).toBe('meta/target-profile.md');
    expect(getBrandMetaFilePath('reelsStrategy')).toBe('meta/reels-strategy.md');
    expect(getBrandMetaFilePath('design')).toBe('meta/design.md');
  });
});

describe('brand assets/ — kit primitives + uploads inbox', () => {
  it('a nested kit folder is a destination, the old flat one still resolves', () => {
    expect(isKitDestination('imagery/bg')).toBe(true);
    expect(isKitDestination('imagery')).toBe(true);
    // Not a taxonomy member any more, but nothing rejects the legacy path —
    // resolution is by MEDIA_SLOT_FOLDER_ORDER, which keeps searching it.
    expect(BRAND_BG_FOLDER).toBe('imagery/bg');
    expect(BRAND_BG_FOLDER_LEGACY).toBe('bg');
  });

  it('lists the 14 authored kit primitives in doc order', () => {
    expect(BRAND_KIT_PRIMITIVES).toEqual([
      'logos', 'avatar', 'imagery', 'graphics',
      'video', 'audio', 'music', 'knowledge', 'skills', 'products', 'work',
      'drafts', 'notes', 'world',
    ]);
    expect(BRAND_KIT_PRIMITIVES).toHaveLength(14);
    // `bg` left this list to live INSIDE imagery — see BRAND_KIT_SUBFOLDERS.
    expect(BRAND_KIT_PRIMITIVES as readonly string[]).not.toContain('bg');
    expect(BRAND_KIT_SUBFOLDERS.bg).toBe('imagery/bg');
  });

  it('uploads is the inbox and NOT a kit primitive', () => {
    expect(BRAND_UPLOADS_FOLDER).toBe('uploads');
    expect(BRAND_KIT_PRIMITIVES as readonly string[]).not.toContain('uploads');
  });

  it('BRAND_ASSET_FOLDERS = uploads + react + comfy + the 14 primitives', () => {
    expect(BRAND_ASSET_FOLDERS).toEqual([
      'uploads',
      'react',
      'comfy',
      'logos', 'avatar', 'imagery', 'graphics',
      'video', 'audio', 'music', 'knowledge', 'skills', 'products', 'work',
      'drafts', 'notes', 'world',
    ]);
    expect(BRAND_ASSET_FOLDERS).toHaveLength(17);
  });

  it('resolves kit/inbox folders + files under assets/', () => {
    expect(getBrandAssetFolder('imagery')).toBe('assets/imagery');
    expect(getBrandAssetFolder('uploads')).toBe('assets/uploads');
    expect(getBrandAssetFilePath('imagery', 'hero.jpg')).toBe('assets/imagery/hero.jpg');
    expect(getBrandAssetFilePath('uploads', 'drop.png')).toBe('assets/uploads/drop.png');
  });

  it('path-is-truth: file path segment after assets/ equals its folder', () => {
    for (const folder of BRAND_ASSET_FOLDERS) {
      const p = getBrandAssetFilePath(folder, 'x.bin');
      expect(p).toBe(`assets/${folder}/x.bin`);
      // the segment after assets/ is exactly `folder` — `assets/` is the root
      // now, so that is the SECOND segment rather than one buried under a slug
      expect(p.split('/')[1]).toBe(folder);
    }
  });

  it('BRAND_KIT_DEFAULTS covers all 14 primitives with template role/defaultUse', () => {
    expect(Object.keys(BRAND_KIT_DEFAULTS).sort()).toEqual([...BRAND_KIT_PRIMITIVES].sort());
    expect(BRAND_KIT_DEFAULTS.imagery).toEqual({
      role: 'Hero images — style + subjects',
      defaultUse: 'scene-primary',
    });
    expect(BRAND_KIT_DEFAULTS.logos.defaultUse).toBe('logo');
    expect(BRAND_KIT_DEFAULTS.avatar.defaultUse).toBe('scene-character');
    expect(BRAND_KIT_DEFAULTS.products.defaultUse).toBe('scene');
  });
});

describe('brand .meta/ sidecars', () => {
  it('resolves the sidecar dir + folder/file sidecar paths', () => {
    expect(BRAND_ASSET_SIDECAR_DIR).toBe('.meta');
    expect(BRAND_FOLDER_SIDECAR_FILE).toBe('_folder.json');
    expect(getBrandAssetSidecarFolder('imagery')).toBe('assets/imagery/.meta');
    expect(getBrandFolderSidecarPath('imagery')).toBe('assets/imagery/.meta/_folder.json');
  });

  it('file sidecar keeps the full filename incl. extension', () => {
    expect(getBrandFileSidecarPath('imagery', 'hero.jpg')).toBe(
      'assets/imagery/.meta/hero.jpg.json',
    );
  });
});

describe('resolveBrandFileCandidates', () => {
  // v11 collapsed the active-vs-default fallback: both brands addressed the
  // same folder the moment the slug left the path. It stays a LIST because ~20
  // callers loop over it, but it now has exactly one element — so a miss is a
  // real miss rather than a cue to try the next candidate.
  it('returns the single config/ path regardless of the slugs', () => {
    expect(resolveBrandFileCandidates('atlas', 'default', 'animation'))
      .toEqual(['config/animation.json']);
    expect(resolveBrandFileCandidates('atlas', 'atlas', 'designTokens'))
      .toEqual(['config/design-tokens.json']);
    expect(resolveBrandFileCandidates(null, 'atlas', 'textStyles'))
      .toEqual(['config/text-styles.json']);
    expect(resolveBrandFileCandidates('atlas', null, 'figmaTokens'))
      .toEqual(['config/figma-tokens.json']);
  });

  it('still resolves when no brand slug is known at all', () => {
    // Pre-v11 this returned [] — with no slug there was no folder to name. The
    // path no longer depends on one, so the file is addressable either way.
    expect(resolveBrandFileCandidates(null, null, 'brand')).toEqual(['config/brand.json']);
    expect(resolveBrandFileCandidates(undefined, undefined, 'animation'))
      .toEqual(['config/animation.json']);
  });
});
