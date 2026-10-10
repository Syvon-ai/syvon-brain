# generate_voice

COSTS MONEY — about $0.42 per 1,000 characters of text (Flash model $0.21). Quote the character count and dollar total and wait for the user's explicit yes in a later message before calling this, unless they have said cost does not matter. Generate speech audio from text using ElevenLabs text-to-speech (with-timestamps). Saves the audio (MP3) and a matching SRT subtitle file to the workspace. Requires ELEVENLABS_API_KEY. Optional: voiceId, modelId, stability, similarity_boost (0–1). Loudness-normalizes to -16 LUFS / -1.0 dBTP (mono spoken-word) by default via two-pass FFmpeg loudnorm — pass normalize:false to skip, or an object to override the target.

## Parameters

### text — string (required)

The text to convert to speech.

### path — string (required)

Workspace-relative path where the audio file will be saved (e.g. projects/my-project/narration.mp3). A .srt file with the same base name is also written.

### voiceId — string

ElevenLabs voice ID. If omitted, uses a default voice. Use GET /v1/voices to list available voices.

### modelId — string

Model ID (default: eleven_multilingual_v2).

### stability — number

Voice stability 0–1 (higher = more monotone).

### similarityBoost — number

Similarity to original voice 0–1.

### normalize — any

Loudness target for two-pass FFmpeg loudnorm, applied before the file is written. Default: { i: -16, tp: -1.0, lra: 7 } (mono spoken-word). Pass false to skip normalization entirely.

