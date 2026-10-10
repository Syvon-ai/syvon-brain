# copy_file

Copy a file to a new path, keeping the original. Use to duplicate a template or an existing piece before editing the copy — so you never have to edit a shared original in place. Binary assets (images, fonts, video) are copied byte-for-byte. The original is untouched and references to it are left pointing at it. A copied .comp's own bare relative refs (e.g. "hook.dsgn") resolve against the COPY's folder, so when copying a comp into a different directory, copy its designs too or repoint them.

## Parameters

### sourcePath — string (required)

Path of the file to copy, relative to workspace root.

### destPath — string (required)

Destination path for the copy, relative to workspace root. Overwrites an existing file at that path.

