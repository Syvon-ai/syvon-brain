# hydrate_format

Create a single-page .comp file (composition) from a named template and slot values. Call read_format first to see slot names, then pass slots: { slot_id: "content", ... }. For multi-page compositions (carousels, decks), call hydrate_format once per page then use create_sequence to assemble into a single .comp.

## Parameters

### name — string (required)

The template name (e.g. "big-text", "explainer", "slogan").

### slots — object (required)

Key-value map of slot names to content. Keys are slot IDs from the template (e.g. "headline", "body"). Values are text strings or asset paths.

### canvas — object

Optional canvas size override { width, height }. Defaults to template native size.

### duration — number

Duration in seconds (e.g. 5). Defaults to 6.

### writeTo — string

Workspace-relative path to write the .comp output. Files MUST go inside a named project folder: Projects/{project-name}/{file}.comp.

## Media slot auto-fill

Media slots you omit are auto-filled from the brand kit by role (bg → `assets/bg/`, product → `assets/products/`, hero → `assets/imagery/`, avatar → `assets/avatar/`, logos via the logo/v1 manifest). The picker ranks candidates from each file's `.meta` sidecar: `brandMaterial: false` and `defaultUse: "exclude"` folders are never chosen; a `content.medium` that is not a photograph is never chosen for a picture slot; a declared `role` beats the folder; `content` (medium / framing / subject / people) and `density` refine within survivors.

When YOU pass a media path by hand, apply the same gate: `read_file_meta` the candidate first — an illustration, screenshot, or diagram (`content.medium` ≠ photograph) is the wrong medium for a slot the layout treats as a photograph, and `content.people` tells you whether a face is in frame before you lay a headline over it.

