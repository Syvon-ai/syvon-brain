# import_font

Download a REAL font into the workspace so it renders on app and web — by Google Fonts family name (e.g. "Inter", "Playfair Display") or by a direct font-file URL (.woff2/.woff/.ttf/.otf). Writes the files into assets/fonts/ and registers them in fonts.json (what list_workspace_fonts reads). This does NOT set the brand's heading/body font — that is a brand-token decision; use import_brand_from_url or the brand token tools to assign a role.

## Parameters

### family — string

Google Fonts family name (case-insensitive). Provide this OR url.

### url — string

Direct URL to a font file (.woff2/.woff/.ttf/.otf). Provide this OR family.

### weights — array

Weights to fetch (e.g. [400, 700]). Defaults to the family's 400/700, or 400 for a direct url.

### styles — array

Styles to fetch. Defaults to ["normal"].

