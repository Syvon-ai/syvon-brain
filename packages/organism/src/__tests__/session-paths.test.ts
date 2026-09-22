import { describe, it, expect } from 'vitest';
import {
  WS_SESSIONS,
  getWorkspaceSessionFolder,
  getWorkspaceSessionItemPath,
  getWorkspaceSessionManifestPath,
  getSessionCardsPath,
  getSessionFolder,
  getSessionItemPath,
  getSessionManifestPath,
  getSessionContextPath,
  isSessionId,
  getProjectSessionsFolder,
} from '../dna/session-paths';
import { isSessionScopedPath } from '../dna/output-paths';

describe('session-paths', () => {
  it('WS_SESSIONS is the segment both layouts share', () => {
    expect(WS_SESSIONS).toBe('sessions');
  });

  describe('v2 — session as a workspace root', () => {
    it('getWorkspaceSessionFolder sits at the workspace root, not under a project', () => {
      expect(getWorkspaceSessionFolder('s-abc')).toBe('sessions/s-abc');
    });

    it('getWorkspaceSessionItemPath appends a filename', () => {
      expect(getWorkspaceSessionItemPath('s-abc', 'work-chat.jsonl')).toBe('sessions/s-abc/work-chat.jsonl');
    });

    it('getWorkspaceSessionManifestPath points at session.json', () => {
      expect(getWorkspaceSessionManifestPath('s-abc')).toBe('sessions/s-abc/session.json');
    });

    it('getSessionCardsPath points at the card ledger', () => {
      expect(getSessionCardsPath('s-abc')).toBe('sessions/s-abc/cards.jsonl');
    });

    // The move is deliberately conversation-only. A v2 session folder holds no
    // artifacts, so nothing under `sessions/` should read as a project draft —
    // that rule keys off `projects/{slug}/sessions/`, not the bare segment.
    it('a v2 session path is NOT a project-scoped draft path', () => {
      expect(isSessionScopedPath(getWorkspaceSessionFolder('s-abc') + '/session.json')).toBe(false);
      expect(isSessionScopedPath('projects/reel/sessions/s-abc/output/x.comp')).toBe(true);
    });
  });

  it('getSessionFolder nests under the project folder', () => {
    expect(getSessionFolder('my-proj', 's-abc')).toBe('projects/my-proj/sessions/s-abc');
  });

  it('getSessionItemPath appends a filename', () => {
    expect(getSessionItemPath('my-proj', 's-abc', 'output/comp-1.comp')).toBe(
      'projects/my-proj/sessions/s-abc/output/comp-1.comp',
    );
  });

  it('getSessionManifestPath points at session.json', () => {
    expect(getSessionManifestPath('my-proj', 's-abc')).toBe(
      'projects/my-proj/sessions/s-abc/session.json',
    );
  });

  it('getSessionContextPath points at the per-session .context.jsonl', () => {
    expect(getSessionContextPath('my-proj', 's-abc')).toBe(
      'projects/my-proj/sessions/s-abc/.context.jsonl',
    );
  });

  it('isSessionId accepts our generated ids and rejects junk', () => {
    expect(isSessionId('s-lwabcd-9f3a')).toBe(true);
    expect(isSessionId('../escape')).toBe(false);
    expect(isSessionId('has/slash')).toBe(false);
    expect(isSessionId('')).toBe(false);
  });

  it('getProjectSessionsFolder returns the sessions root for a project', () => {
    expect(getProjectSessionsFolder('my-proj')).toBe('projects/my-proj/sessions');
  });
});
