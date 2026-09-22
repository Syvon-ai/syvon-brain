import { describe, it, expect } from 'vitest';
import {
  CAPABILITY_SUBSTITUTIONS,
  WORKSPACE_OUTPUT_PATHS,
  workspaceGuardrailsText,
} from './workspace-guardrails';

/**
 * One source for the two rules, so a workspace's AGENTS.md and the connector's
 * `start_here` cannot answer "what already exists" differently.
 */

describe('CAPABILITY_SUBSTITUTIONS', () => {
  it('covers the capability that was rebuilt by hand, and says what that cost', () => {
    const ref = CAPABILITY_SUBSTITUTIONS.find((c) => c.use.includes('analyze_reference_layout'))!;
    expect(ref.instead).toMatch(/reference image/i);
    expect(ref.because).toMatch(/tokens/);
  });

  it('names a tool, never a folder to go read', () => {
    for (const c of CAPABILITY_SUBSTITUTIONS) {
      expect(c.use).toMatch(/^[a-z_]+(, [a-z_]+)*$/);
      expect(c.instead.length).toBeGreaterThan(8);
    }
  });
});

describe('WORKSPACE_OUTPUT_PATHS', () => {
  it('says who reads each path — a path with no reader is the failure it prevents', () => {
    for (const p of WORKSPACE_OUTPUT_PATHS) {
      expect(p.readBy.trim().length).toBeGreaterThan(0);
      expect(p.path).not.toMatch(/^\//); // workspace-relative, always
    }
  });

  it('carries the docs a generated brief could be mistaken between', () => {
    const paths = WORKSPACE_OUTPUT_PATHS.map((p) => p.path).join(' ');
    expect(paths).toContain('meta/design.md');
    expect(paths).toContain('meta/product.md');
    expect(paths).toContain('assets/skills/<name>.md');
    expect(paths).toContain('assets/instructions/taste.md');
  });
});

describe('workspaceGuardrailsText', () => {
  const text = workspaceGuardrailsText();

  it('leads with checking what exists, then where output goes', () => {
    expect(text.indexOf('BEFORE YOU BUILD')).toBeLessThan(text.indexOf('WRITE OUTPUT WHERE'));
  });

  it('keeps the rubric in the short form — it steers every generation', () => {
    expect(text).toContain('taste.md');
  });

  it('points at the full lists rather than pasting them', () => {
    expect(text).toContain('list_tools');
    expect(text).toContain('get_syvon_skill');
    expect(text).toContain('AGENTS.md');
  });

  it('rules out a second workflow format', () => {
    expect(text).toContain('.flow');
    expect(text).toMatch(/not invent a second workflow format/);
  });

  it('stays short enough to be read in a tool result', () => {
    expect(text.length).toBeLessThan(1400);
  });
});
