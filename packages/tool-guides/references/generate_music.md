# generate_music

COSTS MONEY — about $0.014 per second (the default 30s track is $0.42, 3 minutes is $2.52). Quote the duration and dollar price and wait for the user's explicit yes in a later message before calling this, unless they have said cost does not matter. Generate a music track from a text prompt using ElevenLabs Music. Saves an MP3 to the workspace and bills by the requested duration. Describe genre, mood, instrumentation, tempo, and role (e.g. "minimal ambient bed, warm analog pads, 70bpm, no percussion, sits under narration"). Loudness-normalizes to -20 LUFS (music-bed level, so it sits under a -16 LUFS voiceover) by default — pass normalize:false to skip, or an object to override the target. To play the result, use show.

## Parameters

### prompt — string (required)

What the music should sound like: genre, mood, instrumentation, tempo, energy arc, and what it accompanies.

### path — string (required)

Workspace-relative path where the audio file will be saved (e.g. projects/my-project/bed.mp3).

### durationSeconds — number

Track length in seconds, 10–300 (default 30). This is the billed unit.

### bpm — number

Tempo the track must hold, 20–300. Written into the prompt AND recorded in the file's sidecar, so the comp that uses this bed can set the same `tempo` and its beat grid lines up with the music. Match it to the comp's tempo (read_comp shows it) or to the brand's house tempo in config/animation.json; omit only for beat-less ambience.

### normalize — any

Loudness target for two-pass FFmpeg loudnorm, applied before the file is written. Default: { i: -20, tp: -1.0, lra: 11 } (music bed). Pass false to skip normalization entirely.

