# compose_design

Compose a NEW design file (.dsgn) from a brief — structure only, with {slot} tokens where the words go. The layout is built element by element against FormatKit's own grammar, so the file always parses. Use when no existing template fits (check list_formats first); fill the slots afterwards with hydrate_format or edit_design_slots.

## Parameters

### brief — string (required)

What the piece is and what it must hold, in a sentence or two. Describe the CONTENT and its hierarchy ("a quote over a photograph, attribution underneath"), not the elements to use.

### path — string (required)

Where to write the .dsgn file, e.g. "projects/launch/quote-card.dsgn".

### width — number

Canvas width in px. Default 1080.

### height — number

Canvas height in px. Default 1350.

### maxNodes — number

Ceiling on elements placed. Default 14, max 24. Each element costs one model call.

