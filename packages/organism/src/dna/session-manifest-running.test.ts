import { describe, expect, it } from 'vitest';
import { parseSessionManifest, sessionRunning } from './session-manifest';

const CTX = { id: 'sess_1', primaryProjectSlug: 'deck' };

describe('the running turn, on the manifest', () => {
  it('keeps the prompt beside the stamp it belongs to', () => {
    const m = parseSessionManifest(
      { id: 'sess_1', runningSince: '2026-08-24T10:00:00.000Z', runningPrompt: 'rebuild section two' },
      CTX,
    );
    expect(m.runningSince).toBe('2026-08-24T10:00:00.000Z');
    expect(m.runningPrompt).toBe('rebuild section two');
  });

  it('DROPS a prompt with no stamp — the two are one fact in two fields', () => {
    // A prompt on its own is the residue of a write that half-failed. Carried
    // forward it would put a sentence on screen for a turn that is not running.
    const m = parseSessionManifest({ id: 'sess_1', runningPrompt: 'orphaned' }, CTX);
    expect(m.runningPrompt).toBeUndefined();
  });

  it('leaves an idle manifest clean rather than carrying nulls nobody reads', () => {
    const m = parseSessionManifest({ id: 'sess_1' }, CTX);
    expect('runningSince' in m).toBe(false);
    expect('runningPrompt' in m).toBe(false);
  });

  it('survives a round trip, which is what stops a turn from resetting it', () => {
    // The manifest is re-parsed and rewritten on every answer; a field that did
    // not survive would be cleared by the next turn rather than by its own end.
    const once = parseSessionManifest(
      { id: 'sess_1', runningSince: '2026-08-24T10:00:00.000Z', runningPrompt: 'keep me' },
      CTX,
    );
    const twice = parseSessionManifest(once, CTX);
    expect(twice.runningPrompt).toBe('keep me');
  });

  it('still ages out by the stamp alone — the prompt buys no extra life', () => {
    const started = new Date('2026-08-24T10:00:00.000Z').getTime();
    expect(sessionRunning('2026-08-24T10:00:00.000Z', started + 60_000)).toBe(true);
    expect(sessionRunning('2026-08-24T10:00:00.000Z', started + 60 * 60_000)).toBe(false);
  });
});
