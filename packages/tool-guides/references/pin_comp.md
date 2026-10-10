# pin_comp

Pin a composition (.comp) as the project's edit target: sets Project.pinnedCompItemId so project-chat edits THIS comp in place instead of rebuilding. Identify the project by slug (or id) and the comp by its workspace path (or ProjectItem id). Use after creating a deck/comp so it becomes the stable working set.

## Parameters

### projectSlug — string

The project slug whose pinned comp to set. Provide this or projectId.

### projectId — string

The Project.id. Alternative to projectSlug.

### compPath — string

Workspace-relative path to the .comp (e.g. projects/{slug}/deck.comp); resolved to its ProjectItem server-side. Provide this or itemId.

### itemId — string

ProjectItem.id of the .comp to pin. Alternative to compPath.

