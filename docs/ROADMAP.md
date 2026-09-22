# Making Syvon Brain smarter

Status: design proposal based on inspection of the existing implementation. The capabilities below are not claims about this release.

## What exists today

The organism has a strong declarative foundation: workspace roots, brand DNA, design tokens, permissions, approvals, revisions and callback-based storage. These are useful constraints for intelligence, not intelligence by themselves.

Concrete findings:

- In this release, src/signals/signal-collector.ts increments interaction counts and per-context patterns. It does not retain each event's timestamp, evidence or causal link. Its single module-level lock serializes unrelated workspaces and cannot coordinate separate processes.
- src/dna/dna-context.ts loads brand and design tokens. It does not retrieve knowledge, learned preferences or task-relevant history into that context.
- src/dna/dna-io.ts catches missing, invalid and failed reads as null. The collector can consequently initialize fresh aggregates after a storage failure. Typed read outcomes are a prerequisite for reliable learning.
- The existing app Brain map represents workspace membership. Moving a node only changes browser-local presentation.
- The monorepo integrity engine already builds explicit reference edges and checks placement, references, binding, staleness and orphans. That is a valuable next extraction, but it currently imports private parsers and agent helpers.

The first three paths above are relative to packages/organism. The last two observations describe app integrations outside this release.

## 1. Preserve evidence before learning

Introduce append-only, idempotent events with event ID, workspace, project, artifact revision, actor, timestamp, action, and source reference. Separate generated suggestions, explicit user corrections, execution outcomes and content approvals.

Use a storage interface with atomic append or compare-and-swap. Partition concurrency by workspace; do not depend on a process-local lock for durability. Distinguish not-found, malformed content and transport failure so failures cannot become empty memory.

Acceptance: duplicate delivery has no effect; concurrent workers lose no events; a failed read cannot reset history; deleting a source invalidates its derived evidence.

## 2. Retrieve task-relevant context with provenance

Add a small context interface taking task, workspace, project, access scope and token budget. Return selected facts, source revisions, relevance explanations, conflicts and unknowns. Start with explicit links, exact matches, recency and scope; measure the incremental value of embeddings later.

Keep declared brand rules separate from inferred preferences. Filter access before ranking and before any model sees content. Cache by source revision and permission scope, not just query text.

Acceptance: answers cite current sources; deleted and unauthorized content never appears; project-local facts do not silently become workspace-wide rules; recall and token cost beat loading every file.

## 3. Learn preferences from corrections and outcomes

A rejection should record what changed and why, not just lower an approval rate. Store candidate preferences with evidence links, sample count, scope, confidence and last confirmation. Detect contradictions and let users inspect, accept, edit or forget a preference. Explicit declarations win over inferred patterns.

Use decay for preferences that can change. Keep objective validation results separate from taste. One failed tool call must not become a brand preference.

Acceptance: a repeated correction changes the next relevant proposal; an unrelated project is unaffected; one anomalous event does not overwrite a rule; forgetting removes derived context as well as its visible record.

## 4. Make the graph useful for decisions

Extract the existing integrity engine behind parser and reference-resolution adapters. Retain deterministic explicit edges as ground truth. Add typed proposed semantic edges with evidence and confidence; do not present inference as an authored dependency.

Use the graph to answer: what will this change affect, which outputs are stale, what is missing before this task can run, and which approved assets can be reused?

Acceptance: impact explanations name their dependency path; incremental updates match a full rebuild; broken references and stale outputs have reproducible fixtures.

## 5. Close the loop through proposals and evaluation

Let Brain propose repairs and next actions with reasons, expected impact and an inspectable change set. Existing approvals should cover the specific artifact revision or operation. Recheck authorization and source revisions at execution time.

Build a synthetic evaluation workspace covering retrieval, contradictions, deletion, stale content, permissions, feedback and interrupted runs. Record task success, unsupported claims, repeated corrections, latency and cost. Compare every new heuristic or model against the same baseline.

Acceptance: no cross-workspace retrieval, no silent rule promotion, no unapproved destructive action, and a measurable reduction in repeated corrections.

## Suggested sequence

1. Durable events and typed storage failures, with multi-writer and retry tests.
2. Evidence-bearing context retrieval and a reproducible evaluation baseline.
3. Reviewable preferences and correction-based learning.
4. Standalone integrity engine and change-impact queries.
5. A public Brain UI that shows evidence, freshness and pending proposals.

Keep these behind a small storage/context interface rather than distributing reasoning across UI components. Start with deterministic behavior and add models only where an evaluation demonstrates improvement.
