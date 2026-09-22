import { describe, it, expect } from 'vitest';
import { migrateLegacySolverDir } from '../dna/dna-io';

describe('migrateLegacySolverDir', () => {
  it('moves solver subdirectories from .solver/ to .Syvon/Solvers/', async () => {
    const renames: Array<[string, string]> = [];
    const created: string[] = [];

    const listDir = async (path: string) => {
      if (path === '.solver') {
        return [
          { name: 'my-solver', kind: 'directory' as const },
          { name: 'another-solver', kind: 'directory' as const },
        ];
      }
      if (path === '.Syvon/Solvers') {
        return []; // Target is empty
      }
      throw new Error('ENOENT');
    };
    const rename = async (oldPath: string, newPath: string) => { renames.push([oldPath, newPath]); };
    const createFolder = async (path: string) => { created.push(path); };

    await migrateLegacySolverDir('.Syvon', { listDir, rename, createFolder });

    expect(renames).toEqual([
      ['.solver/my-solver', '.Syvon/Solvers/my-solver'],
      ['.solver/another-solver', '.Syvon/Solvers/another-solver'],
    ]);
    expect(created).toContain('.Syvon/Solvers');
  });

  it('skips when .solver/ does not exist', async () => {
    const renames: Array<[string, string]> = [];

    const listDir = async (_path: string) => { throw new Error('ENOENT'); };
    const rename = async (oldPath: string, newPath: string) => { renames.push([oldPath, newPath]); };
    const createFolder = async (_path: string) => {};

    await migrateLegacySolverDir('.Syvon', { listDir, rename, createFolder });

    expect(renames).toEqual([]);
  });

  it('skips entries that already exist in .Syvon/Solvers/', async () => {
    const renames: Array<[string, string]> = [];

    const listDir = async (path: string) => {
      if (path === '.solver') {
        return [
          { name: 'my-solver', kind: 'directory' as const },
          { name: 'new-solver', kind: 'directory' as const },
        ];
      }
      if (path === '.Syvon/Solvers') {
        return [
          { name: 'my-solver', kind: 'directory' as const }, // Already migrated
        ];
      }
      throw new Error('ENOENT');
    };
    const rename = async (oldPath: string, newPath: string) => { renames.push([oldPath, newPath]); };
    const createFolder = async (_path: string) => {};

    await migrateLegacySolverDir('.Syvon', { listDir, rename, createFolder });

    // Only new-solver should be moved; my-solver already exists
    expect(renames).toEqual([
      ['.solver/new-solver', '.Syvon/Solvers/new-solver'],
    ]);
  });

  it('skips non-directory entries in .solver/', async () => {
    const renames: Array<[string, string]> = [];

    const listDir = async (path: string) => {
      if (path === '.solver') {
        return [
          { name: 'my-solver', kind: 'directory' as const },
          { name: 'stray-file.txt', kind: 'file' as const },
        ];
      }
      if (path === '.Syvon/Solvers') return [];
      throw new Error('ENOENT');
    };
    const rename = async (oldPath: string, newPath: string) => { renames.push([oldPath, newPath]); };
    const createFolder = async (_path: string) => {};

    await migrateLegacySolverDir('.Syvon', { listDir, rename, createFolder });

    // Only the directory should be moved, not the file
    expect(renames).toEqual([
      ['.solver/my-solver', '.Syvon/Solvers/my-solver'],
    ]);
  });

  it('continues when individual rename fails', async () => {
    const renames: Array<[string, string]> = [];

    const listDir = async (path: string) => {
      if (path === '.solver') {
        return [
          { name: 'fail-solver', kind: 'directory' as const },
          { name: 'ok-solver', kind: 'directory' as const },
        ];
      }
      if (path === '.Syvon/Solvers') return [];
      throw new Error('ENOENT');
    };
    const rename = async (oldPath: string, newPath: string) => {
      if (oldPath.includes('fail-solver')) throw new Error('Permission denied');
      renames.push([oldPath, newPath]);
    };
    const createFolder = async (_path: string) => {};

    // Should not throw
    await migrateLegacySolverDir('.Syvon', { listDir, rename, createFolder });

    // Only ok-solver should succeed
    expect(renames).toEqual([
      ['.solver/ok-solver', '.Syvon/Solvers/ok-solver'],
    ]);
  });

  it('skips when .solver/ is empty', async () => {
    const renames: Array<[string, string]> = [];

    const listDir = async (path: string) => {
      if (path === '.solver') return [];
      throw new Error('ENOENT');
    };
    const rename = async (oldPath: string, newPath: string) => { renames.push([oldPath, newPath]); };
    const createFolder = async (_path: string) => {};

    await migrateLegacySolverDir('.Syvon', { listDir, rename, createFolder });

    expect(renames).toEqual([]);
  });
});
