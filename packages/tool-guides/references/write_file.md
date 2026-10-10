# write_file

Create or overwrite a file with given content. Use for new files or full replacement. Do not use for renaming files—use rename_file instead. For editing existing content, prefer apply_diff so the user can review changes. NEVER use this to change an existing .comp/.seq — use edit_sequence, which removes, reorders, swaps and retimes shots without you having to reproduce the file (a comp can hold embedded base64 assets that cannot survive being retyped). To REBUILD a .comp in place (a build script regenerating its output), pass `replace: true` — the path stays, nothing is duplicated into a new folder. Shared layouts are LINKED, not copied: a shot may point root-relative at "templates/<kit>/page.dsgn" from any project.

## Parameters

### path — string (required)

Path to the file relative to the workspace root, or absolute within workspace.

### content — string (required)

Content to write to the file.

### replace — boolean

Rebuild an EXISTING .comp/.seq in place with this content. Only for a composition — an existing .dsgn or .react is still refused. Refused as well when the file being replaced holds an embedded `data:` asset your content does not carry byte-for-byte. Use it to re-run a build into the SAME folder instead of writing a second copy of the project.

### ifVersion — object

Guarded overwrite: the file version you HOLD (from read_file_meta, or the `version` on a read result). When the file has changed since — another session, Studio, a push — the write is REFUSED with VERSION_CONFLICT and the current version, rather than silently overwriting someone's work. Omit to write unconditionally.

