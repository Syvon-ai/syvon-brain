# list_drafts

List the drafts saved in this workspace — notes and ideas kept with save_draft, newest first. Use it for "what did I save", "what's on my list", "read me my notes", and to find the id of a draft the user is describing before calling promote_draft. Bodies come back shortened; open one in full with read on its path.

## Parameters

### folder — string

Where to look. Defaults to this conversation's project (projects/{slug}/drafts) or meta/drafts when there is no project — the same place save_draft writes.

### status — string

"draft" = still just a note. "promoted" = already filed as a card on the queue. Omit for both.

### search — string

Only drafts whose title, body or tags contain this text.

