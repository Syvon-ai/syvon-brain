import { describe, it, expect } from 'vitest';
import { TOOL_PACKAGES, PACKAGE_IDS, packageById, expandPackages } from './index';

describe('TOOL_PACKAGES', () => {
  it('has unique ids', () => {
    expect(new Set(PACKAGE_IDS).size).toBe(PACKAGE_IDS.length);
  });

  it('puts no tool in two non-estate packages', () => {
    // Estate names live outside the registry, so they cannot collide with it;
    // within the registry a tool in two packages is a tool whose audience
    // nobody decided.
    const seen = new Map<string, string>();
    for (const id of PACKAGE_IDS) {
      const pkg = packageById(id)!;
      if (pkg.estate) continue;
      for (const name of pkg.tools) {
        if (seen.has(name)) throw new Error(`${name} is in both ${seen.get(name)} and ${id}`);
        seen.set(name, id);
      }
    }
  });

  it('marks exactly the workspace package as estate', () => {
    const estate = PACKAGE_IDS.filter((id) => packageById(id)?.estate === true);
    expect(estate).toEqual(['workspace']);
  });
});

describe('packageById', () => {
  it('resolves declared ids and refuses nothing else', () => {
    expect(packageById('orient')?.title).toBe('Orient');
    expect(packageById('workspace')?.estate).toBe(true);
    expect(packageById('nope')).toBeUndefined();
  });
});

describe('expandPackages', () => {
  it('expands in order, de-duplicated across packages', () => {
    const { names } = expandPackages(['see', 'orient']);
    // Declaration order of the packages wins, not the argument order — lanes
    // concatenate in PACKAGE_IDS order so derived constants stay stable.
    expect(names[0]).toBe('get_syvon_skill');
    expect(new Set(names).size).toBe(names.length);
  });

  it('refuses estate packages and reports unknown ids', () => {
    const { names, refused, unknown } = expandPackages(['brand', 'workspace', 'ghost']);
    expect(names).toEqual([...TOOL_PACKAGES.brand.tools]);
    expect(refused).toEqual(['workspace']);
    expect(unknown).toEqual(['ghost']);
  });
});
