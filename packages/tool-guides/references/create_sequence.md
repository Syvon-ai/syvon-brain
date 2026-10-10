# create_sequence

Create a .comp file (composition, seq/v2 format). THIS IS THE STEP BEFORE RENDERING A COMPONENT: a .react component or a .dsgn design has no timing of its own, so render_video cannot turn one into a file directly — wrap it in a .comp here first (an item with its templatePath + templateType + duration), then render the .comp. .seq is accepted as a backward-compat alias. In sequence mode (default): takes items with inline shot data, creates a timeline. In deck mode: takes sources (list of .dsgn paths) and creates a slide deck for video export. In document mode: takes sources (list of .dsgn paths) and creates a multi-page document for PDF export. Set `compositionType` (motion | social | decks | print | interactive) to declare authorial discipline; when omitted but `mode` is set, no compositionType is written. When set without `mode`, mode is derived. LINK SHARED LAYOUTS, DO NOT COPY THEM: a templatePath/source may point root-relative at a page in this workspace's library — "templates/listing-kit/cover.dsgn", "assets/react/beat.react" — from a comp in any project folder. The page stays shared (a fix to it reaches every comp), and each shot carries its own words and photos in `params` (or set later with edit_sequence set_slot). Copy a page into the project only when THAT page is going to be edited for this one project. A layout in ANOTHER project folder is refused — shared layouts live in templates/. To REBUILD an existing .comp in place, call this again on the same outputPath with `replace: true`.

## Parameters

### outputPath — string (required)

Path for the output .comp file (e.g. projects/my-reel/my-reel.comp). .seq is accepted as a backward-compat alias. Must be inside a named project folder.

### mode — string

Playback container mode. Default: derived from compositionType, else sequence.

### compositionType — string

Authorial discipline of the composition. Optional but recommended — picks the right playbook in the design skill.

### items — array

Ordered list of inline item data (sequence mode only).

### items[].templatePath — string

Path to .dsgn template.

### items[].templateType — string

Optional — AUTO-DERIVED from the file extension (.react → react-component, .dsgn → design, .mp4 → video, .png → still, .riv → rive, .lottie → lottie). Do not set it; a wrong value is ignored in favour of the extension. Only used for an extensionless ref.

### items[].params — object

Template params.

### items[].duration — number

Duration in seconds.

### items[].format — string

Format name (if from hydrate_format).

### items[].formatProps — object

Format slot values.

### sources — array

Ordered list of .dsgn paths (deck or document mode).

### audio — array

Audio laid under the sequence. Each entry is { path, startTime?, atBeat?, duration?, inPoint?, outPoint?, volume?, gainDb?, fadeInMs?, fadeOutMs? } — `path` workspace-relative, `startTime`/`duration` in SECONDS on the timeline. `atBeat` (needs `tempo`) places the clip on that beat of the grid instead of a second — beat 0 is the first downbeat, 4 is the second bar; how a hit lands on the music. `inPoint`/`outPoint` trim the SOURCE (seconds into the file): set `inPoint` to a sound effect's leading silence so the hit itself sits on the beat. A VIDEO file is a valid path: the renderer takes its audio stream, which is how a sequence of generated clips keeps the sound those clips were generated with (it is never picked up from the video track — see the audio note in the sequence renderer).

### fps — number

Sequence/deck fps. Default 30.

### tempo — object

The composition's musical grid: { bpm, offset?, beatsPerBar? }. Drawn as a beat grid in the editor, snapped to, and passed to every .react shot as `bpm` / `beatZero` / `beatsPerBar` props. Match `bpm` to the music bed (generate_music records it) or to the brand's house tempo in config/animation.json; 100 is the house default. `offset` is the second beat 0 falls on (a bed with a lead-in). Omit for a deck or anything without a pulse.

### colorMode — string

Which of the brand's colour modes the composition paints in — one of the `modes` its design-tokens.json declares (e.g. 'light'). Omit for the base palette. Set a single shot's mode afterwards with edit_sequence set_color_mode; a page's own <FormatCanvas colorMode> wins.

### resolution — object

Resolution. Default { width: 1920, height: 1080 }.

### defaultShotDuration — number

Duration in seconds for each item/slide. Default 3.

### defaultDuration — number

Alias for defaultShotDuration (deck/document mode).

### brand — string

Optional: the brand the composition wears — `slug` for a sub-brand under brands/, or `workspace.brand`. Written as the comp's `"brand"`, which is what dresses every render; omit for the workspace's own brand.

### replace — boolean

Rebuild an EXISTING .comp at outputPath in place. Default false — an existing file is refused, so a mistyped path never wipes a composition. Set true to regenerate one deliberately (a re-run build, a rebuilt listing): the path stays and nothing is duplicated into a new folder. Shot words set with edit_sequence since the last build are replaced by what you pass here.

### allowMissingRefs — boolean

Write the .comp even when a shot points at a design that does not exist yet. Default false — the write is REFUSED, because a ref that does not land bakes a "Design content HTTP 404" card into every frame without anything logging a failure. Set true ONLY when the designs are generated in a later step of the same run; the comp is then unrenderable until they land.

