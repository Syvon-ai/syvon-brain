# get_download_url

Get a time-limited download link for a workspace file. Use this when the user wants to DOWNLOAD, SAVE or SHARE a file, or when a file is too large to return inline (read_file/read_asset refuse a binary over ~1.1 MB — this is the way to hand it over anyway: a PDF, a full-res image, a rendered video). Returns a URL the user can open directly, plus the file size and type. The link points at the file in the user's own workspace and expires (default 1 hour).

## Parameters

### path — string (required)

Workspace-relative path to the file.

### expiresInHours — number

How long the link stays valid, in hours (default 1, max 168).

### filename — string

Optional download filename shown when the user saves it. Defaults to the file's own name.

