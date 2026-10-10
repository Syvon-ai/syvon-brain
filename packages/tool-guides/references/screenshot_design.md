# screenshot_design

Alias of export_design. Screenshot (rasterize) a .dsgn to a PNG (default), or JPG/SVG/PDF/HTML. Identical behavior to export_design — this is the real render engine; never hand-write HTML to approximate a design. Pass returnImage:true (png/jpg) to get the rendered pixels back inline and actually look at your output before reporting done.

## Parameters

### designPath — string (required)

Workspace-relative path to a .comp/.seq (preferred — mirrors generate/narrate output) or a .dsgn template (e.g. Projects/identity/identity.comp).

### format — string

Output format (default png). PNG and JPG are raster screenshots, SVG serialises the vector DOM, PDF generates a single-page document, HTML produces a self-contained HTML+CSS handoff (no Chrome required).

### outputPath — string

Optional workspace-relative path for the output. Defaults to projects/{slug}/output/<name><ext> when the design is under a project — the folder the feed reads, with any sessions/{id}/ segment flattened — else projects/previews/output/<name><ext>. Override only to place it somewhere else; the default is already the publishable location.

### themePath — string

HTML-only. Optional path to a design-tokens.json (or to a brand folder containing both design-tokens.json and text-styles.json) to resolve tokens against. If omitted, DEFAULT_DNA is used.

### colorMode — string

Export in one of the brand's colour modes (e.g. "light") — the `modes` its design-tokens.json declares — without editing the file. The design's own <FormatCanvas colorMode>, and any frame that declares one, still wins. Omit for the base palette. All formats.

### width — number

Viewport width in pixels. Defaults to the size the source declares — the .dsgn FormatCanvas or the .comp resolution — so a 4:5 design exports 4:5 without being told. Only pass this to override. Ignored for HTML.

### height — number

Viewport height in pixels. Defaults to the size the source declares (see width). Only pass this to override. Ignored for HTML.

### themeWorkspaceRoot — string

Absolute path to ANOTHER workspace whose brand this export should wear: its colours, type and fonts, while the design and its assets still come from this workspace. Applies to the Chrome formats (png/jpg/svg/pdf), not to html. Omit to use this workspace own brand, or whatever the Studio status-bar theme dropdown is set to; naming one here wins over that dropdown and over themePath.

### returnImage — boolean

Opt-in screenshot loopback (default false). When true and the format is raster (png/jpg), the rendered pixels are returned inline as a viewable image so you can look at your own output and judge it — legibility, hierarchy, cropping, brand feel — before reporting done. Off by default: an ordinary export just writes the file and returns a path. Prefer jpg for photo-heavy designs; a render over the inline-view limit is reported (imageOmitted) with the file still written.

