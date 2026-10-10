# search_file_meta

Search file metadata across the workspace. Queries by tags, text, folder prefix and/or REVIEW STATE. Returns matching files with their metadata (label, description, tags). Use with folder: "Library" to find existing images for media slots. REVIEW STATE now lives on review CARDS (`list_tasks` is the richer read): `maxRating: 4` (with `imagesOnly: false`) is the rework queue — every file with an outstanding review card rated 4 or below, whose `instruction` says what to change. Files rated before the merge still answer from their legacy sidecar rating, so an old queue does not silently empty. `unratedOnly` finds what nobody has looked at yet.

## Parameters

### tags — array

Filter by tags — all specified tags must be present (AND logic).

### text — string

Free-text search across label, description, and tags.

### folder — string

Folder to search in (e.g. "Library"). Defaults to "Library".

### imagesOnly — boolean

Only return image files (png, jpg, webp, gif, svg). Default true.

### minRating — number

Only files rated at least this (1-5). Rated files only.

### maxRating — number

Only files rated at most this (1-5). `maxRating: 4` is the rework queue — reviewed and not approved. Unrated files are excluded (they are not a verdict).

### unratedOnly — boolean

Only files with no rating at all — never reviewed.

