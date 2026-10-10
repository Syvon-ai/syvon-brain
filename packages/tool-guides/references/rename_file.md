# rename_file

Rename a file (change its name, optionally in the same or a different path). Use when the user wants to change only the filename. To move a file to another folder, use move_file instead. Do not use write_file to change filenames—renaming only changes the path, not the content. For a .dsgn/.react/.comp, every composition that referenced the old path is repointed at the new one automatically (and a renamed .comp has its own relative refs rebased), because a shot ref that no longer lands does not fail — it bakes a "Design content HTTP 404" card into every frame. Pass updateReferences: false to rename without touching them.

## Parameters

### oldPath — string (required)

Current path of the file, relative to workspace root.

### newPath — string (required)

New path (filename or path), relative to workspace root.

### updateReferences — boolean

Repoint .comp shot refs that pointed at oldPath. Default true. Set false only when you intend to leave the references dangling.

