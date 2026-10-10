# update_generation_settings

Change a Flow's generation DEFAULTS — workflows/{slug}/config.json#editing (tier 2). Pass only the fields you want to change; they are merged into the existing block and everything else is preserved. Pass `null` for a field to CLEAR it, so it falls back to the built-in default. These are the defaults a generation resolves against; a single run can still override them via the per-request settings on workspace_generate. Pass `exposure` to change WHICH per-generation knobs the Flow offers at all (config.json#settings) — `user` (the user picks), `fixed` (the Flow's own standard, shown but not editable), `off` (the Flow does not have it: hidden in the composer AND forced off in every generation). Pass `exposure: null` to clear the block, so exposure is derived from `editing` again. Read get_generation_settings first. Values are validated against their domain and an invalid one is REJECTED, not written — an out-of-domain value would otherwise be copied straight into the resolved plan. In a local checkout, run `ws push` afterwards for it to reach the cloud.

## Parameters

### workflowSlug — string

Flow to change. Defaults to the Flow in scope; use list_flows to find one.

### medium — string

Output medium. 'still' = a single-frame feed post; 'motion' = a rendered reel/video. THE hard still-vs-video fork.

### compositionType — string

What the generated composition IS, written to the comp's `compositionType`. Absent keeps 'social'. This is the axis the canvas reads to decide a comp is a deck — it is NOT `mode`, which stays 'sequence'.

### materializeDesigns — boolean

Copy referenced designs INTO the generated project and name them by basename, so the canvas can resolve them — it matches a page by bare filename against the project's own files. Off by default: a referenced design is LIVE (editing it updates every comp built from it) while a copy is a snapshot.

### unfilledAssetSlots — array

Asset slot names the director must leave EMPTY, for frames a later agent step fills per shot (e.g. a storyboard's `shot_image`). Every other declared slot is filled from the brand media pool, which never declines — so without this a reserved slot gets a random brand photograph. An unfilled slot renders as a labelled placeholder box.

### exemplarOrder — string

'fixed' presents exemplars in their given order, unshuffled and capped at 12 instead of 6 — the setting for a flow whose exemplars are a sequence. 'shuffled' is the default sampling.

### pacing — string

Cut rhythm.

### minShots — number

Lower bound on the shots the director may plan. (1-60)

### maxShots — number

Upper bound on the shots the director may plan. (1-60)

### transitionStyle — string

Shot transition.

### minShotDurationSec — number

Floor on any single shot. Also the spacing anchor-aligned shot starts are pushed apart by. (0.1-30)

### maxShotDurationSec — number

Hard cap on any single shot — the "long shot" dial. Unset = uncapped. Never applied to a per-sentence shot, which would slide it off the voiceover. (0.5-120)

### fallbackShotDurationSec — number

Shot length used when there is no voiceover to time against. (0.5-60)

### tailHoldSec — number

Extra time held on the LAST shot after the voiceover ends, so the piece does not cut on the final word. (0-10)

### voiceCaption — boolean

Subtitle overlay on/off. Needs a voiceover to caption.

### captionPosition — string

Caption placement. 'auto' places above a companion layer, else centered.

### captionStyle — string

Brand block text-style id the subtitle is typeset in (e.g. "h3-label", "paragraph-large", "body-large", "kicker").

### voiceEnabled — boolean

Narrate at all. false = a silent flow (no TTS, and therefore no captions). The voice IDENTITY stays brand-owned.

### musicEnabled — boolean

Background music on/off for this flow.

### motion — boolean

Master switch for the motion treatment. false forces legacy behaviour (no burst, no per-shot anim override) regardless of the knobs below.

### perShotAnimOverride — boolean

Cycle animation presets onto each shot via dsgnOverrides, so one .dsgn animates differently per shot without duplicate exemplars.

### textAnimCycle — array

Animation preset keys (must exist in the brand animation.json) cycled across shots and applied to TEXT nodes.

### mediaAnimCycle — array

Animation preset keys cycled across shots and applied to the MEDIA (Asset) node.

### animOnlyDsgn — array

Restrict the anim cycles to shots whose exemplar name contains one of these (substring match). Empty = every shot.

### mediaBurst — boolean

Let a shot be a media BURST — the director picks a project and a count, and that shot's window is subdivided into fast cuts of its media.

### mediaBurstMin — number

Fewest fast cuts inside one media burst. (1-40)

### mediaBurstMax — number

Most fast cuts inside one media burst. (1-40)

### mediaPick — boolean

The director names WHAT each shot shows (a project slug or phrase, matched against the scoped pool) instead of positional auto-assign.

### exposure — any

Which per-generation knobs this Flow offers. Keys: format, voice, captions, music, pacing — each `{mode: "user"|"fixed"|"off"}`. `format` also takes `options` (subset of 16:9, 9:16, 1:1, 4:5) and `quality: "hd"`; `captions` also takes `styles` (brand text-style ids). Replaces the whole block; `null` clears it. Note format/pacing have no "off" — a generation always has a size and a rhythm — so "off" is stored as "fixed" for those two.

