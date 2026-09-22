import { describe, it, expect } from 'vitest';
import { migrateLegacyBrandToFolder } from '../dna/brand-folder-migration';

type Store = {
  files: Record<string, string>;
  dirs: Set<string>;
  listings: Record<string, Array<{ name: string; kind: 'file' | 'directory' }>>;
};

/**
 * Build a callback bundle that mutates the given in-memory Store.
 * `rename` moves the file key; missing source throws ENOENT.
 */
function makeOpts(store: Store) {
  return {
    readFile: async (path: string) => {
      if (!(path in store.files)) throw new Error('ENOENT');
      return store.files[path];
    },
    createFolder: async (path: string) => {
      store.dirs.add(path);
    },
    listDir: async (path: string) => {
      const entries = store.listings[path];
      if (!entries) throw new Error('ENOENT');
      return entries;
    },
    rename: async (from: string, to: string) => {
      if (!(from in store.files)) throw new Error('ENOENT');
      store.files[to] = store.files[from];
      delete store.files[from];
    },
  };
}

describe('migrateLegacyBrandToFolder', () => {
  it('promotes legacy singleton + sidecars + library/brand binaries', async () => {
    const store: Store = {
      files: {
        '.Syvon/Core/brand.json': '{"voice":{"tone":"bold"}}',
        '.Syvon/Core/design-tokens.json': '{"variables":{}}',
        '.Syvon/Core/text-styles.json': '{"blocks":[]}',
        '.Syvon/Core/figma-tokens.json': '{"collections":{}}',
        'library/brand/logo.svg': '<svg/>',
        'library/brand/wordmark.png': 'PNGBYTES',
      },
      dirs: new Set(),
      listings: {
        'library/brand': [
          { name: 'logo.svg', kind: 'file' },
          { name: 'wordmark.png', kind: 'file' },
        ],
      },
    };

    const report = await migrateLegacyBrandToFolder(makeOpts(store));

    expect(report.migrated).toBe(true);
    expect(report.brandSlug).toBe('default');

    // All config files moved (now under config/)
    expect(report.filesMoved).toContain('.Syvon/Core/brand.json → config/brand.json');
    expect(report.filesMoved).toContain(
      '.Syvon/Core/design-tokens.json → config/design-tokens.json',
    );
    expect(report.filesMoved).toContain(
      '.Syvon/Core/text-styles.json → config/text-styles.json',
    );
    expect(report.filesMoved).toContain(
      '.Syvon/Core/figma-tokens.json → config/figma-tokens.json',
    );

    // Both binaries moved (assets/ unchanged)
    expect(report.assetsMoved).toContain('library/brand/logo.svg → assets/logo.svg');
    expect(report.assetsMoved).toContain(
      'library/brand/wordmark.png → assets/wordmark.png',
    );

    // Folders created. v11 made the brand root the WORKSPACE root, so there is
    // no brand folder left to create — only its two subfolders.
    expect(store.dirs.has('config')).toBe(true);
    expect(store.dirs.has('assets')).toBe(true);
    expect(store.dirs.has('brands/default')).toBe(false);

    // Files have moved in the store
    expect(store.files['config/brand.json']).toBe('{"voice":{"tone":"bold"}}');
    expect(store.files['.Syvon/Core/brand.json']).toBeUndefined();
    expect(store.files['assets/logo.svg']).toBe('<svg/>');
    expect(store.files['library/brand/logo.svg']).toBeUndefined();

    // animation.json left untouched (not in this fixture, but no spurious create)
    expect(report.warnings).toEqual([]);
  });

  it('is idempotent — already-migrated workspace is a no-op', async () => {
    const store: Store = {
      files: {
        'config/brand.json': '{"voice":{"tone":"bold"}}',
        // Legacy files also exist (shouldn't matter — target wins)
        '.Syvon/Core/brand.json': '{"voice":{"tone":"old"}}',
      },
      dirs: new Set(),
      listings: {},
    };

    const report = await migrateLegacyBrandToFolder(makeOpts(store));
    expect(report.migrated).toBe(false);
    expect(report.filesMoved).toEqual([]);
    expect(report.assetsMoved).toEqual([]);

    // Legacy file was not touched
    expect(store.files['.Syvon/Core/brand.json']).toBe('{"voice":{"tone":"old"}}');
    // Target file was not touched
    expect(store.files['config/brand.json']).toBe('{"voice":{"tone":"bold"}}');
  });

  it('no-op when legacy singleton is absent', async () => {
    const store: Store = {
      files: {},
      dirs: new Set(),
      listings: {},
    };

    const report = await migrateLegacyBrandToFolder(makeOpts(store));
    expect(report.migrated).toBe(false);
    expect(report.filesMoved).toEqual([]);
    expect(report.assetsMoved).toEqual([]);
  });

  it('handles missing sidecars — moves what exists, skips what doesn\'t', async () => {
    const store: Store = {
      files: {
        '.Syvon/Core/brand.json': '{"voice":{"tone":"bold"}}',
        // no design-tokens, no text-styles, no figma-tokens
      },
      dirs: new Set(),
      listings: {},
    };

    const report = await migrateLegacyBrandToFolder(makeOpts(store));
    expect(report.migrated).toBe(true);
    expect(report.filesMoved).toEqual([
      '.Syvon/Core/brand.json → config/brand.json',
    ]);
    expect(report.assetsMoved).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  it('handles missing library/brand/ binaries', async () => {
    const store: Store = {
      files: { '.Syvon/Core/brand.json': '{}' },
      dirs: new Set(),
      listings: {}, // library/brand/ listing missing — listDir throws
    };

    const report = await migrateLegacyBrandToFolder(makeOpts(store));
    expect(report.migrated).toBe(true);
    expect(report.assetsMoved).toEqual([]);
  });

  it('skips non-file entries under library/brand/', async () => {
    const store: Store = {
      files: {
        '.Syvon/Core/brand.json': '{}',
        'library/brand/logo.svg': '<svg/>',
      },
      dirs: new Set(),
      listings: {
        'library/brand': [
          { name: 'logo.svg', kind: 'file' },
          { name: 'archive', kind: 'directory' }, // should be skipped
        ],
      },
    };

    const report = await migrateLegacyBrandToFolder(makeOpts(store));
    expect(report.assetsMoved).toEqual([
      'library/brand/logo.svg → assets/logo.svg',
    ]);
  });

  it('hoists .Syvon/Core/animation.json into the default brand config folder', async () => {
    const store: Store = {
      files: {
        '.Syvon/Core/brand.json': '{}',
        '.Syvon/Core/animation.json': '{"presets":{}}',
      },
      dirs: new Set(),
      listings: {},
    };

    const report = await migrateLegacyBrandToFolder(makeOpts(store));
    // animation.json was MOVED into the default brand config folder (v8.6 all DNA brand-scoped).
    expect(store.files['.Syvon/Core/animation.json']).toBeUndefined();
    expect(store.files['config/animation.json']).toBe('{"presets":{}}');
    expect(report.filesMoved).toContain(
      '.Syvon/Core/animation.json → config/animation.json',
    );
  });

  it('hoists the interim .Syvon/animation.json when .Syvon/Core/animation.json is absent', async () => {
    const store: Store = {
      files: {
        '.Syvon/Core/brand.json': '{}',
        '.Syvon/animation.json': '{"presets":{"fade":{}}}',
      },
      dirs: new Set(),
      listings: {},
    };

    const report = await migrateLegacyBrandToFolder(makeOpts(store));
    expect(store.files['.Syvon/animation.json']).toBeUndefined();
    expect(store.files['config/animation.json']).toBe('{"presets":{"fade":{}}}');
    expect(report.filesMoved).toContain(
      '.Syvon/animation.json → config/animation.json',
    );
  });
});
