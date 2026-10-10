# publish_feed

Tag a rendered output in projects/{slug}/output/ for the feed: writes the sibling <name>.json channel sidecar (non-empty channels[] = published). Requires the render (<name>.<ext>) to already exist in that output folder. Pass media[] to group several sibling files into ONE carousel / story-set card. This is feed/socials publishing, NOT a site release (use workspace_publish for that). Do not also mint a Post for the same file — the feed would show it twice.

## Parameters

### projectSlug — string (required)

The project folder under projects/ whose output/ holds the render.

### name — string (required)

The output file name, with or without extension (e.g. "reel" or "reel.mp4"). The sidecar is written as <stem>.json beside it, and <stem>.<ext> is the card cover.

### format — string

The presentation format. Single-media: post (image/video) / reel (video) / deck (a .comp or .pdf, internally multi-slide). Grouped: carousel / story — supply media[] with the ordered slides. Defaults to the single-media kind inferred from the file.

### media — array

Ordered sibling file names in the SAME output/ folder that render as one carousel / story-set card (e.g. ["01.png","02.png","03.png"]). Each must already exist. Omit for a single-media post.

### channels — array (required)

Channels to publish to, e.g. ["instagram","site"]. NON-EMPTY = published; this is the gate.

### title — string

Card title. Defaults to the file stem.

### sub — string

Card subtitle. Defaults to the caption.

### caption — string

Body / caption text.

### category — string

Sub-scope within a channel.

### tags — array

Tags.

### brand — string

Optional: scope this item to one brand slug (omit = show for all brands).

### promote — boolean

When the artifact is not at projects/{slug}/output/ but exists in a sessions/*/output/ draft folder, copy it up before publishing (default true). The result reports promotedFrom. Set false to require it already be at project root.

### width — number

Media width in px (video/pdf/image cards only; ignored for .comp).

### height — number

Media height in px (video/pdf/image cards only; ignored for .comp).

