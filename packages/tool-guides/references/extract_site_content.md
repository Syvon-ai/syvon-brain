# extract_site_content

Replicate a public website's pages and metadata into workspace files. Crawls the site in a real browser (so client-rendered routes and collapsed accordions are captured, not missed), and writes one markdown + one JSON file per page plus site.json, structured-data.json and a manifest into content/extraction/. Text only — no fonts, images or binaries. The capture is VERBATIM: nothing is summarised or invented, and a page that could not be read is reported as a failure. Use to learn what a customer's own site says before writing anything for them; use import_brand_from_url for their colours, fonts and logo.

## Parameters

### url — string (required)

Root URL of the site, e.g. https://example.com/

### outputDir — string

Workspace-relative output folder. Default content/extraction. The folder is tool-owned — re-running overwrites it, so never point it at hand-written files.

### maxPages — number

Page ceiling. Default 100, max 150.

