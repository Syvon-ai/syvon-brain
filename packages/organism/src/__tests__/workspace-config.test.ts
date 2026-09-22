import { describe, it, expect } from 'vitest';
import {
  WORKSPACE_CONFIG,
  WORKSPACE_TOP_DIRS,
  WORKSPACE_SYNC_DIRS,
  WORKSPACE_RESERVED_SEGMENTS,
  WORKSPACE_VERSIONED_DIRS,
  versionedDirsFor,
  isVersionedKey,
  CATALOG_WORKSPACE_ID,
  isReservedSegment,
  resolveWorkspacePath,
  WS_WORK, WS_TEMPLATES, WS_RENDER_TRANSIT,
  WS_SYVON, WS_SYVON_MEMORY, WS_SYVON_SIGNALS,
  DEFAULT_PROJECT_FOLDER,
  PROJECT_ITEM_ORIGINS,
  WORKSPACE_LIVE_PREFIXES,
  WS_WORKFLOWS,
} from '../workspace-config';
import { getProjectFolder, getProjectItemPath } from '../dna/project-paths';

describe('WORKSPACE_CONFIG', () => {
  it('all folder paths use forward slashes', () => {
    for (const f of WORKSPACE_CONFIG.folders) {
      expect(f.path).not.toContain('\\');
    }
  });
  it('all dna paths use forward slashes', () => {
    for (const v of Object.values(WORKSPACE_CONFIG.dna)) {
      expect(v).not.toContain('\\');
    }
  });
  it('no folder path has a leading slash', () => {
    for (const f of WORKSPACE_CONFIG.folders) {
      expect(f.path).not.toMatch(/^\//);
    }
  });
});

describe('derived arrays', () => {
  it('WORKSPACE_TOP_DIRS contains auto-create folders (v6 lowercase)', () => {
    expect(WORKSPACE_TOP_DIRS).toContain('projects');
    expect(WORKSPACE_TOP_DIRS).toContain('templates');
    expect(WORKSPACE_TOP_DIRS).toContain('assets');      // v6
    // v11 brand-at-root — these replaced brands/{slug}/ entirely.
    expect(WORKSPACE_TOP_DIRS).toContain('config');
    expect(WORKSPACE_TOP_DIRS).toContain('meta');
    expect(WORKSPACE_TOP_DIRS).toContain('wrapper');
    // The semantic source of truth — a scaffolded root, because content is
    // meant to lead: the workspace's designs are arrangements of it.
    expect(WORKSPACE_TOP_DIRS).toContain('content');
    // `brands/` was RETIRED in v11 and must never be auto-created again: a
    // recreated brands/ is a second, unread copy of the workspace's DNA.
    expect(WORKSPACE_TOP_DIRS).not.toContain('brands');
    // `export/` was RETIRED 2026-07-31 — it must not come back as an
    // auto-created folder. Renders derive their destination from the source.
    expect(WORKSPACE_TOP_DIRS).not.toContain('export');
    // library/ + context/ are retired — no longer in the folders array.
    expect(WORKSPACE_TOP_DIRS).not.toContain('library');
    expect(WORKSPACE_TOP_DIRS).not.toContain('context');
    expect(WORKSPACE_TOP_DIRS).not.toContain('.Syvon');
  });
  it('WORKSPACE_RESERVED_SEGMENTS includes .Syvon', () => {
    expect(WORKSPACE_RESERVED_SEGMENTS).toContain('.Syvon');
  });
  it('masters/ is local-only: never synced, never auto-created', () => {
    expect(WORKSPACE_SYNC_DIRS).not.toContain('masters');
    expect(WORKSPACE_TOP_DIRS).not.toContain('masters');
  });
  it('knowledge/ is synced but made lazily, by the run that learns something', () => {
    // The folder is real and reserved, and it is NOT part of the scaffold: a
    // workspace that has learned nothing should not carry an empty folder that
    // reads as something missing. Every write creates its parents, so the first
    // rule written makes it. `sync: true` is the half that must never go — what
    // an agent has learned has to reach the next machine.
    expect(WORKSPACE_SYNC_DIRS).toContain('knowledge');
    expect(WORKSPACE_TOP_DIRS).not.toContain('knowledge');
  });
  it('import/ is synced but opt-in: the whole point of registering it', () => {
    // Figma pulls land here. If it ever loses `sync: true` it becomes `export/`
    // all over again — a folder written to that never reaches R2.
    expect(WORKSPACE_SYNC_DIRS).toContain('import');
    // Not auto-created: workspaces that never import anything stay clean.
    expect(WORKSPACE_TOP_DIRS).not.toContain('import');
  });
  it('posts/ is registered but never synced or auto-created: copy-on-publish, written straight to R2', () => {
    expect(WORKSPACE_TOP_DIRS).not.toContain('posts');
    expect(WORKSPACE_SYNC_DIRS).not.toContain('posts');
    expect(WORKSPACE_RESERVED_SEGMENTS).toContain('posts');
  });
});

describe('isReservedSegment', () => {
  it('detects reserved', () => {
    expect(isReservedSegment('projects')).toBe(true);
    expect(isReservedSegment('.Syvon')).toBe(true);
  });
  it('rejects non-reserved', () => {
    expect(isReservedSegment('MyProject')).toBe(false);
  });
});

describe('resolveWorkspacePath', () => {
  it('joins root with .Syvon/ dna path', () => {
    expect(resolveWorkspacePath('C:/workspace', 'memory')).toBe('C:/workspace/.Syvon/Memory');
  });
  it('normalises backslash root', () => {
    expect(resolveWorkspacePath('C:\\workspace', 'root')).toBe('C:/workspace/.Syvon');
  });
});

describe('v6 workspace constants', () => {
  it('WS_WORK is the lowercase projects folder', () => {
    expect(WS_WORK).toBe('projects');
  });
  it('WS_TEMPLATES / WS_RENDER_TRANSIT match the current layout', () => {
    expect(WS_TEMPLATES).toBe('templates');
    // Not `export`: the retired folder's one real use was a render TRANSIT
    // buffer, renamed so nothing mistakes it for an output location.
    expect(WS_RENDER_TRANSIT).toBe('.renders');
  });
  it('.Syvon/ dotfile namespace constants', () => {
    expect(WS_SYVON).toBe('.Syvon');
    expect(WS_SYVON_MEMORY).toBe('.Syvon/Memory');
    expect(WS_SYVON_SIGNALS).toBe('.Syvon/Memory/signals.json');
  });
  it('DEFAULT_PROJECT_FOLDER matches config (v6 lowercase)', () => {
    expect(DEFAULT_PROJECT_FOLDER).toBe('projects/My First Project');
  });
});

describe('project-folder vocabulary (v8.5)', () => {
  it('builds the flat project folder (no /assets subfolder)', () => {
    expect(getProjectFolder('my-agent')).toBe('projects/my-agent');
  });
  it('builds a project file path', () => {
    expect(getProjectItemPath('my-agent', 'hero.comp')).toBe('projects/my-agent/hero.comp');
  });
  it('declares the input/output origin convention', () => {
    expect([...PROJECT_ITEM_ORIGINS]).toEqual(['input', 'output']);
  });
  it('exposes the live (synced) prefix set including workflows', () => {
    expect(WORKSPACE_LIVE_PREFIXES).toContain('projects/');
    expect(WORKSPACE_LIVE_PREFIXES).toContain('config/');
    expect(WORKSPACE_LIVE_PREFIXES).toContain('wrapper/');
    expect(WORKSPACE_LIVE_PREFIXES).toContain('workflows/');
    // Auxiliary brands (aux-brands/v1) sync: a `@brand` the cloud renderer
    // cannot read is a declaration every server render ignores.
    expect(WORKSPACE_LIVE_PREFIXES).toContain('brands/');
    expect(WORKSPACE_LIVE_PREFIXES).toContain('import/');
    expect(WS_WORKFLOWS).toBe('workflows');
  });
});

describe('the file version log — which roots keep history', () => {
  it('declares `versioned` on EVERY folder', () => {
    // WORKSPACE_CONFIG is a bare `as const`, so a field present on only some
    // entries makes the union heterogeneous and every derived `.filter` on it
    // stops type-checking. The flag is all-or-nothing by construction.
    for (const f of WORKSPACE_CONFIG.folders) {
      expect(typeof f.versioned, f.path).toBe('boolean');
    }
  });

  it('never versions a root that does not sync', () => {
    // The recorder hangs off R2 writes. A root that never reaches R2 could
    // never produce a row, so claiming history for it would be a promise
    // nothing keeps.
    for (const f of WORKSPACE_CONFIG.folders) {
      if (f.versioned) expect(f.sync, f.path).toBe(true);
    }
  });

  it('versions what a person or an agent authors', () => {
    for (const root of [
      'projects', 'workflows', 'config', 'meta', 'wrapper',
      'templates', 'tools', 'skills', 'widget', 'ui',
    ]) {
      expect(WORKSPACE_VERSIONED_DIRS, root).toContain(root);
    }
  });

  it('does not version media, derived output, or logs', () => {
    for (const root of [
      'assets', 'knowledge', 'admin', '.meta', 'import',
      '.renders', 'masters', 'releases', 'posts', 'sessions', '.Syvon',
    ]) {
      expect(WORKSPACE_VERSIONED_DIRS, root).not.toContain(root);
    }
  });

  it('keeps no history for the catalog', () => {
    // Synthetic workspace: no Workspace row, so an FK-bearing insert fails —
    // and its content is authored in a git checkout already.
    expect(versionedDirsFor(CATALOG_WORKSPACE_ID)).toEqual([]);
    expect(versionedDirsFor('ws_1')).toEqual(WORKSPACE_VERSIONED_DIRS);
  });

  describe('isVersionedKey', () => {
    it('accepts authored files in versioned roots', () => {
      expect(isVersionedKey('config/brand.json')).toBe(true);
      expect(isVersionedKey('widget/kpis.dsgn')).toBe(true);
      expect(isVersionedKey('projects/acme/deck.comp')).toBe(true);
    });

    it('carves out render output inside projects/', () => {
      // A product, not authorship — and regenerable from the sources beside it.
      expect(isVersionedKey('projects/acme/output/deck.mp4')).toBe(false);
      expect(isVersionedKey('projects/acme/output/nested/poster.jpg')).toBe(false);
      // …but only at that exact depth.
      expect(isVersionedKey('projects/output/deck.comp')).toBe(true);
    });

    it('rejects unversioned roots and bare keys', () => {
      expect(isVersionedKey('assets/logo.svg')).toBe(false);
      expect(isVersionedKey('sessions/x/cards.jsonl')).toBe(false);
      expect(isVersionedKey('README.md')).toBe(false);
      expect(isVersionedKey('')).toBe(false);
    });

    it('honours the per-workspace root set', () => {
      expect(isVersionedKey('config/brand.json', CATALOG_WORKSPACE_ID)).toBe(false);
      expect(isVersionedKey('config/brand.json', 'ws_1')).toBe(true);
    });
  });
});
