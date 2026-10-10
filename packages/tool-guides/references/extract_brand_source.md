# extract_brand_source

Run a specialized sub-agent to extract a structured BrandProfile from a brand source. Supports Figma URLs, website URLs, and PDF files. The sub-agent uses source-specific tools and returns a BrandProfile with confidence scores.

## Parameters

### source — string (required)

The type of brand source to extract from.

### reference — string (required)

The source reference: a Figma URL, a website URL, or a workspace-relative PDF path.

