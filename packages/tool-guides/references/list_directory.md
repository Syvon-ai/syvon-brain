# list_directory

List files and folders in a directory (default: workspace root). Each item includes a name, kind (file/directory), and updatedAt timestamp showing when it was last modified. Use when you need to know what exists or what changed recently.

## Parameters

### path — string

Directory path relative to workspace root. Omit or use "." to list the root (returns file names you can pass to read_file).

