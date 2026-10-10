# present_brand_bento

Present a brand at a glance as a bento of tiles — palette, type, logo, imagery and voice. Use to show the user 'here is your brand' as one visual, not a wall of hex codes. Populate it from the workspace's real DNA (read it first with read_design / compile_design_tokens / list_workspace_fonts) rather than guessing. Every tile is optional — pass only what you have.

## Parameters

### name — string (required)

Brand name, shown as the heading.

### tagline — string

Optional one-line tagline or positioning.

### palette — array

Brand colours with optional role labels.

### palette[].hex — string (required)

Hex colour (e.g. #1A1A2E).

### palette[].label — string

Role label like "Primary", "Ink", "Accent".

### type — array

Type families with their role.

### type[].family — string (required)

Font family name (e.g. "Geist", "Sequel Sans").

### type[].role — string

Role like "Display", "Headings", "Body".

### type[].sample — string

Optional sample text; defaults to the family name.

### logo — object

Brand logo (image or inline SVG). Optional.

### imagery — array

A few representative imagery URLs/data URIs for an imagery tile. Optional.

### voice — array

A few words that describe the brand voice (e.g. "warm", "precise", "playful"). Optional.

### fontCss — string

Optional @font-face CSS so the type tile renders in the real faces.

### modePalettes — array

Optional: the brand's colour modes, one palette per mode as it resolves (e.g. the Light mode's swatches), shown under the base palette. Omit to have them read from the brand's design-tokens.json.

### modePalettes[].mode — string (required)

Mode name, e.g. "light".

### modePalettes[].label — string

Display label, e.g. "Light".

### modePalettes[].palette — array (required)

_no description_

### modePalettes[].palette[].hex — string (required)

_no description_

### modePalettes[].palette[].label — string

_no description_

