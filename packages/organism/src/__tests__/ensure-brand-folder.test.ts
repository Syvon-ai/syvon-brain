import { describe, it, expect } from 'vitest';
import { ensureBrandFolderStructureV7, type BrandFolderSeedData } from '../dna/ensure-brand-folder-v6';
import { BRAND_KIT_PRIMITIVES, BRAND_KIT_DEFAULTS } from '../dna/brand-folder-paths';

const SEED: BrandFolderSeedData = {
  brand: { name: 'Atlas' },
  designTokens: { v: 2 },
  textStyles: { roles: [] },
  figmaTokens: {},
  animation: { presets: [] },
};

/** In-memory storage harness mirroring the R2/fs contract. */
function harness(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  const created: string[] = [];
  const writes: string[] = [];
  return {
    store,
    created,
    writes,
    ops: {
      createFolder: async (path: string) => { created.push(path); },
      readFile: async (path: string) => {
        if (!store.has(path)) throw new Error('ENOENT');
        return store.get(path)!;
      },
      writeFile: async (path: string, content: string) => {
        store.set(path, content);
        writes.push(path);
      },
    },
  };
}

describe('ensureBrandFolderStructureV7 — kit + meta seeding', () => {
  it('seeds a folder-meta/v1 sidecar for each of the 14 kit primitives', async () => {
    const h = harness();
    await ensureBrandFolderStructureV7('workspaces/ws1/', 'atlas', SEED, h.ops);

    for (const primitive of BRAND_KIT_PRIMITIVES) {
      const key = `workspaces/ws1/assets/${primitive}/.meta/_folder.json`;
      expect(h.store.has(key)).toBe(true);
      expect(JSON.parse(h.store.get(key)!)).toEqual({
        $schema: 'folder-meta/v1',
        role: BRAND_KIT_DEFAULTS[primitive].role,
        defaultUse: BRAND_KIT_DEFAULTS[primitive].defaultUse,
      });
    }
  });

  it('creates the meta/ folder marker but seeds no prose', async () => {
    const h = harness();
    await ensureBrandFolderStructureV7('workspaces/ws1/', 'atlas', SEED, h.ops);

    expect(h.store.has('workspaces/ws1/meta/.keep')).toBe(true);
    expect(h.store.get('workspaces/ws1/meta/.keep')).toBe('');
    // No prose .md files are generated.
    const md = [...h.store.keys()].filter((k) => k.endsWith('.md'));
    expect(md).toEqual([]);
  });

  it('does NOT seed an uploads/ folder (runtime inbox)', async () => {
    const h = harness();
    await ensureBrandFolderStructureV7('workspaces/ws1/', 'atlas', SEED, h.ops);

    const uploadKeys = [...h.store.keys(), ...h.created].filter((k) => k.includes('/assets/uploads'));
    expect(uploadKeys).toEqual([]);
  });

  it('never overwrites an existing sidecar (idempotent / self-healing)', async () => {
    const existing = 'workspaces/ws1/assets/imagery/.meta/_folder.json';
    const h = harness({ [existing]: '{"$schema":"folder-meta/v1","role":"HUMAN EDIT","defaultUse":"scene-primary"}' });
    await ensureBrandFolderStructureV7('workspaces/ws1/', 'atlas', SEED, h.ops);

    expect(h.store.get(existing)).toContain('HUMAN EDIT');
    expect(h.writes).not.toContain(existing);
  });
});
