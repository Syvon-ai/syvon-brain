# export_design

Screenshot (rasterize) a .dsgn OR a .comp/.seq to a still image — the ONLY correct way to preview what actually renders. This IS the real FormatKit render engine; never hand-write HTML or inject markup to approximate a design. To mirror what the brain generate/narrate produces, screenshot the .comp (the hydrated composition, seq/v2 — media tracks + ambient echo composited), NOT a bare .dsgn template: hydrate_format turns a template + slots into a .comp, then screenshot THAT. A .dsgn still shows only the template layer and cannot reflect the generated media compositing. Exports PNG/JPG/SVG/PDF via Chrome (a running Studio/render host, or the metered cloud lane when signed in) or HTML via the pure-TS engine (.dsgn only — no Chrome, no credits). To SEE the result and judge whether it looks good, pass returnImage:true (png/jpg only) — the rendered pixels come back inline as a real image you can look at; without it you get only a path, and read_file returns base64 as text you cannot view. If it reports that no render host is available AND no cloud credential is present, the image was NOT produced — do not fabricate a preview; start Studio, sign in, or use format:"html".

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

