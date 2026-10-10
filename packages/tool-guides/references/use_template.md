# use_template

Start a piece in a project folder from a template. By DEFAULT a workspace template that ships a .comp is LINKED: only the .comp is written into the project, its shots point root-relative at the pages in templates/, and this piece's words go on the shots with edit_sequence set_slot — so a fix to the template reaches every piece built from it. Pass mode:"copy" only when the user wants to change these LAYOUTS for this project alone. A catalog template, or a single page/component with no .comp, is always copied (every file it ships). Reads the workspace's own templates/ or the shared catalog/templates/. Pass the ref from list_templates (e.g. "templates/poster-quote", "catalog/templates/title-deck"), or a template inside a library pack as "{pack}/{slug}" — "presentations/boardroom" takes that whole theme, deck and slides, in ONE call. Use `only` to take just some of its pages. Returns the written paths, each page's text slots, and the reader to open the main one with.

## Parameters

### template — string (required)

The template ref: a bare slug ("poster-quote", workspace first), "templates/{slug}" for this workspace's own, or "catalog/templates/{slug}" for the shared set.

### destFolder — string (required)

Destination folder, relative to workspace root — this conversation's project folder, e.g. "projects/spring-launch-reel".

### as — string

Optional new base name for the template's MAIN file (no extension). Companion files keep their names so the main file's bare relative refs still resolve.

### mode — string

"link" (default): write only the .comp, pointing at the template's shared pages. "copy": copy every file into the project — ONLY when these layouts will be edited for this project alone. Ignored (always a copy) for a catalog template or a template with no .comp.

### only — array

Optional: take only these pages, by name or stem (e.g. ["01-cover", "04-content"]). Linked, the other pages' shots are dropped from the .comp; copied, only these files are copied. The main file always comes. Omit it and you get the whole template.

### brand — string

Optional: the slug of one of this workspace's brands (a folder under brands/). The copied deck declares it, and every photo slot is filled from that brand's own pictures. Omit it for the workspace's default brand — photos then come from assets/imagery/.

