# move_file

Move a file to another directory. Use when the user wants to move a file into a different folder. The destination path can be a new filename or keep the same name. For renaming a file in the same directory, use rename_file instead. For a .dsgn/.react/.comp, every composition that referenced the old path is repointed at the new one automatically (and a moved .comp has its own relative refs rebased — a bare "hook.dsgn" means a DIFFERENT file from a different folder), because a shot ref that no longer lands does not fail: it bakes a "Design content HTTP 404" card into every frame. Pass updateReferences: false to move without touching them.

## Parameters

### sourcePath — string (required)

Current path of the file, relative to workspace root.

### destPath — string (required)

Destination path (folder path and optional new filename), relative to workspace root.

### updateReferences — boolean

Repoint .comp shot refs that pointed at sourcePath, and rebase a moved .comp's own relative refs. Default true. Set false only when you intend to leave the references dangling.

