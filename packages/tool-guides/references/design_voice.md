# design_voice

COSTS MONEY (action "preview") — billed like text-to-speech on the sample text: about $0.42 per 1,000 characters, so $0.04–$0.42 per call (100–1,000 characters; an auto-written sample is a few hundred, quote up to $0.42). One call returns up to 3 previews. Quote it and wait for the user's explicit yes in a later message before calling preview, unless they have said cost does not matter; never re-roll previews on your own. Action "save" costs nothing but adds a custom voice to the ElevenLabs account (the account's voice-slot limit applies). Create a NEW voice from a text description with ElevenLabs Voice Design — e.g. a character's voice. "preview": writes each audition as an MP3 (default assets/voices/{name}-preview-N.mp3) and returns its generatedVoiceId and duration; play them with show. "save": keeps the chosen preview and returns the permanent voiceId, which is then generate_voice's voiceId. Describe age, gender, accent, timbre, pace, energy and character (e.g. "young woman, soft Tokyo-accented English, warm and playful, slightly breathy, quick pace").

## Parameters

### action — string (required)

"preview" generates auditions (paid); "save" keeps one and returns its permanent voiceId (free).

### description — string (required)

The voice, in words: age, gender, accent, timbre, pace, energy, character (max 1,000 characters). Required for both actions; on save pass the description the preview was made from.

### text — string

preview: the line the previews speak, 100–1,000 characters — the billed unit. Write it in the character's own voice. Omit to have ElevenLabs write a sample line.

### name — string

preview: optional label for the file names. save: required — the voice's name in the ElevenLabs library.

### path — string

preview: optional workspace-relative base — a file (projects/x/voices/hero.mp3 → hero-preview-1.mp3 …) or a folder. Default assets/voices/.

### generatedVoiceId — string

save: the generatedVoiceId of the preview to keep, as returned by action "preview". Preview ids are temporary.

