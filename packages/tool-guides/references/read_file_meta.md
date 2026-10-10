# read_file_meta

Read metadata for a workspace file. Checks the `.meta/` sidecar first, falls back to inline meta extraction for un-migrated .comp/.dsgn files. Also returns `version` — the storage-derived file version (etag/mtime) — which a live card polls to detect that the file changed after it was read. Returns `meta: null` when no metadata exists (version is still present).

## Parameters

### path — string (required)

Workspace-relative path to the file (e.g. "projects/My Project/hero.dsgn").

