# read_comp

Load a .comp so it can be PLAYED — the composition plus every design, component, brand token, font cut and media file it needs, in one payload. Use this when the user wants to WATCH a composition (a video, a deck, a story) rather than edit its shots; use edit_sequence to change shot text, timing or order. Components are compiled ready to run. Media is lazy-loaded by default (it is streamed into the viewer, not inlined) — the result reports the byte budget in `payloadBudget` and names what was left out in `mediaOmitted`; pass `mediaInclude` (a list of refs from those) to force specific assets inline up front.

## Parameters

### path — string (required)

Workspace-relative path to the .comp file.

### inlineFonts — boolean

Inline the brand fonts as data URIs (default true).

### inlineMedia — boolean

Inline images/video/audio as data URIs (default true). False keeps the payload small but any media shot will be blank.

### deck — boolean

Override how the player opens. DECK mode is paced — one slide at a time with a hold on each; the alternative plays straight through as motion. LEAVE UNSET normally: the player already picks the right mode from the comp itself (a slide deck / stills set opens paced, a motion comp autoplays). Pass true to force paced ("step through this video"), or false to force straight-through playback of a deck.

### mediaInclude — array

Refs (as named in `mediaOmitted`) to inline up front instead of lazy-loading — for a preview that must be truthful for the slides that matter. Best-effort: a ref that does not fit under the payload budget is still omitted (and streamed) rather than dropping the whole result.

