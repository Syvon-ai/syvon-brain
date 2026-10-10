# upload_file

Save a file the user provided into the workspace — an image, video, audio clip, PDF or font. Use when the point of the attachment is to KEEP it: "hold on to this", "add this to our logos", "put this in the brand kit". An attachment alone is NOT the signal. When the user says recreate this, make one like this, rebuild this in our brand, or match this style, the file is a REFERENCE and the deliverable is the thing you build from it — author it with write_file, or generate_image if they want a picture. Storing the reference and stopping leaves them holding the file they already had. Content is base64 (a data: URI is accepted as-is). Prefer brand-kit paths like assets/imagery/… or assets/logos/… so the file is reusable across every project, rather than burying it under one project. Refuses to overwrite unless asked.

## Parameters

### path — string (required)

Workspace-relative destination, WITH extension (e.g. assets/imagery/studio-shot.jpg). The extension decides how the workspace serves it.

### content — string (required)

File bytes, base64-encoded. A full data: URI is also accepted.

### description — string

What the file shows, in a sentence. Written to its .meta sidecar, which is what makes the file findable later and what image-to-video generation reads for context.

### tags — array

Short tags for retrieval (e.g. ["product", "studio", "hero"]).

### overwrite — boolean

Replace an existing file at this path. Default false — the write is refused instead.

