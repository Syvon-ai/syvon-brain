# present_text_styles

Present a brand's text styles as a live type ramp — each named style (Display, H1, Body, Caption…) rendered at its actual size, weight and tracking. Use to show the typographic hierarchy as type, not a table. Read the real styles first (read_design / compile_design_tokens expose textStyleConfig) and pass fontCss so they render in the brand faces.

## Parameters

### title — string

Optional heading (e.g. the brand name).

### styles — array (required)

The text styles, in hierarchy order (largest first).

### styles[].name — string (required)

Style name (e.g. "Display", "H1", "Body").

### styles[].family — string

Font family for this style.

### styles[].size — number

Font size in px (rendered clamped so a Display still fits).

### styles[].weight — number

Font weight (100–900).

### styles[].tracking — number

Letter-spacing in em (e.g. -0.02).

### styles[].lineHeight — number

Line height (unitless multiplier).

### styles[].sample — string

Sample text; defaults to a pangram.

### fontCss — string

Optional @font-face CSS so the ramp renders in the real faces.

