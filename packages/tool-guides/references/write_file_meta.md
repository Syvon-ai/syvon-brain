# write_file_meta

Write or merge metadata for a workspace file into its `.meta/` sidecar. Merges with existing metadata by default — existing fields are preserved unless overwritten. Tags are replaced (not appended). DO NOT write `rating` or `ratingNote`: they hold a human verdict on the file and the brief for reworking it. Rating your own output approved destroys the only signal the field carries. Read them, act on them, leave them for a person to change. `history` is also refused — it is append-only through `append_file_history`, and this merge would replace the array rather than append to it.

## Parameters

### path — string (required)

Workspace-relative path to the file (e.g. "projects/My Project/hero.dsgn").

### meta — object (required)

Metadata to write. Fields: label, tags, description, publish, sourcePath, exportedAt, format, resolution. `rating` and `ratingNote` are deliberately absent, and `history` is refused (append-only via `append_file_history`) — see the tool description.

