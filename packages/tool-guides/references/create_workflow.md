# create_workflow

Create a new workflow (Flow) from scratch: seeds its folder, registers it so the app can see it, and writes its entry graph. Use kind='agent' (default) for a director workflow that generates branded content from exemplars, or kind='utility' for a small input→generator→output pipeline. Returns the slug to pass to run_flow.

## Parameters

### name — string (required)

Display name, e.g. "Instagram Carousel".

### kind — string

'agent' (default): director workflow — system prompt + exemplars bound to a workflow-root. 'utility': a generator pipeline with no director furniture.

### slug — string

URL-safe slug. Defaults to a slugified name; uniquified on collision.

### description — string

Short description of what the workflow makes.

### icon — string

Material symbol name for the workflow card.

### systemPrompt — string

The director system prompt, written to system.md and mirrored into the graph's prompt block. agent kind only.

### suggestions — array

Chat starter chips shown to the user. agent kind only.

### editing — object

Per-flow generation DEFAULTS written to config.json#editing (merged over the built-in defaults; overridden per-request by the composer). agent kind only. Keys: medium ("still" = single-frame feed post | "motion" = reel/video, default motion); voiceEnabled (narrate at all — set false for a silent flow); musicEnabled (background music on/off); voiceCaption (subtitles on/off, default true); captionPosition ("auto"|"top"|"center"|"bottom" — "auto" places above a companion layer, else centered); captionStyle (block text-style id the subtitle is typeset in, e.g. "h3-label"|"paragraph-large"|"body-large"|"kicker"); pacing ("snappy"|"relaxed"|"default"); maxShots/minShots; transitionStyle ("cut"|"crossfade"). The voice IDENTITY (which voice) is brand-owned, not set here. Example silent Instagram feed post: { "medium": "still", "voiceEnabled": false, "musicEnabled": false }.

