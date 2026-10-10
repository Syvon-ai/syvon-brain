# propose_brand

Create a brand FROM A TEXT DESCRIPTION with AI and present it as a reviewable proposal — fonts, a full colour palette, and voice — without writing anything to the brand yet. Use when the user wants to invent a brand ("make me a bold dark fintech brand"), as opposed to import_brand_from_url / extract_brand_source which need an existing website or Figma. The proposal is staged and shown in a widget; call apply_brand (or let the user say "apply"/"save") to commit it and download the chosen fonts.

## Parameters

### description — string (required)

One or two sentences describing the brand — industry, audience, feel (e.g. "a bold, dark fintech brand, editorial and precise").

### name — string

Optional brand name, used in the proposal and type samples.

### vibes — array

Optional personality words to steer the palette/type (e.g. ["nocturnal", "precise", "premium"]).

### tone — string

Optional freeform tone notes (e.g. "understated, never loud").

### modes — object

Optional named colour modes to add, keyed by mode name (lowercase letters, digits, hyphens; not "default"), e.g. { "light": { "derive": "invert", "label": "Light" } } or { "dark": { "colors": { "background": "#0B0B0B", "text": "#F5F5F5" } } }. `derive: "invert"` builds the mode from the base palette (text ↔ background, derived surface/muted/border); `colors` sets roles in the mode (primary, secondary, tertiary, quaternary, background, surface, text, textMuted, border). `scheme` ("light" | "dark") binds the mode to the visitor's OS setting on the website — set it only when the user asks for that. Staged with the proposal and previewed; apply_brand writes them. Most brands want at most one (a light version of a dark brand, or the reverse): { "light": { "derive": "invert" } }.

