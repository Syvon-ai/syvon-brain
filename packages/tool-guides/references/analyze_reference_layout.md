# analyze_reference_layout

Measure a reference image for syvon-recreate: layout-aware OCR (exact text + bounding boxes), a sampled colour/gradient grid matched to the brand's design tokens, and one vision pass that reads those ground-truth measurements alongside the image to identify logos/brand marks and describe composition and gradients in token terms. Use before writing the recreate brief. Returns structured data — it does not write the brief file itself.

## Parameters

### path — string (required)

Workspace-relative path to the reference image (e.g. "projects/my-project/reference.png").

### model — string

Vision model for the reading pass. Default "gpt-4o" — the careful read, and the right default when the brief becomes standing law for a brand. Pass "gpt-4o-mini" for a cheap sweep of many references where a rough read is enough.

