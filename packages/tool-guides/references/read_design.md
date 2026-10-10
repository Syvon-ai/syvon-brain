# read_design

Read a .dsgn along with the brand context needed to render it: design tokens, text styles, animation config, and (optionally) the brand font cuts inlined as data URIs. Use instead of read_file whenever the design is going to be DISPLAYED rather than just inspected — without tokens and text styles a .dsgn renders in fallback colours and system fonts. This is a DISPLAY tool (its payload feeds the viewer); to read a design's slot copy AS DATA, call edit_design_slots without `slots`. Background media is inlined up to a byte budget (reported in `payloadBudget`, with anything left out named in `mediaOmitted`); pass `mediaInclude` to prioritise specific refs when that budget is tight.

## Parameters

### path — string (required)

Workspace-relative path to the .dsgn file.

### inlineFonts — boolean

Inline the brand fonts as data: URIs (default true). Set false when the surface already has the fonts loaded — it removes most of the payload size.

### mediaInclude — array

Media refs to inline FIRST (wins the byte budget) — use when a design has several backgrounds and the one that matters would otherwise be omitted. Refs are named in `mediaOmitted`.

