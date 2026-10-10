# edit_sequence

Inspect or edit the shots of an existing .comp/.seq. Call it WITHOUT `operations` to list the shots — index, label, template, duration, start time and slot text, with embedded assets summarised rather than dumped. Call it WITH `operations` to remove, reorder, swap, duplicate, retime or toggle shots. ALWAYS use this instead of read_file or write_file on a composition: reading a .comp directly floods the conversation with base64 assets, and rewriting one corrupts them. Here the file is edited server-side, so embedded images, fonts and inline SVG are never retyped, and shot start times are recalculated for you. Address shots by 0-based index, negative index (-1 = last shot), or by id/label/source. Operations apply in order as a single atomic write. ANOTHER PAGE LIKE ONE THIS DECK ALREADY HAS is `add` with that page's own filename as the source, a second time — two pages, one design, edited once — then set_slot for the new one's words. Copying the .dsgn instead makes two layouts that drift apart silently. NOTE: a shot sourced from a .dsgn page is an INSTANCE of it: set_slot writes THIS page's words into the shot (the page's own copy, nobody else's), while edit_design_slots on the .dsgn changes the LAYOUT for every page that shares it — say which one you mean. `break` stops one page following a shared design: it copies the page, bakes in its words, and repoints the shot. `restyle` changes ONE page's LAYOUT while keeping its words — point it at another .dsgn of the same archetype (a root-relative "templates/<kit>/page.dsgn" needs no copy) and it reports what the new layout has no room for. The `slots` block in the inspect output is the shot's params/formatProps; for a .react shot these are the values passed to the component as props (they DO reach it), shown under `slots` for one consistent key.

## Parameters

### path — string (required)

Path to the .comp (or .seq) file, relative to the workspace root.

### operations — array

Edits to apply in order. OMIT this to inspect the composition without changing it.

### operations[].op — string (required)

add | remove | set_duration | move | swap | duplicate | set_transition | set_enabled | set_slot | set_param | break | restyle | set_tempo | set_start | set_trim | set_color_mode

### operations[].shot — any

Which shot: 0-based index, negative index (-1 = last), or id/label/source. Not used by `add`, which names a file instead.

### operations[].source — string

restyle: the .dsgn to restyle this page INTO — another layout of the SAME archetype. add: the file to put in the composition — a .dsgn page, a .react component, or a media file. Give it exactly as it sits beside the comp (e.g. "title.dsgn"); a bare name resolves against the folder the comp itself is in. A SHARED layout is linked root-relative ("templates/<kit>/cover.dsgn") — never copied in, never taken from another project folder. A page ALREADY in this deck is a valid source: naming it again adds a second page that draws the same design — that is how you make "another one of those", and the two stay in step because they share one layout. Give the new page its own words with set_slot. Copying the .dsgn instead makes two layouts that drift apart silently.

### operations[].at — number

add: where to insert (0 = first, negative counts from the end). Omit to append, which is what "add a page" almost always means.

### operations[].duration — number

set_duration: new length in seconds (must be > 0).

### operations[].to — number

move: destination index (negative counts from the end).

### operations[].with — any

swap: the other shot, addressed the same way as `shot`.

### operations[].slot — string

set_slot: which slot to change, e.g. "headline". Inspect first to see slot names.

### operations[].text — string

set_slot: the new copy for that slot.

### operations[].key — string

set_param: which declared parameter of a .react shot to set. Inspect the component (read_react) to see its declared props. A parameter typed "time" is a named beat, in seconds from the start of this shot — setting one retimes that moment for THIS shot only, leaving the component untouched.

### operations[].value — any

set_param: the new value. Coerced to the declared type, so "3.5" and 3.5 are both fine for a number or a time.

### operations[].enabled — boolean

set_enabled: false hides the shot without deleting it.

### operations[].colorMode — any

set_color_mode: one of the brand's colour modes — the `modes` its design-tokens.json declares (e.g. "light") — or "default" for the base palette, or null to clear. With `shot`, that shot only; without, the whole composition (every shot that names none). A page's own <FormatCanvas colorMode> still wins over both.

### operations[].transition — object

set_transition: e.g. { "type": "fade", "duration": 0.4 }. Omit to clear.

### operations[].tempo — object

set_tempo: { bpm, offset?, beatsPerBar? } — the comp's musical grid. Match `bpm` to the music bed (generate_music records it in the file's sidecar) or the brand's house tempo. `offset` = the second beat 0 falls on. Pass null to remove the grid. Every .react shot then receives `bpm` / `beatZero` / `beatsPerBar` as props.

### operations[].atBeat — number

set_start / add (audio & overlay tracks): the beat of the tempo grid to start on. Beat 0 is the first downbeat; fractional beats are fine (2.5 = the "and" of 2). Needs a `tempo` on the comp. Wins over `startTime` when both are given.

### operations[].startTime — number

set_start / add (audio & overlay tracks): start in seconds on the timeline.

### operations[].inPoint — number

set_trim: seconds into the SOURCE file where the clip starts. Omit to leave unchanged.

### operations[].outPoint — number

set_trim: seconds into the SOURCE file where the clip ends. Omit to leave unchanged.

### operations[].auto — boolean

set_trim: measure the media's leading silence with FFmpeg and write it as `inPoint`, so the sound starts on its transient — the fix for a hit that lands late on its beat.

### operations[].thresholdDb — number

set_trim auto: silence threshold in dBFS (default -40; -30 for a noisy source).

### track — string

Sequence mode only: which track to edit. Defaults to the video/content track.

### ifVersion — object

Guarded write: the file version you HOLD (the `version` from the inspect or read that showed you this comp). When the file has changed since — another session, Studio, a push — the edit is REFUSED with VERSION_CONFLICT and the current version, rather than silently overwriting someone's work. Omit to write unconditionally.

## The listing labels every page

Called with no `operations`, it lists the composition one page per line, labelled
by what the page SAYS rather than by its layout file:

```
[0] cover — "Spring drop" · hook-4x5
[2] stat — "3× faster setup" · explain-4x5
[3] quote — "Taste is the last moat." — Renaud Futterer · close-4x5
[4] photo — "Built to last." · picture: a black shipping container · proof-4x5
```

Those labels are what a person means by "the stat page" or "the quote page".
Match a request on them, never on the template filename.
