# list_revisions

What has been done to a file, to everything under a folder, or by one card. Each row says which change of that file it was (its version), what op it was, which card asked for it, and the sentence whoever made it wrote. Use it before reworking something to see whether the card you are holding has already been answered — a revision naming your card id means the work is done and the card is stale.

## Parameters

### path — string

A file, or a folder — a folder returns everything changed under it, the same containment rule list_tasks uses for target. Omit for the whole workspace.

### cardId — string

Only what this card produced.

### limit — number

Newest first. Default 50.

