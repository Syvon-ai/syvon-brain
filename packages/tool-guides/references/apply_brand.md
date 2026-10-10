# apply_brand

Commit a staged brand proposal (from propose_brand) into the live brand: writes colours + fonts to design-tokens.json and voice to meta/voice.md, then downloads the chosen Google-font families. Call this when the user approves the proposal ("apply" / "save it"). Reads the staged proposal by default, or takes one inline via `proposal`.

## Parameters

### proposal — object

Optional proposal object to apply. Omit to apply the one propose_brand staged.

### modes — object

Optional named colour modes to add, keyed by mode name (lowercase letters, digits, hyphens; not "default"), e.g. { "light": { "derive": "invert", "label": "Light" } } or { "dark": { "colors": { "background": "#0B0B0B", "text": "#F5F5F5" } } }. `derive: "invert"` builds the mode from the base palette (text ↔ background, derived surface/muted/border); `colors` sets roles in the mode (primary, secondary, tertiary, quaternary, background, surface, text, textMuted, border). `scheme` ("light" | "dark") binds the mode to the visitor's OS setting on the website — set it only when the user asks for that. Added on top of any modes the proposal already carries (same name → this one wins).

