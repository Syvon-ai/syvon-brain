# Intent, inputs, outcomes and Dream Mode

Status: additive v1 portable contracts. Implemented parsers and path helpers are exported from @syvon/organism. They are not wired to an executor, scheduler, new UI or production storage. Existing workspaces require no migration.

## Preserve the organism that works

The external strategy brief is product input, not a replacement schema. The current code is the source of truth for storage and behavior.

| Existing fact | How the new concepts fit |
| --- | --- |
| Workspace config registers roots, sync and versioning | Add no roots and change no sync flags |
| The workspace's own brand lives in config/, meta/, assets/ and wrapper/ | Keep this shape; brands/ contains auxiliary brands, not a restored mandatory brand container |
| content/ holds shared semantic material | Reference it as input; one set of facts can feed many formats |
| knowledge/ holds accumulated guidance | Keep guidance separate from source content and explicit brand rules |
| projects/ owns artifacts; output paths distinguish drafts and exports | Scope deliverables name paths in the existing project |
| sessions/ owns conversations; session scope is a navigation/home concept | Receipts reference sessions; work scope does not replace session scope |
| meta/cards.jsonl owns reviews and tickets | Reference card IDs; do not create tasks.jsonl or a second decision ledger |
| meta/revisions.jsonl records file changes | Reference revision IDs and source hashes; do not duplicate file history |
| FileApproval approves material for use | Preserve it; continued work needs a separate scope grant |
| Agent manifests declare capabilities and permissions | A grant can only narrow the host's existing authority, never bypass it |
| Signals aggregate interaction feedback | Preserve them as one existing signal source, not the whole learning system |

An input is a role, not a new folder. A project output can later be selected as another scope's input without moving or copying it. A desired outcome is a useful effect, not another label for an export. For example, producing a launch deck does not establish that customers understood the launch.

## The loop

Inputs and prior work converge around intent and an agreed scope. Production can diverge into a deck, video and post using the same source facts. Existing review cards and revisions record corrections. Outcome observations and accepted guidance carry evidence back into the workspace.

Do not promote one correction into a global brand rule. The selected scope, source revision, human judgement and applicability determine what can be carried forward.

## Portable records

| Record | Optional location | Purpose |
| --- | --- | --- |
| BrainWorkScope | projects/{project}/scope.json | Intent, selected inputs, desired outcomes, deliverables, constraints and continuation limits |
| BrainScopeGrant | meta/scope-grants/{grantId}.json | Attributed approval of an immutable scope snapshot, expiry, pause/revocation state and cost budget |
| BrainOutcomeObservation | meta/outcomes.jsonl | Each line is one attributed observation with its own ID and evidence |
| BrainDreamReceipt | meta/dream-runs/{runId}.json | One completed attempt, its reasons, usage and links to existing work |

These are proposed storage conventions backed by path helpers, not automatic writes. No scaffolding creates the files. The existing project browser may show scope.json as ordinary authored content; no UI registration or hiding behavior is added here.

The scope file is the current authored scope. Before granting it, the host must retain its exact approved snapshot in versioned storage. Canonicalize with serializeBrainWorkScope, hash those UTF-8 bytes with SHA-256, and bind the grant to scope ID, revision and digest. Any edit to the intent, selected inputs, constraints, limits or deliverables changes the digest and requires a new grant. Do not infer approval from a bare ID or revision counter.

In v1, continuation is manual or finish. With a valid host-enforced grant, finish permits only bounded draft preparation/refinement within the specified deliverables; no recurring schedule, publication, deletion, configuration changes or self-expansion is implied. Resource limits are cumulative per grant, including retries and idle checks, not fresh budgets for every run. maxRefinementPasses may be zero. maxRuns must be positive. A zero cost budget permits only work the host can complete at zero cost.

Receipts distinguish idle, progressed, needs-review, blocked and failed. An idle attempt can incur checking cost but cannot claim output, revisions, outcome observations or refinement. A failed attempt may have partial output and cost. Progress must reference output, a revision or an observation. None of these states is human approval.

Outcome status is unmeasured, met or not-met. Met and not-met require evidence pinned by revision ID or SHA-256. Validation confirms the evidence reference exists in the record; the host still has to resolve it and assess whether it supports the claim. An agent's observedBy attribution is not a human verdict.

## Validation and host responsibilities

All parsers accept an object or JSON text and return either { ok: true, value } or { ok: false, issues }. Malformed, unsupported or unknown fields are rejected rather than silently changing authority. Paths are canonical workspace-relative paths with portable segments; IDs are bounded ASCII identifiers. Dates use canonical UTC timestamps with milliseconds.

Parsing is not authentication or authorization. The consuming host must:

1. Authenticate the grant author and protect grant creation, updates and revocations from agent writes. A record saying by: person is not proof.
2. Resolve the grant and approved scope snapshot in the same authenticated workspace; compare canonical digest, ID and revision; check current grant state and expiry at execution time.
3. Intersect the grant with existing agent permissions, file approvals and workspace access. A scope cannot elevate a capability or approve its own source material.
4. Reserve cumulative run, refinement and cost allowance atomically across workers and retries before spending; use idempotency keys and durable receipts. File read-modify-write alone is insufficient.
5. Resolve input pins and access before using content. Missing pins mean unpinned; changed, missing or inaccessible sources need an explicit decision. New input material does not automatically extend the approved scope.
6. Confirm deliverable paths and every observation/card/revision/session link belong to the approved scope and workspace. Enforce filesystem and symlink containment in the storage adapter.
7. Recheck grant and source state before committing effects. Pause or revocation must stop new work; preserve an honest receipt of any partial result and cost.
8. Append observations atomically, reject reused IDs with different content and retain correction history. Preserve approved scope snapshots and required referenced evidence in any full export.

These responsibilities deliberately remain outside the portable parser. The parser makes no network call, runs no tool and schedules no work.

## Dream Mode inside the current product

First prove this sequence in the existing project: supply material, express intent, inspect and correct direction, produce a result, review it, approve bounded finish, and return to progressed work with the decisions that still need attention.

Studio remains the place to direct the Brain. Surface remains another way to get results from it. Do not introduce another IDE or standalone Brain app based on the brief's illustrative tree. Free/Pro packaging is a product decision, not a new workspace format or migration.

Existing private autopilot objectives, cadence, batches, verdicts and taste helpers are integration candidates. Their presence is not evidence that Dream Mode is already implemented end to end. Reuse or adapt them after verifying the actual execution path rather than creating competing objectives or schedules.

## Open anatomy, private operation

Public: portable records, parsers, validation, storage conventions, examples, migration guidance and integration responsibilities.

Private to Syvon: Dream orchestration, intent interpretation, scope generation, context selection, retrieval and planning strategies, prioritization, evaluation systems, refinement loops, premium skills, Studio UX and hosted execution.

The public records allow a client to take their work elsewhere and build their own operator. They do not require Syvon to publish how its operator chooses the next best action.
