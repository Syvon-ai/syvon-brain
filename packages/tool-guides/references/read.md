# read

Open a file from the workspace — the right reader is chosen from the file itself. A .dsgn comes back with its brand tokens, text styles and fonts; a .comp with its tracks and media; a .react with both the authored source and a compiled module; anything else as text, or base64 for binary. Use when you need to see what is in a file to answer, suggest changes, or verify state. For a sequence or format blueprint (addressed by NAME, not path) use read_sequence / read_format; for a file's sidecar use read_file_meta.

## Parameters

### path — string (required)

Workspace-relative path to the file.

### inlineFonts — boolean

.dsgn and .comp only. Inline the brand fonts as data URIs (default true).

### inlineMedia — boolean

.comp only. Inline referenced media.

### mediaInclude — array

.dsgn and .comp only. Restrict inlined media to these refs.

### deck — boolean

.comp only. Read it paced as a deck.

### duration — number

.react only. Seconds to play (default: sidecar, else 6).

