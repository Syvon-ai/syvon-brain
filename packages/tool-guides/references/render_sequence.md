# render_sequence

Export a .comp or .seq (composition/sequence) file to a single video (MP4). Renders each shot in order and concatenates them. When the source lives under projects/, the MP4 defaults to projects/{slug}/output/ — the folder the feed reads — flattening any sessions/{id}/ segment, because rendering a session draft IS the export. A source no project owns (a template, a workflow exemplar, a brand asset) goes to projects/previews/output/ — still on the spine and still synced. Works in Electron (desktop) and web (proxy) modes.

## Parameters

### sourcePath — string (required)

Workspace-relative path to the .comp or .seq file (e.g. projects/reel/reel.comp).

### outputPath — string

Optional path for the output MP4. If omitted: projects/{slug}/output/<name>.mp4 when the source is under a project, else projects/previews/output/<name>.mp4. Override only to place it somewhere else — the default is already the publishable location.

### width — number

Output width (default 1920).

### height — number

Output height (default 1080).

### fps — number

Frames per second (default 30).

### loudness — any

Target integrated loudness in LUFS for a final two-pass loudnorm master pass (default -14, Syvon's streaming/social target). Pass `false` to skip mastering. No effect when the composition has no audio track.

### themeWorkspaceRoot — string

Absolute path to ANOTHER workspace whose brand this render should wear: its colours, type and fonts, while the composition and its assets still come from this workspace. Omit to use this workspace own brand (or whatever the Studio status-bar theme dropdown is set to). Naming one here wins over that dropdown. The folder must have config/design-tokens.json; if it does not, the render falls back to this workspace brand and says so in the log.

### jobId — string

Resume a cloud render already in progress. Only pass the id a previous render_sequence call handed back with status "rendering", together with the same sourcePath/outputPath. Never invent one, and never start a new render while one is pending — it is already running.

