# refresh_view

Tell the app to drop what it is showing for these paths and re-read them from disk. Use after writing or regenerating files the user is looking at — especially images, PDFs and videos, which the editor does NOT pick up on its own. Pass the paths you changed; workspace-relative or absolute both work. Call it once at the end of a batch rather than per file.

## Parameters

### paths — array (required)

Paths that were rewritten and should be re-read.

