import { describe, it, expect } from 'vitest';
import { WORKSPACE_SYNC_DIRS, WORKSPACE_TOP_DIRS, isReservedSegment } from './workspace-config';

describe('flows folder retired (SOT model A — sub-flows nest under workflows/{slug}/flows/)', () => {
  it('is no longer a synced / auto-created top-level dir', () => {
    expect(WORKSPACE_SYNC_DIRS).not.toContain('flows');
    expect(WORKSPACE_TOP_DIRS).not.toContain('flows');
  });
  it('keeps workflows as the live top-level dir', () => {
    expect(WORKSPACE_TOP_DIRS).toContain('workflows');
    expect(isReservedSegment('workflows')).toBe(true);
  });
});
