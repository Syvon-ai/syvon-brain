# render_text_mask

Render a .dsgn as a two-tone TEXT MASK — black type on a white ground, every image and fill painted out — and measure where the type sits. Use it before generate_image whenever the image will sit BEHIND a layout: pass the returned mask path as a reference image and the returned coverage.prose in the prompt, and the generator composes around the text instead of behind it. Layout, fonts and type scale are the real ones, so the mask shows exactly where the glyphs land in the finished piece. Images keep their boxes (painted white) rather than being removed, so nothing shifts. Renders through the same engine as export_design and costs the same one still.

## Choosing the reference

This tool reserves **text**, not the complete composition. Media boxes keep
their geometry but are painted white, so a mask does not communicate product
scale, scene anchors, image-window boundaries or an intended cable connection.
For grid-controlled image generation, derive a blocking `.dsgn` from the active
DNA tokens and export it with `export_design`; pass that raster as the
composition reference and the real product as a separate identity reference.
Use the text mask additionally when native type must sit over the generated
image. See `syvon-image-layout/references/token-grid.md`.

When the request is to invent a stronger composition, first discover relevant
workspace graphics/components and explore their spatial relationships. A mask
of the old design preserves its hierarchy; it does not solve composition
invention. See `syvon-image-layout/references/composition-exploration.md`.

A reference image guides generation; it does not enforce exact CSS geometry.
Inspect the generated result and preserve the approved grid in native
FormatKit when pixel-accurate reconstruction is required.

## Parameters

### path — string (required)

Workspace-relative path to the .dsgn to mask (e.g. projects/spring/hero.dsgn).

### outputPath — string

Optional workspace-relative path for the mask PNG. Defaults to the project output folder as <name>.mask.png.

### invert — boolean

Render white type on a black ground instead (default false). The measurement follows, so coverage means the same either way.

### grid — number

Resolution of the numeric coverage grid, 1-16 (default 4). The prose description always uses thirds.

### returnImage — boolean

Return the mask pixels inline so you can look at it (default false).
