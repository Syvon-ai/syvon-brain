# task_activity

What has HAPPENED to the tickets, as opposed to what the queue looks like now (list_tasks). Reads the append-only card log without collapsing it, so every transition is visible: written, queued to a lane, picked up, finished, accepted. Use it to answer "what changed since I last looked", "what did that agent actually do", and "what is waiting on me". IMPORTANT: "done" is an agent saying it finished; "reviewed" is a person accepting it. They are counted separately and must never be added together — the done-but-not-reviewed pile is work waiting on a human, not work completed.

## Parameters

### since — string

Only transitions after this. Either a window ("30m", "6h", "2d") or an ISO timestamp. Omit for the whole log.

### target — string

Workspace-relative path — only tickets on this object or anything inside it.

### agent — string

Only tickets handed to this lane.

### status — string

Only tickets whose CURRENT state is this.

### id — string

One ticket, its whole life.

