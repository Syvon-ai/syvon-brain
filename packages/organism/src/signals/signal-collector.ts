/**
 * Lightweight signal collection — append signals to .Syvon/Memory/signals.json.
 * No LLM involved; pure read-append-write.
 */

import type { Signal, Signals } from '../dna/dna-types';
import { readDnaFile } from '../dna/dna-io';

type ReadFile = (path: string) => Promise<string>;
type WriteFile = (path: string, content: string) => Promise<void>;

const DEFAULT_SIGNALS: Signals = {
  totalInteractions: 0,
  approvalRate: 0,
  patterns: [],
  pivots: [],
};

// Serialize concurrent writes to prevent read-modify-write races (e.g., parallel solver runs).
let writeLock: Promise<void> = Promise.resolve();

/** Append a signal event to signals.json and update aggregate counts. */
export async function collectSignal(
  readFile: ReadFile,
  writeFile: WriteFile,
  signalsPath: string,
  signal: Signal
): Promise<void> {
  // Chain on the previous write so concurrent calls execute sequentially.
  const prev = writeLock;
  let resolve!: () => void;
  writeLock = new Promise<void>((r) => { resolve = r; });
  try {
    await prev;
  } catch { /* previous write failed — still proceed with ours */ }

  try {
    const current = (await readDnaFile<Signals>(readFile, signalsPath)) ?? {
      ...DEFAULT_SIGNALS,
      patterns: [...DEFAULT_SIGNALS.patterns],
      pivots: [...DEFAULT_SIGNALS.pivots],
    };

    current.totalInteractions += 1;

    // Update pattern counts
    const existing = current.patterns.find(
      (p) => p.context === signal.context && p.signal === signal.type
    );
    if (existing) {
      existing.count += 1;
    } else {
      current.patterns.push({ context: signal.context, signal: signal.type, count: 1 });
    }

    // Recalculate approval rate
    const approvals = current.patterns
      .filter((p) => p.signal === 'approve')
      .reduce((sum, p) => sum + p.count, 0);
    current.approvalRate =
      current.totalInteractions > 0
        ? Math.round((approvals / current.totalInteractions) * 100) / 100
        : 0;

    await writeFile(signalsPath, JSON.stringify(current, null, 2));
  } finally {
    resolve();
  }
}
