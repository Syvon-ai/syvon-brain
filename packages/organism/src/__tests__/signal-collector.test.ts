import { describe, it, expect } from 'vitest';
import { collectSignal } from '../signals/signal-collector';
import type { Signal, Signals } from '../dna/dna-types';

function createMockFs(files: Record<string, string> = {}) {
  const fs: Record<string, string> = { ...files };
  return {
    readFile: async (path: string) => {
      if (fs[path] === undefined) throw new Error(`ENOENT: ${path}`);
      return fs[path];
    },
    writeFile: async (path: string, content: string) => {
      fs[path] = content;
    },
    getFile: (path: string) => fs[path],
  };
}

describe('collectSignal', () => {
  it('creates signals.json from scratch on first signal', async () => {
    const mock = createMockFs();
    const signal: Signal = { type: 'approve', context: 'strategy.slvr', timestamp: '2026-02-25T00:00:00Z' };
    await collectSignal(mock.readFile, mock.writeFile, 'signals.json', signal);
    const result = JSON.parse(mock.getFile('signals.json')) as Signals;
    expect(result.totalInteractions).toBe(1);
    expect(result.approvalRate).toBe(1);
    expect(result.patterns).toHaveLength(1);
    expect(result.patterns[0]).toEqual({ context: 'strategy.slvr', signal: 'approve', count: 1 });
  });

  it('increments existing pattern count', async () => {
    const existing: Signals = {
      totalInteractions: 1, approvalRate: 1, patterns: [{ context: 'writing.slvr', signal: 'approve', count: 1 }], pivots: [],
    };
    const mock = createMockFs({ 'signals.json': JSON.stringify(existing) });
    await collectSignal(mock.readFile, mock.writeFile, 'signals.json', { type: 'approve', context: 'writing.slvr', timestamp: '2026-02-25T00:00:00Z' });
    const result = JSON.parse(mock.getFile('signals.json')) as Signals;
    expect(result.totalInteractions).toBe(2);
    expect(result.patterns[0].count).toBe(2);
  });

  it('adds new pattern for different context', async () => {
    const existing: Signals = {
      totalInteractions: 1, approvalRate: 1, patterns: [{ context: 'writing.slvr', signal: 'approve', count: 1 }], pivots: [],
    };
    const mock = createMockFs({ 'signals.json': JSON.stringify(existing) });
    await collectSignal(mock.readFile, mock.writeFile, 'signals.json', { type: 'reject', context: 'strategy.slvr', timestamp: '2026-02-25T00:00:00Z' });
    const result = JSON.parse(mock.getFile('signals.json')) as Signals;
    expect(result.totalInteractions).toBe(2);
    expect(result.approvalRate).toBe(0.5);
    expect(result.patterns).toHaveLength(2);
  });
});
