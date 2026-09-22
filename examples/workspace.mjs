import assert from 'node:assert/strict';
import { WORKSPACE_CONFIG, ensureProjectFolder, collectSignal } from '@syvon/organism';
// In-memory storage keeps this example self-contained and writes no user files.
const files = new Map();
const readFile = async path => { if (!files.has(path)) throw new Error('File not found'); return files.get(path); };
const writeFile = async (path, content) => { files.set(path, content); };
const projectFile = ensureProjectFolder('launch.comp', 'demo');
assert.equal(projectFile, 'projects/demo/launch.comp');
await collectSignal(readFile, writeFile, 'signals.json', {
  type: 'approve', context: projectFile, timestamp: new Date().toISOString(),
});
const signals = JSON.parse(files.get('signals.json'));
assert.equal(signals.totalInteractions, 1);
assert.equal(signals.approvalRate, 1);
console.log({ projectFile, workspaceRoots: WORKSPACE_CONFIG.folders.map(f => f.path), signals });
