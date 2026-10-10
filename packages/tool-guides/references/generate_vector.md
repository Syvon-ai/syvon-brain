# generate_vector

COSTS MONEY — about $0.11 per graphic ($0.42 with usePro; tracing an existing image $0.01). Quote the count and dollar total and wait for the user's explicit yes in a later message before calling this, unless they have said cost does not matter. Generate a VECTOR (SVG) graphic with Recraft — flat shapes and paths that scale to any size, not pixels. Two directions: text-to-vector (pass a prompt) and image-to-vector (pass sourceImagePath to trace an existing workspace raster into an SVG). Use it for logos, icons, marks, spot illustrations, patterns and any graphic that must stay crisp at every size or be recoloured downstream; use generate_image for photographic or painterly work, which does not vectorise well. Saves to the workspace; a bare project path is rehomed into the shared assets/ kit so every project can reuse the mark.

## Parameters

### prompt — string

Text description of the vector graphic to generate. Required for text-to-vector; ignored when sourceImagePath is given (tracing takes no prompt).

### path — string

Workspace-relative path where the SVG will be saved — must end in .svg. Prefer brand-kit paths (e.g. assets/marks/leaf-icon.svg) so the graphic is reusable across every project; a bare projects/my-project/icon.svg is auto-redirected into assets/ when a brand is pinned. To keep it INSIDE its project, file it in a subfolder (projects/my-project/icons/leaf.svg is taken literally). Optional when tracing — defaults to the source path with a .svg extension.

### sourceImagePath — string

Workspace-relative path to an existing raster image (png/jpg/webp/gif/avif) to TRACE into an SVG. Its presence selects image-to-vector; omit it for text-to-vector. Tracing takes no prompt and invents nothing — it converts the picture that is already there, and costs a fraction of a generation.

### aspectRatio — string

Shape of the generated vector. Omit for the provider default, which is SQUARE. Text-to-vector only — a trace keeps the source image's shape.

### usePro — boolean

Use the Recraft Pro tier — better on dense illustration, and nearly 4x the price ($0.30 against $0.08 per graphic). Default is false. Ignored when tracing.

### silhouette — boolean

Finish the SVG as a one-colour silhouette on a clean, consistently framed artboard. Strips the white background the generator paints underneath every mark, flattens every ink fill to `currentColor` so whatever places the file assigns its colour, and re-frames the viewBox so the artwork is centred and fills a fixed share of a square board. TRUE FOR EVERY LOGO, ICON AND PICTOGRAM — a generator returns marks at four different scales inside four different-sized ink boxes, and no prompt fixes that. Leave false for illustrative or decorative vectors, where the colours and the composition are the point. Default false.

