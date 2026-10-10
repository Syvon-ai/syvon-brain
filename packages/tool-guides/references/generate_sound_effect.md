# generate_sound_effect

COSTS MONEY — about $0.004 per second (a 10s effect is $0.04). Quote the duration and price and wait for the user's explicit yes in a later message before calling this, unless they have said cost does not matter. Generate a sound effect from a text description using ElevenLabs Sound Generation. Saves an MP3 to the workspace and bills by the requested duration (0.5–30s). Describe the source, material, space, and envelope (e.g. "soft UI confirmation chime, glassy, short decay, no reverb tail"). Set loop:true for a seamlessly looping ambience. Loudness-normalizes to -16 LUFS by default — pass normalize:false to skip, or an object to override the target. To play the result, use show.

## Parameters

### prompt — string (required)

What the sound is: source, material, space, motion, and envelope (attack/decay).

### path — string (required)

Workspace-relative path where the audio file will be saved (e.g. projects/my-project/whoosh.mp3).

### durationSeconds — number

Effect length in seconds, 0.5–30 (default 10). This is the billed unit.

### loop — boolean

Generate a seamlessly looping sound (for ambiences and beds).

### trimSilence — any

Cut the silence off the HEAD of the file so the sound starts on its transient. Use it for any hit, whoosh or stinger that will sit on a beat: generated effects open with 80–400ms of room tone, and on a 100 BPM grid that is a third of a beat late. `true` uses a -40 dBFS threshold and keeps 10ms before the first sound; pass { thresholdDb, padMs } to tune (a noisy source wants -30). The seconds removed come back as `trimmedLeadSeconds`.

### normalize — any

Loudness target for two-pass FFmpeg loudnorm, applied before the file is written. Default: { i: -16, tp: -1.0, lra: 9 }. Pass false to skip normalization entirely.

