# extract_media

Download the video/image/audio files a public page plays, into a workspace folder, for use as reference. Scans the raw markup (tags, JSON islands and inline scripts alike), de-duplicates signed CDN URLs that point at the same file, probes sizes before fetching, and writes a _manifest.json mapping each saved file back to its source URL — those URLs are often signed and expire, so the manifest is the only provenance. Defaults to video only; set `kinds` for images or audio. Use `dryRun` first to see the list and the total size. Existing files are skipped, so a reference folder can be topped up. A URL that IS a media file is downloaded directly. Note: a gallery rendered entirely by client-side JS has no media in its HTML and will come back empty — pass those URLs directly.

## Parameters

### url — string (required)

Page to scan for media, or a direct media file URL.

### outputDir — string

Workspace-relative folder to save into. Defaults to references/{site-host}.

### kinds — array

Which media to take. Default ["video"].

### dryRun — boolean

List what would be downloaded, with sizes, and write nothing. Do this first on an unfamiliar page.

### limit — number

Max files to take (default 40, max 200).

### maxFileMb — number

Skip any single file larger than this (default 200).

### maxTotalMb — number

Stop once the run would pass this total (default 750).

### minKb — number

Skip files under this size — pixels, spacers, icons (default 8).

### overwrite — boolean

Re-download files already in the folder. Default false.

