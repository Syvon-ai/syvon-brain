# import_brand_from_url

Import a brand from a website in one call: extracts its colours, fonts and identity and writes the brand tokens + logo, THEN downloads the real font files and logo so the brand renders with them (not just their names). By default (mode "auto") it runs a DEEP live-DOM crawl via the render service — real Chrome, so self-hosted fonts and JS-drawn logos are captured — and falls back to a fast in-process pass when that service is not available. Use when the user gives a site to "pull the brand from" / "match this site".

## Parameters

### url — string (required)

The website URL to import the brand from.

### includeFonts — boolean

Download the detected fonts as real files (default true).

### includeLogo — boolean

Download the detected logo into assets/logos (default true).

### mode — string

auto (default): deep render-service crawl when available, else the in-process pass. deep: require the crawler (real self-hosted fonts + JS logos) — fails if it is not available here. light: force the fast in-process regex + Google-fonts pass, no crawler.

