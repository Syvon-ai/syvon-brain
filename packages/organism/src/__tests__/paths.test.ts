import { describe, it, expect } from 'vitest';
import {
  normalizePath, normalizeRoot, joinPath, dirname, basename, extname,
  isAbsolutePath, normalizeDotSegments, pathStartsWith, relativeFrom,
  toWorkspaceRelPath, pathRelative, resolvePath, resolveSeqAssetPath,
} from '../paths';
import { WORKSPACE_ROOT_PREFIXES } from '../workspace-config';

describe('normalizePath', () => {
  it('converts backslashes to forward slashes', () => {
    expect(normalizePath('C:\\Users\\John\\workspace')).toBe('C:/Users/John/workspace');
  });
  it('collapses duplicate slashes', () => {
    expect(normalizePath('C://Users///workspace')).toBe('C:/Users/workspace');
  });
  it('preserves UNC prefix', () => {
    expect(normalizePath('\\\\server\\share\\workspace')).toBe('//server/share/workspace');
  });
  it('trims whitespace', () => {
    expect(normalizePath('  /foo/bar  ')).toBe('/foo/bar');
  });
  it('handles empty string', () => {
    expect(normalizePath('')).toBe('');
  });
  it('preserves UNC but collapses internal doubles', () => {
    expect(normalizePath('\\\\server\\\\share\\\\file')).toBe('//server/share/file');
  });
});

describe('normalizeRoot', () => {
  it('strips trailing slash', () => {
    expect(normalizeRoot('C:/workspace/')).toBe('C:/workspace');
  });
  it('preserves drive root trailing slash', () => {
    expect(normalizeRoot('C:/')).toBe('C:/');
  });
  it('resolves dot segments', () => {
    expect(normalizeRoot('C:/workspace/./foo/../')).toBe('C:/workspace');
  });
  it('handles backslashes + trailing + dots', () => {
    expect(normalizeRoot('C:\\Users\\John\\workspace\\')).toBe('C:/Users/John/workspace');
  });
  it('preserves UNC path', () => {
    expect(normalizeRoot('\\\\server\\share\\workspace')).toBe('//server/share/workspace');
  });
  it('handles empty string', () => {
    expect(normalizeRoot('')).toBe('');
  });
  it('handles path with spaces', () => {
    expect(normalizeRoot('C:\\Users\\My Name\\workspace')).toBe('C:/Users/My Name/workspace');
  });
  it('resolves purely relative dot segments', () => {
    expect(normalizeRoot('./foo/../bar')).toBe('bar');
  });
});

describe('joinPath', () => {
  it('always uses forward slashes', () => {
    expect(joinPath('C:\\Users', 'workspace', 'file.txt')).toBe('C:/Users/workspace/file.txt');
  });
  it('collapses separators', () => {
    expect(joinPath('/root/', '/sub/', 'file')).toBe('/root/sub/file');
  });
  it('handles empty parts', () => {
    expect(joinPath('root', '', 'file')).toBe('root/file');
  });
  it('returns empty for no parts', () => {
    expect(joinPath()).toBe('');
  });
});

describe('pathStartsWith', () => {
  it('case-insensitive match', () => {
    expect(pathStartsWith('C:/Users/John/workspace', 'c:/users/john/workspace')).toBe(true);
  });
  it('rejects non-prefix', () => {
    expect(pathStartsWith('C:/Users/John/workspace', 'C:/Other')).toBe(false);
  });
  it('exact match', () => {
    expect(pathStartsWith('C:/workspace', 'C:/workspace')).toBe(true);
  });
});

describe('relativeFrom', () => {
  it('strips root case-insensitively', () => {
    expect(relativeFrom('C:/Users/John', 'c:/users/john/Projects/file.txt')).toBe('Projects/file.txt');
  });
  it('returns original if not under root', () => {
    expect(relativeFrom('/root', '/other/file.txt')).toBe('/other/file.txt');
  });
  it('returns . for exact match', () => {
    expect(relativeFrom('C:/workspace', 'C:/workspace')).toBe('.');
  });
});

describe('pathRelative', () => {
  it('computes relative path case-insensitively', () => {
    expect(pathRelative('C:/Users/John', 'C:/users/john/Projects/file.txt')).toBe('Projects/file.txt');
  });
});

describe('dirname / basename / extname', () => {
  it('dirname handles forward slashes', () => {
    expect(dirname('C:/foo/bar/file.txt')).toBe('C:/foo/bar');
  });
  it('dirname handles backslashes', () => {
    expect(dirname('C:\\foo\\bar\\file.txt')).toBe('C:\\foo\\bar');
  });
  it('basename extracts filename', () => {
    expect(basename('/foo/bar/file.txt')).toBe('file.txt');
  });
  it('basename strips extension', () => {
    expect(basename('/foo/file.txt', '.txt')).toBe('file');
  });
  it('extname returns extension', () => {
    expect(extname('file.txt')).toBe('.txt');
  });
});

describe('isAbsolutePath', () => {
  it('detects drive letter', () => {
    expect(isAbsolutePath('C:/foo')).toBe(true);
  });
  it('detects unix root', () => {
    expect(isAbsolutePath('/foo')).toBe(true);
  });
  it('detects UNC', () => {
    expect(isAbsolutePath('//server/share')).toBe(true);
  });
  it('rejects relative', () => {
    expect(isAbsolutePath('foo/bar')).toBe(false);
  });
  it('rejects empty', () => {
    expect(isAbsolutePath('')).toBe(false);
  });
});

describe('toWorkspaceRelPath', () => {
  it('strips absolute root case-insensitively', () => {
    expect(toWorkspaceRelPath('C:/Users/John', 'c:/users/john/Projects/file.txt')).toBe('Projects/file.txt');
  });
  it('handles relative path passthrough', () => {
    expect(toWorkspaceRelPath('C:/workspace', 'Projects/file.txt')).toBe('Projects/file.txt');
  });
});

describe('resolvePath', () => {
  it('resolves relative against root', () => {
    expect(resolvePath('/workspace', 'Projects/file.txt')).toBe('/workspace/Projects/file.txt');
  });
  it('returns absolute path unchanged', () => {
    expect(resolvePath('/workspace', '/other/file.txt')).toBe('/other/file.txt');
  });
  it('handles null root', () => {
    expect(resolvePath(null, 'file.txt')).toBe('file.txt');
  });
});

describe('resolveSeqAssetPath', () => {
  const seqDir = 'workflows/deck';

  it('joins bare sibling filenames to seqDir (v8.5 flat Flow)', () => {
    expect(resolveSeqAssetPath(seqDir, 'cover.dsgn')).toBe('workflows/deck/cover.dsgn');
  });
  it('resolves ./ and ../ against seqDir', () => {
    expect(resolveSeqAssetPath(seqDir, './shots/intro.dsgn')).toBe('workflows/deck/shots/intro.dsgn');
    expect(resolveSeqAssetPath(seqDir, '../other/clip.mp4')).toBe('workflows/other/clip.mp4');
  });

  // v8.5 regression: absolute workspace-root refs must NOT be joined to seqDir.
  // Reusable media lives on the brand (brands/{slug}/assets/…); a Flow comp that
  // references it must resolve to the brand key, not workflows/{slug}/brands/….
  it('keeps brands/ refs workspace-relative', () => {
    expect(resolveSeqAssetPath(seqDir, 'brands/acme/assets/intro.mp4')).toBe('brands/acme/assets/intro.mp4');
  });
  it('keeps workflows/ refs workspace-relative', () => {
    expect(resolveSeqAssetPath(seqDir, 'workflows/other/full.comp')).toBe('workflows/other/full.comp');
  });
  it('keeps assets/ refs workspace-relative', () => {
    expect(resolveSeqAssetPath(seqDir, 'assets/fonts/Inter/Inter.woff2')).toBe('assets/fonts/Inter/Inter.woff2');
  });
  it('keeps legacy + system roots workspace-relative', () => {
    expect(resolveSeqAssetPath(seqDir, 'projects/p1/x.comp')).toBe('projects/p1/x.comp');
    expect(resolveSeqAssetPath(seqDir, 'templates/t/x.dsgn')).toBe('templates/t/x.dsgn');
    expect(resolveSeqAssetPath(seqDir, '.Syvon/Core/design-tokens.json')).toBe('.Syvon/Core/design-tokens.json');
  });

  // Drift guard: every lowercase, non-legacy root prefix in the SoT must be
  // recognized by resolveSeqAssetPath. If a new workspace root is added to
  // WORKSPACE_ROOT_PREFIXES, WS_ROOT_RE in paths.ts must be updated to match.
  it('recognizes every canonical WORKSPACE_ROOT_PREFIX as a root path', () => {
    const canonical = WORKSPACE_ROOT_PREFIXES.filter((p) => p === p.toLowerCase());
    for (const prefix of canonical) {
      const ref = `${prefix}foo/bar.dsgn`;
      expect(resolveSeqAssetPath(seqDir, ref)).toBe(ref);
    }
  });
});
