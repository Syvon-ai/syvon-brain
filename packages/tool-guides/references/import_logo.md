# import_logo

Fetch a logo image from a URL and save it into the brand's assets/logos/, then rebuild the logo/v1 manifest so slots ({brand_logo}, {brand_symbol}, {brand_wordmark}, {brand_lockup}) resolve to it. SVG is preferred; png/webp/jpg/avif/gif accepted. Use `variant` and `treatment` to place a specific mark (e.g. the white symbol for dark backgrounds).

## Parameters

### url — string (required)

URL of the logo image to import.

### variant — string

Which mark this is. Default "primary" (the do-it-all logo).

### treatment — string

Colour treatment. "light" = reversed/white for dark surfaces. Default "color".

### filename — string

Optional explicit filename override (else derived from variant/treatment).

