# read_react

Read a .react component: returns the RAW authored `source` AND a compiled ES module (`moduleSource`, host-wrapped so a sandboxed surface can import and play it). When WRITING a new component, read an existing one and copy its `source` — the props-object shape, the available globals (React, FormatKit primitives, resolveAssetUrl), canvas-vs-FormatKit choice — instead of guessing the convention. Also returns its props sidecar and declared duration.

## Parameters

### path — string (required)

Workspace-relative path to the .react file.

### duration — number

Seconds to play (default: sidecar value, else 6).

