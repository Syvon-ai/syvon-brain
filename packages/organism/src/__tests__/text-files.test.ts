import { describe, it, expect } from 'vitest';
import {
  isTextFile,
  toWorkspaceRelativeKey,
  WORKSPACE_TEXT_HASH_MAX_BYTES,
} from '../text-files';

describe('isTextFile', () => {
  it('accepts the authored formats', () => {
    for (const p of [
      'config/brand.json',
      'meta/voice.md',
      'widget/card.react',
      'widget/kpis.dsgn',
      'projects/x/deck.comp',
      'tools/payroll/report.tool',
      'skills/method.skill',
      'assets/logo.svg',
    ]) {
      expect(isTextFile(p), p).toBe(true);
    }
  });

  it('rejects media', () => {
    for (const p of ['assets/reel.mp4', 'assets/fonts/x.woff2', 'assets/shot.png']) {
      expect(isTextFile(p), p).toBe(false);
    }
  });

  it('is case-insensitive on the extension', () => {
    expect(isTextFile('config/BRAND.JSON')).toBe(true);
  });

  it('does not mistake a dotted DIRECTORY for an extension', () => {
    // The engine's old private extname scanned the whole path, so `dir.v2/file`
    // yielded '.v2/file'. Same answer here, but for the right reason.
    expect(isTextFile('dir.v2/file')).toBe(false);
  });

  it('treats a dotfile as having no extension', () => {
    expect(isTextFile('.gitignore')).toBe(false);
  });
});

describe('toWorkspaceRelativeKey', () => {
  it('passes a relative key through', () => {
    expect(toWorkspaceRelativeKey('config/app.json', 'ws1')).toBe('config/app.json');
  });

  it('strips this workspace’s own absolute prefix', () => {
    // The bug this exists for: the agent tool context indexes absolute keys
    // while every other writer indexes relative ones.
    expect(toWorkspaceRelativeKey('workspaces/ws1/config/app.json', 'ws1')).toBe('config/app.json');
  });

  it('REFUSES a key belonging to another workspace', () => {
    // Rewriting it to look local would turn a cross-tenant bug into a
    // cross-tenant write. Dropping it is the only safe answer.
    expect(toWorkspaceRelativeKey('workspaces/ws2/config/app.json', 'ws1')).toBeNull();
  });

  it('strips a leading slash and normalises backslashes', () => {
    expect(toWorkspaceRelativeKey('/config/app.json', 'ws1')).toBe('config/app.json');
    expect(toWorkspaceRelativeKey('config\\app.json', 'ws1')).toBe('config/app.json');
    expect(toWorkspaceRelativeKey('workspaces\\ws1\\config\\app.json', 'ws1')).toBe('config/app.json');
  });

  it('returns null for empty or prefix-only input', () => {
    expect(toWorkspaceRelativeKey('', 'ws1')).toBeNull();
    expect(toWorkspaceRelativeKey('config/app.json', '')).toBeNull();
    expect(toWorkspaceRelativeKey('workspaces/ws1/', 'ws1')).toBeNull();
    expect(toWorkspaceRelativeKey('workspaces/ws1', 'ws1')).toBeNull();
  });
});

describe('WORKSPACE_TEXT_HASH_MAX_BYTES', () => {
  it('is the 5 MB ceiling ws push already used', () => {
    expect(WORKSPACE_TEXT_HASH_MAX_BYTES).toBe(5 * 1024 * 1024);
  });
});
