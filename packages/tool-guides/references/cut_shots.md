# cut_shots

Split a workspace video into its individual shots — detects the hard cuts and writes one file per shot. Use when a reference or a piece of footage needs to become usable material: the shots to rebuild, the clip to drop into a comp, the frame to describe. Call it with planOnly first to see how many shots there are, then name the ones you want in `shots` — a long reel is dozens of encodes.

## Parameters

### path — string (required)

Workspace path of the video (.mp4/.mov/.webm/.m4v/.mkv).

### outDir — string

Folder for the shot files. Defaults to a sibling folder named after the video (`reel.mp4` → `reel-shots/`).

### planOnly — boolean

Detect the cuts and report the shot table without writing any files.

### shots — array

Which shots to write, by the index the plan gives them (1-based). Omit to write all of them, up to the per-run cap.

### threshold — number

Cut sensitivity, 0-1. Higher = fewer cuts. Default 0.2. Raise it when a moving camera is being split into pieces; lower it when real cuts are being missed.

### copy — boolean

Stream-copy instead of re-encoding: much faster, but each shot starts at the previous keyframe and can carry the tail of the shot before it. Default false.

