# list_tasks

List the workspace's cards — a card is a person's instruction attached to an object (a folder, a file, or a path inside a file) with an urgency and, often, a 1-5 rating. Returned in the order they should be WORKED: most urgent first, and among equally urgent ones the worst-rated first. Use `target` to get everything asked of one project and everything under it, and `status: "queued"` with `agent` to get your own queue. `ready: true` returns only what can be STARTED — the cards whose `after` blockers have all finished, which is Beads' `bd ready` in one field. Either way, `blocked` beside the array names each card's unfinished blockers, so you can say why you passed one over. Cards are the instruction; `search_file_meta` with maxRating 4 is the complementary per-file rework queue — a thorough pass reads both.

## Parameters

### target — string

Workspace-relative path of an object (e.g. "projects/catalog-layout"). Returns cards on that object AND on anything inside it. Omit for the whole workspace.

### status — string

Only cards in this state. "open" = written, unassigned. "queued" = handed to an agent, waiting. "working" = in progress. "done" = an agent finished and said what it did. "reviewed" = a person accepted it. Omit for all.

### agent — string

Only cards handed to this agent. Combine with status "queued".

### ready — boolean

Only cards nothing is still blocking — every id in their `after` has reached done or reviewed. A blocker id matching no card counts as finished. Ask for this when you are picking work up: it is the order the queue was written in.

