# append_file_history

Record what you did to a file. Appends one row to the workspace's revision log, which is how a file gets a VERSION and how a change is linked back to the card that asked for it. Call it once per file you actually changed, with a one- or two-sentence summary. It never touches the rating fields: the person re-rates, and your row is what they read to decide. Pair it with `resolve_task` on the card itself.

## Parameters

### path — string (required)

Workspace-relative path to the file (e.g. "projects/My Project/hero.dsgn").

### summary — string (required)

What you did — one or two sentences, the summary the person will read when re-rating. Truncated to 60 words.

### cardId — string

The id of the card you are working, from list_tasks. This is what links the file to the request — omit it only when you are working with no card.

### op — string

What you did. Defaults to "changed". "created" is checked against the log: if this file already has revisions it is recorded as "changed" and you are told.

### from — string

Where the file was, when op is "renamed".

### at — string

The part of the file you touched — "video/shot-2", "page-3/headline".

