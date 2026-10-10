# read_asset

Fetch a single workspace media asset (image, video, audio) as a data URI, by the exact reference a design or comp uses — a workspace path or a proxy URL. This exists for widgets to lazy-load media that was too large to inline up front; it is rarely useful to a model reasoning in text (use read_design/read_comp for that).

## Parameters

### ref — string (required)

The asset reference exactly as the design or comp names it — a workspace-relative path or an /api/…?r2Key=… proxy URL.

