# present_brand_review

Present extracted brand elements (colors, fonts, logo) as an interactive review card for the user to confirm or adjust before writing to DNA.

## Parameters

### colors — array (required)

Extracted brand colors with optional role labels.

### colors[].hex — string (required)

Hex color value (e.g. #1A1A2E).

### colors[].label — string

Role label like "Primary", "Secondary", "Accent".

### fonts — array (required)

Extracted fonts with matched system font options.

### fonts[].extracted — string (required)

Font name found in the source document or website.

### fonts[].role — string

Typographic role like "Headings", "Body", "Display".

### fonts[].systemMatches — array

Matching system fonts (best match first).

### logo — object

Detected logo (from website or file). Optional.

### summary — string (required)

Brief summary of what was analyzed and found.

### source — string

Where the data was extracted from (e.g. "brand-guidelines.pdf", "https://example.com").

### modePalettes — array

Optional: colour modes found in the source (e.g. a site's light and dark sections, a Figma Dark mode), one palette per mode, shown under the colours so the user confirms them too.

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

