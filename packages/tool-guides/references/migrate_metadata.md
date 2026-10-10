# migrate_metadata

Migrate inline metadata to `.meta/` sidecars. Scans .comp and .dsgn files in the specified folder, extracts inline meta, writes `.meta/` sidecar entries. Skips files that already have a `.meta/` sidecar.

## Parameters

### folder — string

Workspace-relative folder to scan (e.g. "projects/My Project"). Defaults to "projects".

